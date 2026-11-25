/* NexusCameraHelpers —— nux-camera-recognize 支撑层（前21 拆出，随 nexus-all.js 分发）
 * 职责：图片管线纯函数（校验/降采样/取帧/结果归一）+ 组件模板串。
 * 相机会话状态机（getUserMedia/stream 生命周期）归组件主文件。
 */
(function() {
    'use strict';
    if (window.NexusCameraHelpers) return;

    var DEFAULT_STAGES = ['上传图片', 'AI 识别中', '整理结果'];

    var BUSY_PAIRS = [
        ['正在上传图片…', '正在把照片交给识别服务'],
        ['AI 正在识别图片内容…', '视觉模型正在阅读这张图片'],
        ['正在整理识别结果…', '即将完成']
    ];

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

    /* 合法性校验：非图片/超限返回人话错误串，合法返回 null */
    function validateImageFile(file, maxSizeMb) {
        if (!/^image\//.test(file.type)) return '请选择图片文件';
        if (file.size > maxSizeMb * 1024 * 1024) return '图片超过 ' + maxSizeMb + 'MB 大小限制';
        return null;
    }

    /* 大图降采样（>2MB 且支持 createImageBitmap 时按 maxEdge 缩边，保 PNG 透明通道） */
    function prepareFile(file, maxEdge) {
        var SMALL = 2 * 1024 * 1024;
        if (file.size <= SMALL || (typeof createImageBitmap !== 'function')) return Promise.resolve(file);
        return createImageBitmap(file).then(function (bmp) {
            var scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
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

    /* 相机取帧 → JPEG blob（前置镜像；maxEdge 缩边；纯函数由组件传入 video/facing） */
    function captureFrame(video, facing, maxEdge) {
        var w = video.videoWidth;
        var h = video.videoHeight;
        var scale = Math.min(1, maxEdge / Math.max(w, h));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        var cx = canvas.getContext('2d');
        if (facing === 'user') {
            cx.translate(canvas.width, 0);
            cx.scale(-1, 1);
        }
        cx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return new Promise(function (resolve) {
            canvas.toBlob(function (blob) { resolve(blob); }, 'image/jpeg', 0.9);
        });
    }

    /* 识别载荷归一 → { kind:'text'|'json', text?, data?, model } */
    function normalizeResult(payload) {
        var model = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload.model : undefined;
        if (payload && typeof payload === 'object' && !Array.isArray(payload)
            && (payload.result !== undefined || payload.content !== undefined)) {
            payload = payload.result !== undefined ? payload.result : payload.content;
        }
        if (payload !== null && typeof payload === 'object') {
            return { kind: 'json', data: payload, model: model };
        }
        return { kind: 'text', text: String(payload == null ? '' : payload), model: model };
    }

    function kvEntriesOf(result) {
        if (!result || result.kind !== 'json') return [];
        return Object.keys(result.data).map(function (k) {
            var v = result.data[k];
            if (v === null || v === undefined) v = '—';
            else if (typeof v === 'object') v = JSON.stringify(v);
            return { key: k, value: String(v) };
        });
    }

    function resultTextOf(result) {
        if (!result) return '';
        return result.kind === 'json' ? JSON.stringify(result.data, null, 2) : result.text;
    }

    function renderMarkdown(text) {
        if (window.NexusMarkdown && NexusMarkdown.render) return NexusMarkdown.render(text || '');
        return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }

    window.NexusCameraHelpers = {
        DEFAULT_STAGES: DEFAULT_STAGES,
        BUSY_PAIRS: BUSY_PAIRS,
        toast: toast,
        formatError: formatError,
        validateImageFile: validateImageFile,
        prepareFile: prepareFile,
        captureFrame: captureFrame,
        normalizeResult: normalizeResult,
        kvEntriesOf: kvEntriesOf,
        resultTextOf: resultTextOf,
        renderMarkdown: renderMarkdown
    };
})();
