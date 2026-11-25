/**
 * nux-camera-recognize — 拍照识别（图片 → 大模型）
 *
 * 一个组件覆盖完整链路：调起相机取景拍摄（getUserMedia，自动降级为系统相机）/
 * 相册选图 → 预览确认 → 上传识别（阶段过程态、可取消）→ 结果展示（Markdown 或结构化）。
 * 默认对接 nexus-backend 的 `create_vision_router()` 端点（POST {uploadUrl}，
 * multipart: files + prompt[+ system/json_mode]，返回 {code,data:{content|result,model}}）；
 * 业务私有接口传 `handler` 自定义。单图识别，组件不落盘、不持久化。
 *
 * 支撑层：NexusCameraHelpers（纯管线）+ NuxCameraRecognizeTemplate（模板串），均随 nexus-all.js 分发；
 * 样式在 css/nexus-camera-recognize.css。
 * 依赖：Vue 3 全局；可选 NexusApi（token 注入）、NexusMarkdown、NexusUtils、showToast。
 * 用法：
 *   <nux-camera-recognize upload-url="/api/vision/recognize"
 *     prompt="识别图片中的物品并列出名称" @success="onOk"></nux-camera-recognize>
 */
(function () {
    if (window.NuxCameraRecognize) return;
    if (!window.Vue) return;

    var H = window.NexusCameraHelpers || {};

    var NuxCameraRecognize = {
        name: 'NuxCameraRecognize',
        props: {
            uploadUrl: { type: String, default: '' },
            apiInstance: { type: Object, default: null },
            handler: { type: Function, default: null },
            prompt: { type: String, default: '识别这张图片的内容' },
            system: { type: String, default: '' },
            jsonMode: { type: Boolean, default: false },
            stages: { type: Array, default: function () { return (H.DEFAULT_STAGES || []).slice(); } },
            allowCamera: { type: Boolean, default: true },
            allowGallery: { type: Boolean, default: true },
            autoRecognize: { type: Boolean, default: true },
            maxSizeMb: { type: Number, default: 10 },
            maxEdge: { type: Number, default: 1600 },
            title: { type: String, default: '' },
            hint: { type: String, default: '' },
            recognizeText: { type: String, default: '开始识别' },
            compact: { type: Boolean, default: false }
        },
        emits: ['capture', 'change', 'start', 'success', 'error', 'cancel', 'reset'],
        setup: function (props, ctx) {
            var ref = Vue.ref;
            var computed = Vue.computed;
            var onBeforeUnmount = Vue.onBeforeUnmount;

            var state = ref('idle'); // idle | camera | preview | recognizing | done | error
            var imageBlob = ref(null);
            var previewUrl = ref('');
            var result = ref(null);   // { kind:'text'|'json', text, data, model }
            var errorMsg = ref('');
            var stageIndex = ref(0);
            var busyMsg = ref('');
            var flashing = ref(false);
            var cameraTip = ref('');
            var facing = ref('environment');
            var cameraBusy = ref(false);

            var videoEl = ref(null);
            var inputEl = ref(null);
            var inputCapture = ref(false);
            var recognizeBtnEl = ref(null);

            var stream = null;
            var controller = null;
            var objectUrl = '';

            var canUseCamera = computed(function () {
                return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
            });

            var stages = computed(function () {
                return (props.stages && props.stages.length ? props.stages : (H.DEFAULT_STAGES || [])).map(function (s, i) {
                    return typeof s === 'string' ? { key: 's' + i, label: s } : s;
                });
            });

            function setPreview(blob) {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                imageBlob.value = blob;
                objectUrl = URL.createObjectURL(blob);
                previewUrl.value = objectUrl;
                ctx.emit('change', blob);
            }

            function clearPreview() {
                if (objectUrl) URL.revokeObjectURL(objectUrl);
                objectUrl = '';
                imageBlob.value = null;
                previewUrl.value = '';
            }

            function stopStream() {
                if (stream) {
                    stream.getTracks().forEach(function (t) { t.stop(); });
                    stream = null;
                }
            }

            async function openCamera() {
                if (!props.allowCamera || cameraBusy.value) return;
                if (!canUseCamera.value) {
                    inputCapture.value = true;
                    if (inputEl.value) inputEl.value.click();
                    return;
                }
                cameraBusy.value = true;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: { ideal: facing.value } },
                        audio: false
                    });
                    state.value = 'camera';
                    cameraTip.value = facing.value === 'environment' ? '对准要识别的内容' : '前置拍摄';
                    Vue.nextTick(function () {
                        if (videoEl.value) {
                            videoEl.value.srcObject = stream;
                            videoEl.value.play().catch(function () {});
                        }
                    });
                } catch (err) {
                    stopStream();
                    H.toast(formatError(err), 'error');
                    inputCapture.value = true;
                    if (inputEl.value) inputEl.value.click();
                } finally {
                    cameraBusy.value = false;
                }
            }

            function closeCamera() {
                stopStream();
                if (state.value === 'camera') {
                    state.value = imageBlob.value ? 'preview' : 'idle';
                }
            }

            async function flipCamera() {
                facing.value = facing.value === 'environment' ? 'user' : 'environment';
                stopStream();
                await openCamera();
            }

            function capture() {
                var video = videoEl.value;
                if (!video || !video.videoWidth) return;
                H.captureFrame(video, facing.value, props.maxEdge).then(function (blob) {
                    if (!blob) { H.toast('拍摄失败，请重试', 'error'); return; }
                    takeBlob(blob, true);
                });
                stopStream();
                if (navigator.vibrate) { try { navigator.vibrate(20); } catch (e) {} }
                flashing.value = true;
                setTimeout(function () { flashing.value = false; }, 180);
            }

            function pick() {
                inputCapture.value = false;
                if (inputEl.value) inputEl.value.click();
            }

            function takeBlob(blob, fromCamera) {
                setPreview(blob);
                if (fromCamera) ctx.emit('capture', blob);
                if (props.autoRecognize) {
                    Vue.nextTick(function () { recognize(); });
                } else {
                    state.value = 'preview';
                    Vue.nextTick(function () { if (recognizeBtnEl.value) recognizeBtnEl.value.focus(); });
                }
            }

            function onPick(event) {
                var file = event.target.files && event.target.files[0];
                event.target.value = '';
                if (!file) return;
                var invalid = H.validateImageFile(file, props.maxSizeMb);
                if (invalid) { H.toast(invalid, 'error'); return; }
                H.prepareFile(file, props.maxEdge).then(takeBlob);
            }

            var busyPairs = H.BUSY_PAIRS || [];

            async function recognize() {
                if (!imageBlob.value || state.value === 'recognizing') return;
                if (!props.handler && !props.uploadUrl) {
                    errorMsg.value = '未配置 uploadUrl 或 handler，无法识别';
                    state.value = 'error';
                    return;
                }
                controller = new AbortController();
                state.value = 'recognizing';
                errorMsg.value = '';
                result.value = null;
                stageIndex.value = 0;
                busyMsg.value = busyPairs[0] ? busyPairs[0][1] : '';
                ctx.emit('start', imageBlob.value);
                var timers = [
                    setTimeout(function () { stageIndex.value = 1; busyMsg.value = busyPairs[1] ? busyPairs[1][1] : ''; }, 700),
                    setTimeout(function () { stageIndex.value = 2; busyMsg.value = busyPairs[2] ? busyPairs[2][1] : ''; }, 6000)
                ];
                try {
                    var payload;
                    if (props.handler) {
                        payload = await props.handler(imageBlob.value, {
                            prompt: props.prompt, system: props.system,
                            jsonMode: props.jsonMode, signal: controller.signal
                        });
                    } else {
                        var api = props.apiInstance || (window.NexusApi ? new NexusApi() : null);
                        if (!api) throw new Error('NexusApi 未加载');
                        var form = new FormData();
                        form.append('files', imageBlob.value, 'photo.jpg');
                        form.append('prompt', props.prompt);
                        if (props.system) form.append('system', props.system);
                        if (props.jsonMode) form.append('json_mode', 'true');
                        var res = await api.upload(props.uploadUrl, form, { signal: controller.signal });
                        var data = res && res.code === 200 && res.data ? res.data : (res || {});
                        payload = data.result !== undefined ? data.result : (data.content !== undefined ? data.content : data);
                    }
                    timers.forEach(clearTimeout);
                    result.value = H.normalizeResult(payload);
                    state.value = 'done';
                    ctx.emit('success', payload, result.value);
                } catch (err) {
                    timers.forEach(clearTimeout);
                    if (err && err.name === 'AbortError') {
                        state.value = imageBlob.value ? 'preview' : 'idle';
                        ctx.emit('cancel');
                        return;
                    }
                    errorMsg.value = formatError(err);
                    state.value = 'error';
                    ctx.emit('error', err, errorMsg.value);
                } finally {
                    controller = null;
                }
            }

            var kvEntries = computed(function () {
                return H.kvEntriesOf(result.value);
            });

            function copyResult() {
                if (!result.value) return;
                var text = H.resultTextOf(result.value);
                if (window.NexusUtils && NexusUtils.copyText) { NexusUtils.copyText(text, { success: '已复制' }); return; }
                navigator.clipboard.writeText(text).then(function () { H.toast('已复制', 'success'); }).catch(function () {});
            }

            function retake() {
                clearResult();
                if (props.allowCamera && canUseCamera.value) openCamera();
                else pick();
            }

            function clearResult() {
                result.value = null;
                errorMsg.value = '';
                ctx.emit('reset');
            }

            function reset() {
                cancelRecognize();
                stopStream();
                clearResult();
                clearPreview();
                state.value = 'idle';
            }

            function cancelRecognize() {
                if (controller) {
                    try { controller.abort(); } catch (e) {}
                }
            }

            function formatError(err) {
                return H.formatError ? H.formatError(err) : '识别失败，请重试';
            }

            function renderMarkdown(text) {
                return H.renderMarkdown ? H.renderMarkdown(text) : String(text || '');
            }

            function onKeydown(event) {
                if (event.key === 'Escape' && state.value === 'camera') closeCamera();
            }

            function onVisibility() {
                if (document.hidden) closeCamera();
            }

            document.addEventListener('visibilitychange', onVisibility);
            document.addEventListener('keydown', onKeydown);
            onBeforeUnmount(function () {
                document.removeEventListener('visibilitychange', onVisibility);
                document.removeEventListener('keydown', onKeydown);
                reset();
            });

            ctx.expose({
                openCamera: openCamera,
                closeCamera: closeCamera,
                pick: pick,
                recognize: recognize,
                cancelRecognize: cancelRecognize,
                reset: reset
            });

            return {
                state: state, previewUrl: previewUrl, result: result, errorMsg: errorMsg,
                stageIndex: stageIndex, stages: stages, busyMsg: busyMsg, kvEntries: kvEntries,
                flashing: flashing, cameraTip: cameraTip, canUseCamera: canUseCamera,
                videoEl: videoEl, inputEl: inputEl, inputCapture: inputCapture, recognizeBtnEl: recognizeBtnEl,
                openCamera: openCamera, closeCamera: closeCamera, flipCamera: flipCamera,
                capture: capture, pick: pick, onPick: onPick, recognize: recognize,
                cancelRecognize: cancelRecognize,
                copyResult: copyResult, retake: retake, reset: reset, renderMarkdown: renderMarkdown
            };
        },
        template: window.NuxCameraRecognizeTemplate || ''
    };

    window.NuxCameraRecognize = NuxCameraRecognize;
})();
