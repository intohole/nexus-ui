/**
 * nux-camera-recognize — 拍照识别（图片 → 大模型）
 *
 * 一个组件覆盖完整链路：调起相机取景拍摄（getUserMedia，自动降级为系统相机）/
 * 相册选图 → 预览确认 → 上传识别（阶段过程态、可取消）→ 结果展示（Markdown 或结构化）。
 * 默认对接 nexus-backend 的 `create_vision_router()` 端点（POST {uploadUrl}，
 * multipart: files + prompt[+ system/json_mode]，返回 {code,data:{content|result,model}}）；
 * 业务私有接口传 `handler` 自定义。单图识别，组件不落盘、不持久化。
 *
 * 依赖：Vue 3 全局；可选 NexusApi（token 注入）、NexusMarkdown、NexusUtils、showToast。
 * 用法：
 *   <nux-camera-recognize upload-url="/api/vision/recognize"
 *     prompt="识别图片中的物品并列出名称" @success="onOk"></nux-camera-recognize>
 */
(function () {
    if (window.NuxCameraRecognize) return;
    if (!window.Vue) return;

    var STYLE_ID = 'nux-camera-recognize-style';
    function ensureStyle() {
        window.NexusUtils && NexusUtils.injectStyle(STYLE_ID, [
            '.ncr{display:flex;flex-direction:column;gap:var(--nx-space-3,12px);font-size:var(--nx-text-base,15px)}',
            '.ncr-label{font-size:var(--nx-text-sm,14px);font-weight:600;color:var(--nx-text-heading,#0f172a)}',
            '.ncr-frame{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--nx-space-3,12px);min-height:180px;padding:var(--nx-space-6,24px);border:1px dashed var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-lg,16px);background:var(--nx-glass-bg,rgba(255,255,255,.7));text-align:center}',
            '.ncr-glyph{width:44px;height:44px;border-radius:var(--nx-radius-full,9999px);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--nx-text-muted,#94a3b8);background:var(--nx-bg-muted,#f1f5f9)}',
            '.ncr-entry-actions{display:flex;gap:var(--nx-space-3,12px);flex-wrap:wrap;justify-content:center}',
            '.ncr-hint{margin:0;font-size:var(--nx-text-xs,12px);color:var(--nx-text-muted,#94a3b8);max-width:36em}',

            '.ncr-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:0 var(--nx-space-5,20px);border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-md,10px);background:var(--nx-bg-surface,#fff);color:var(--nx-text-body,#334155);font-size:var(--nx-text-sm,14px);font-weight:500;cursor:pointer;transition:border-color var(--nx-transition-fast,150ms ease),background var(--nx-transition-fast,150ms ease),transform var(--nx-transition-fast,150ms ease)}',
            '.ncr-btn:hover{border-color:var(--nx-border-hover,rgba(0,0,0,.15));background:var(--nx-bg-hover,#f1f5f9)}',
            '.ncr-btn:active{transform:scale(.98)}',
            '.ncr-btn--primary{border-color:transparent;background:var(--app-accent,#6366f1);color:var(--nx-text-on-accent,#fff)}',
            '.ncr-btn--primary:hover{background:var(--app-accent-hover,#818cf8)}',
            '.ncr-btn:disabled{opacity:.55;cursor:default;transform:none}',
            '.ncr-btn:focus-visible,.ncr-iconbtn:focus-visible,.ncr-shutter:focus-visible{outline:2px solid var(--app-accent,#6366f1);outline-offset:2px}',

            '.ncr-camera{position:relative;border-radius:var(--nx-radius-lg,16px);overflow:hidden;background:#0b0f1a;aspect-ratio:4/3;max-height:70vh}',
            '.ncr-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}',
            '.ncr-camera-top{position:absolute;top:0;left:0;right:0;display:flex;align-items:center;justify-content:space-between;gap:var(--nx-space-3,12px);padding:var(--nx-space-3,12px);background:linear-gradient(rgba(0,0,0,.45),transparent)}',
            '.ncr-camera-tip{font-size:var(--nx-text-xs,12px);color:rgba(255,255,255,.85)}',
            '.ncr-camera-bar{position:absolute;bottom:0;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:var(--nx-space-6,24px);padding:var(--nx-space-4,16px);background:linear-gradient(transparent,rgba(0,0,0,.55))}',
            '.ncr-iconbtn{width:40px;height:40px;border:none;border-radius:var(--nx-radius-full,9999px);background:rgba(0,0,0,.35);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background var(--nx-transition-fast,150ms ease)}',
            '.ncr-iconbtn:hover{background:rgba(0,0,0,.55)}',
            '.ncr-shutter{width:64px;height:64px;border-radius:50%;border:4px solid rgba(255,255,255,.9);background:rgba(255,255,255,.28);cursor:pointer;padding:0;transition:transform var(--nx-transition-fast,150ms ease),background var(--nx-transition-fast,150ms ease)}',
            '.ncr-shutter:hover{background:rgba(255,255,255,.45)}',
            '.ncr-shutter:active{transform:scale(.9)}',
            '.ncr-shutter:disabled{opacity:.5;transform:none;cursor:default}',
            '.ncr-flash{position:absolute;inset:0;background:#fff;opacity:.85;pointer-events:none;animation:ncr-flash 160ms ease-out forwards}',
            '@keyframes ncr-flash{to{opacity:0}}',

            '.ncr-reticle{position:absolute;inset:18%;pointer-events:none}',
            '.ncr-reticle i{position:absolute;width:22px;height:22px;border:2px solid rgba(255,255,255,.55)}',
            '.ncr-reticle i:nth-child(1){top:0;left:0;border-right:none;border-bottom:none;border-top-left-radius:8px}',
            '.ncr-reticle i:nth-child(2){top:0;right:0;border-left:none;border-bottom:none;border-top-right-radius:8px}',
            '.ncr-reticle i:nth-child(3){bottom:0;left:0;border-right:none;border-top:none;border-bottom-left-radius:8px}',
            '.ncr-reticle i:nth-child(4){bottom:0;right:0;border-left:none;border-top:none;border-bottom-right-radius:8px}',

            '.ncr-preview{display:flex;flex-direction:column;gap:var(--nx-space-3,12px)}',
            '.ncr-shot{width:100%;max-height:320px;object-fit:contain;border-radius:var(--nx-radius-md,10px);background:var(--nx-bg-muted,#f1f5f9)}',
            '.ncr-preview-actions{display:flex;gap:var(--nx-space-3,12px);justify-content:flex-end;flex-wrap:wrap}',

            '.ncr-busy{display:flex;align-items:center;gap:var(--nx-space-4,16px);padding:var(--nx-space-4,16px);border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-lg,16px);background:var(--nx-glass-bg,rgba(255,255,255,.7));backdrop-filter:blur(var(--nx-glass-blur,16px));-webkit-backdrop-filter:blur(var(--nx-glass-blur,16px))}',
            '.ncr-busy-thumb{position:relative;width:72px;height:72px;flex-shrink:0;border-radius:var(--nx-radius-md,10px);overflow:hidden;background:var(--nx-bg-muted,#f1f5f9)}',
            '.ncr-busy-thumb img{width:100%;height:100%;object-fit:cover;opacity:.55}',
            '.ncr-scan{position:absolute;left:0;right:0;height:2px;background:var(--app-accent,#6366f1);box-shadow:0 0 12px rgba(var(--app-accent-rgb,99,102,241),.8);animation:ncr-scan 1.6s ease-in-out infinite alternate}',
            '@keyframes ncr-scan{from{top:6%}to{top:92%}}',
            '.ncr-busy-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:var(--nx-space-2,8px)}',
            '.ncr-stages{display:flex;gap:var(--nx-space-4,16px);flex-wrap:wrap}',
            '.ncr-stage{display:flex;align-items:center;gap:6px;font-size:var(--nx-text-xs,12px);color:var(--nx-text-muted,#94a3b8)}',
            '.ncr-stage-dot{width:7px;height:7px;border-radius:50%;background:var(--nx-text-muted,#94a3b8);opacity:.4}',
            '.ncr-stage--done .ncr-stage-dot{background:var(--nx-success,#10b981);opacity:1}',
            '.ncr-stage--active{color:var(--nx-text-body,#334155);font-weight:500}',
            '.ncr-stage--active .ncr-stage-dot{background:var(--app-accent,#6366f1);opacity:1;animation:ncr-pulse 1.2s ease-in-out infinite}',
            '@keyframes ncr-pulse{50%{box-shadow:0 0 0 4px rgba(var(--app-accent-rgb,99,102,241),.18)}}',
            '.ncr-busy-bar{height:4px;border-radius:var(--nx-radius-full,9999px);background:var(--nx-bg-muted,#f1f5f9);overflow:hidden}',
            '.ncr-busy-bar i{display:block;height:100%;width:36%;border-radius:inherit;background:var(--app-accent,#6366f1);animation:ncr-indeterminate 1.4s ease-in-out infinite}',
            '@keyframes ncr-indeterminate{0%{transform:translateX(-110%)}100%{transform:translateX(300%)}}',
            '.ncr-busy-foot{display:flex;align-items:center;justify-content:space-between;gap:var(--nx-space-3,12px)}',
            '.ncr-busy-msg{font-size:var(--nx-text-xs,12px);color:var(--nx-text-secondary,#64748b)}',

            '.ncr-result{display:flex;flex-direction:column;gap:var(--nx-space-3,12px);padding:var(--nx-space-4,16px);border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-lg,16px);background:var(--nx-glass-bg,rgba(255,255,255,.7));backdrop-filter:blur(var(--nx-glass-blur,16px));-webkit-backdrop-filter:blur(var(--nx-glass-blur,16px))}',
            '.ncr-result--error{border-color:rgba(var(--nx-danger-rgb,239,68,68),.35)}',
            '.ncr-result-head{display:flex;gap:var(--nx-space-3,12px);align-items:flex-start}',
            '.ncr-result-thumb{width:52px;height:52px;border-radius:var(--nx-radius-sm,6px);object-fit:cover;background:var(--nx-bg-muted,#f1f5f9);flex-shrink:0;cursor:zoom-in}',
            '.ncr-notice{display:flex;align-items:center;gap:6px;font-size:var(--nx-text-xs,12px);color:var(--nx-text-muted,#94a3b8)}',
            '.ncr-result-body{font-size:var(--nx-text-base,15px);line-height:var(--nx-leading,1.6);color:var(--nx-text-body,#334155);max-width:80ch;overflow-wrap:break-word}',
            '.ncr-result-body :deep(h1),.ncr-result-body :deep(h2),.ncr-result-body :deep(h3){color:var(--nx-text-heading,#0f172a)}',
            '.ncr-kv{margin:0;display:grid;grid-template-columns:minmax(72px,max-content) 1fr;gap:6px var(--nx-space-4,16px)}',
            '.ncr-kv dt{font-size:var(--nx-text-sm,14px);color:var(--nx-text-secondary,#64748b)}',
            '.ncr-kv dd{margin:0;font-size:var(--nx-text-sm,14px);color:var(--nx-text-body,#334155)}',
            '.ncr-error-msg{margin:0;font-size:var(--nx-text-sm,14px);color:var(--nx-danger,#ef4444)}',
            '.ncr-result-actions{display:flex;gap:var(--nx-space-3,12px);justify-content:flex-end;flex-wrap:wrap}',

            '.ncr-input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip:rect(0 0 0 0)}',
            '@media(hover:none) and (pointer:coarse){.ncr-btn{min-height:44px}.ncr-iconbtn{width:44px;height:44px}.ncr-shutter{width:72px;height:72px}}',
            '@media(prefers-reduced-motion:reduce){.ncr-flash,.ncr-scan,.ncr-busy-bar i,.ncr-stage--active .ncr-stage-dot{animation:none}.ncr-busy-bar i{width:100%}}'
        ]);
    }
    ensureStyle();

    var DEFAULT_STAGES = ['上传图片', 'AI 识别中', '整理结果'];

    function toast(message, type) {
        if (typeof window.showToast === 'function') window.showToast(message, type || 'error');
    }

    function formatError(err) {
        if (!err) return '识别失败，请重试';
        if (err.name === 'NotAllowedError') return '相机未授权：请在浏览器权限设置中允许相机，或改用「从相册选择」。';
        if (err.name === 'NotFoundError') return '未找到可用摄像头，可改用「从相册选择」。';
        if (err.message) return err.message;
        return '识别失败，请重试';
    }

    var NuxCameraRecognize = {
        name: 'NuxCameraRecognize',
        props: {
            uploadUrl: { type: String, default: '' },
            apiInstance: { type: Object, default: null },
            handler: { type: Function, default: null },
            prompt: { type: String, default: '识别这张图片的内容' },
            system: { type: String, default: '' },
            jsonMode: { type: Boolean, default: false },
            stages: { type: Array, default: function () { return DEFAULT_STAGES.slice(); } },
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
                return (props.stages && props.stages.length ? props.stages : DEFAULT_STAGES).map(function (s, i) {
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
                    toast(formatError(err), 'error');
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
                var w = video.videoWidth;
                var h = video.videoHeight;
                var scale = Math.min(1, props.maxEdge / Math.max(w, h));
                var canvas = document.createElement('canvas');
                canvas.width = Math.round(w * scale);
                canvas.height = Math.round(h * scale);
                var cx = canvas.getContext('2d');
                if (facing.value === 'user') {
                    cx.translate(canvas.width, 0);
                    cx.scale(-1, 1);
                }
                cx.drawImage(video, 0, 0, canvas.width, canvas.height);
                stopStream();
                canvas.toBlob(function (blob) {
                    if (!blob) { toast('拍摄失败，请重试', 'error'); return; }
                    takeBlob(blob, true);
                }, 'image/jpeg', 0.9);
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
                if (!/^image\//.test(file.type)) { toast('请选择图片文件', 'error'); return; }
                if (file.size > props.maxSizeMb * 1024 * 1024) {
                    toast('图片超过 ' + props.maxSizeMb + 'MB 大小限制', 'error');
                    return;
                }
                prepareFile(file).then(takeBlob);
            }

            function prepareFile(file) {
                var SMALL = 2 * 1024 * 1024;
                if (file.size <= SMALL || (typeof createImageBitmap !== 'function')) return Promise.resolve(file);
                return createImageBitmap(file).then(function (bmp) {
                    var scale = Math.min(1, props.maxEdge / Math.max(bmp.width, bmp.height));
                    if (scale >= 1) return file;
                    var canvas = document.createElement('canvas');
                    canvas.width = Math.round(bmp.width * scale);
                    canvas.height = Math.round(bmp.height * scale);
                    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
                    bmp.close();
                    return new Promise(function (resolve) {
                        var keepPng = file.type === 'image/png';
                        canvas.toBlob(function (blob) { resolve(blob || file); }, keepPng ? 'image/png' : 'image/jpeg', 0.9);
                    });
                }).catch(function () { return file; });
            }

            function renderMarkdown(text) {
                if (window.NexusMarkdown && NexusMarkdown.render) return NexusMarkdown.render(text || '');
                return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;').replace(/\n/g, '<br>');
            }

            var busyPairs = [
                ['正在上传图片…', '正在把照片交给识别服务'],
                ['AI 正在识别图片内容…', '视觉模型正在阅读这张图片'],
                ['正在整理识别结果…', '即将完成']
            ];

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
                busyMsg.value = busyPairs[0][1];
                ctx.emit('start', imageBlob.value);
                var timers = [
                    setTimeout(function () { stageIndex.value = 1; busyMsg.value = busyPairs[1][1]; }, 700),
                    setTimeout(function () { stageIndex.value = 2; busyMsg.value = busyPairs[2][1]; }, 6000)
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
                    normalizeResult(payload);
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

            function normalizeResult(payload) {
                var model = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload.model : undefined;
                if (payload && typeof payload === 'object' && !Array.isArray(payload)
                    && (payload.result !== undefined || payload.content !== undefined)) {
                    payload = payload.result !== undefined ? payload.result : payload.content;
                }
                if (payload !== null && typeof payload === 'object') {
                    result.value = { kind: 'json', data: payload, model: model };
                } else {
                    result.value = { kind: 'text', text: String(payload == null ? '' : payload), model: model };
                }
            }

            var kvEntries = computed(function () {
                if (!result.value || result.value.kind !== 'json') return [];
                return Object.keys(result.value.data).map(function (k) {
                    var v = result.value.data[k];
                    if (v === null || v === undefined) v = '—';
                    else if (typeof v === 'object') v = JSON.stringify(v);
                    return { key: k, value: String(v) };
                });
            });

            function copyResult() {
                if (!result.value) return;
                var text = result.value.kind === 'json' ? JSON.stringify(result.value.data, null, 2) : result.value.text;
                if (window.NexusUtils && NexusUtils.copyText) { NexusUtils.copyText(text, { success: '已复制' }); return; }
                navigator.clipboard.writeText(text).then(function () { toast('已复制', 'success'); }).catch(function () {});
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
        template: [
'<div class="ncr" :class="{ \'ncr--compact\': compact }">',
'    <label v-if="title" class="ncr-label">{{ title }}</label>',
'    <input ref="inputEl" class="ncr-input" type="file" accept="image/*"',
'        :capture="inputCapture ? \'environment\' : null" @change="onPick" />',

'    <div v-if="state === \'idle\'" class="ncr-frame">',
'        <span class="ncr-glyph" aria-hidden="true">📷</span>',
'        <div class="ncr-entry-actions">',
'            <button v-if="allowCamera" type="button" class="ncr-btn ncr-btn--primary" @click="openCamera">拍照识别</button>',
'            <button v-if="allowGallery" type="button" class="ncr-btn" @click="pick">从相册选择</button>',
'        </div>',
'        <p class="ncr-hint">{{ hint || (canUseCamera ? \'支持拍照或选择图片，识别由 AI 完成，内容仅供参考\' : \'当前环境不支持调起相机，可从相册选择图片\') }}</p>',
'    </div>',

'    <div v-else-if="state === \'camera\'" class="ncr-camera" role="region" aria-label="相机取景">',
'        <video ref="videoEl" class="ncr-video" autoplay playsinline muted></video>',
'        <div class="ncr-reticle" aria-hidden="true"><i></i><i></i><i></i><i></i></div>',
'        <div class="ncr-camera-top">',
'            <span class="ncr-camera-tip">{{ cameraTip }}</span>',
'            <button type="button" class="ncr-iconbtn" aria-label="关闭相机" @click="closeCamera">✕</button>',
'        </div>',
'        <div class="ncr-camera-bar">',
'            <button v-if="allowGallery" type="button" class="ncr-iconbtn" aria-label="从相册选择" @click="pick">🖼</button>',
'            <button type="button" class="ncr-shutter" aria-label="拍摄" :disabled="flashing" @click="capture"></button>',
'            <button type="button" class="ncr-iconbtn" aria-label="切换前后摄像头" @click="flipCamera">⟳</button>',
'        </div>',
'        <div v-if="flashing" class="ncr-flash" aria-hidden="true"></div>',
'    </div>',

'    <div v-else-if="state === \'preview\'" class="ncr-preview" role="region" aria-label="照片预览">',
'        <img class="ncr-shot" :src="previewUrl" alt="待识别的照片" />',
'        <div class="ncr-preview-actions">',
'            <button type="button" class="ncr-btn" @click="retake">重拍</button>',
'            <button ref="recognizeBtnEl" type="button" class="ncr-btn ncr-btn--primary" @click="recognize">{{ recognizeText }}</button>',
'        </div>',
'    </div>',

'    <div v-else-if="state === \'recognizing\'" class="ncr-busy" role="status" aria-live="polite">',
'        <span class="ncr-busy-thumb">',
'            <img v-if="previewUrl" :src="previewUrl" alt="" />',
'            <i class="ncr-scan" aria-hidden="true"></i>',
'        </span>',
'        <span class="ncr-busy-main">',
'            <span class="ncr-stages">',
'                <span v-for="(s, i) in stages" :key="s.key" class="ncr-stage"',
'                    :class="{ \'ncr-stage--done\': i < stageIndex, \'ncr-stage--active\': i === stageIndex }">',
'                    <i class="ncr-stage-dot" aria-hidden="true"></i>{{ s.label }}',
'                </span>',
'            </span>',
'            <span class="ncr-busy-bar" aria-hidden="true"><i></i></span>',
'            <span class="ncr-busy-foot">',
'                <span class="ncr-busy-msg">{{ busyMsg }}</span>',
'                <button type="button" class="ncr-btn" @click="cancelRecognize">取消</button>',
'            </span>',
'        </span>',
'    </div>',

'    <div v-else-if="state === \'done\'" class="ncr-result" role="region" aria-label="识别结果">',
'        <div class="ncr-result-head">',
'            <img v-if="previewUrl" class="ncr-result-thumb" :src="previewUrl" alt="原图" />',
'            <span class="ncr-notice">✦ AI 生成内容，仅供参考</span>',
'        </div>',
'        <slot name="result" :result="result">',
'            <div class="ncr-result-body">',
'                <template v-if="result && result.kind === \'json\'">',
'                    <dl class="ncr-kv">',
'                        <template v-for="e in kvEntries" :key="e.key">',
'                            <dt>{{ e.key }}</dt><dd>{{ e.value }}</dd>',
'                        </template>',
'                    </dl>',
'                </template>',
'                <template v-else>',
'                    <div v-html="result ? renderMarkdown(result.text) : \'\'"></div>',
'                </template>',
'            </div>',
'        </slot>',
'        <div class="ncr-result-actions">',
'            <button type="button" class="ncr-btn" @click="copyResult">复制</button>',
'            <button type="button" class="ncr-btn" @click="retake">再拍一张</button>',
'        </div>',
'    </div>',

'    <div v-else-if="state === \'error\'" class="ncr-result ncr-result--error" role="alert">',
'        <div class="ncr-result-head">',
'            <img v-if="previewUrl" class="ncr-result-thumb" :src="previewUrl" alt="原图" />',
'            <p class="ncr-error-msg">{{ errorMsg }}</p>',
'        </div>',
'        <div class="ncr-result-actions">',
'            <button type="button" class="ncr-btn" @click="reset">重新开始</button>',
'            <button type="button" class="ncr-btn ncr-btn--primary" @click="recognize">重试识别</button>',
'        </div>',
'    </div>',
'</div>'
        ].join('\n')
    };

    window.NuxCameraRecognize = NuxCameraRecognize;
})();
