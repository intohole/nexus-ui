(function () {
    'use strict';

    const TOAST_INTERVAL_MS = 60000;
    const STACK_MAX = 300;
    let _installed = false;
    let _onReport = null;
    const _lastToast = {};

    function normalizeMessage(err, fallback) {
        if (!err) return fallback || '页面出了点问题';
        if (typeof err === 'string') return err.slice(0, 120) || fallback;
        if (err.name === 'TypeError') return '页面出了点问题，刷新后重试';
        if (err.name === 'SyntaxError') return '页面加载异常，请刷新重试';
        if (err.name === 'RangeError' || err.name === 'ReferenceError') return '页面出了点问题，刷新后重试';
        const status = err && (err.status !== undefined ? err.status : err.response && err.response.status);
        if (status && window.NexusErrorText && typeof window.NexusErrorText.fromError === 'function') {
            const mapped = window.NexusErrorText.fromError(err, '页面出了点问题');
            return mapped.title || mapped.message || '页面出了点问题';
        }
        if (err.message) {
            const safe = window.NexusErrorText && typeof window.NexusErrorText.safeMessage === 'function'
                ? window.NexusErrorText.safeMessage(err.message)
                : String(err.message);
            return safe || '页面出了点问题';
        }
        return '页面出了点问题';
    }

    function report(entry) {
        if (typeof _onReport === 'function') {
            try { _onReport(entry); } catch (e) {}
        }
    }

    function stackOf(err) {
        const s = err && err.stack ? String(err.stack) : '';
        return s.length > STACK_MAX ? s.slice(0, STACK_MAX) + '…' : s;
    }

    function throttleKey(err, fallback) {
        if (err && typeof err === 'object') return (err.name || 'Error') + ':' + String(err.message || '');
        return 'str:' + String(err || fallback || '');
    }

    function shouldToast(err, fallback) {
        const message = normalizeMessage(err, fallback);
        const key = throttleKey(err, fallback);
        const now = Date.now();
        if (_lastToast[key] && now - _lastToast[key] < TOAST_INTERVAL_MS) return null;
        _lastToast[key] = now;
        return message;
    }

    function toast(message) {
        if (window.NexusApp && typeof window.NexusApp.notify === 'function') {
            window.NexusApp.notify(message, 'error');
            return;
        }
        if (typeof window.showToast === 'function') window.showToast(message, 'error', 3200);
    }

    function handleError(err, fallback, kind) {
        if (!err) return;
        if (err.__nxHandled) return;
        if (err.name === 'AbortError' || err.code === 'ERR_ABORTED') return;
        if (err.name === 'NexusStreamError' || err.name === 'NexusApiError') return;
        const status = err && (err.status !== undefined ? err.status : err.response && err.response.status);
        if (status === 401) return;
        if (typeof console !== 'undefined' && console.error) console.error('[NexusGuard]', err);
        report({ kind: kind || 'js', message: normalizeMessage(err, fallback), stack: stackOf(err), ts: Date.now() });
        const message = shouldToast(err, fallback);
        if (!message) return;
        if (typeof err === 'object' && err !== null) err.__nxHandled = true;
        toast(message);
    }

    function handleResourceError(evt) {
        const target = evt && evt.target;
        if (!target || !target.tagName) return false;
        const url = target.src || target.href;
        if (!url) return false;
        if (typeof console !== 'undefined' && console.warn) {
            console.warn('[NexusGuard] 资源加载失败:', target.tagName, url);
        }
        report({ kind: 'resource', tag: target.tagName, url: String(url).slice(0, 200), ts: Date.now() });
        return true;
    }

    const NexusGuard = {
        get version() { return '1.0.0'; },
        set onReport(fn) { if (typeof fn === 'function' || fn === null) _onReport = fn; },
        get onReport() { return _onReport; },

        install() {
            if (_installed) return;
            _installed = true;
            window.addEventListener('error', function (evt) {
                if (evt && evt.message) {
                    handleError(evt.error || new Error(evt.message), evt.message, 'js');
                    return;
                }
                handleResourceError(evt);
            }, true);
            window.addEventListener('unhandledrejection', function (evt) {
                handleError(evt && evt.reason, '未处理的异步异常', 'promise');
            });
            window.addEventListener('rejectionhandled', function (evt) {
                const r = evt && evt.reason;
                if (r && typeof r === 'object' && r.__nxHandled) delete r.__nxHandled;
            });
        },

        handleError: handleError
    };

    window.NexusGuard = NexusGuard;
    NexusGuard.install();
})();
