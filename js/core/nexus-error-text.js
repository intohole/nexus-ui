(function () {
    'use strict';

    const STACK_MARKERS = ['Traceback', 'sqlalche.me', 'DetachedInstanceError', ' at 0x', 'File "', 'raise '];
    const MAX_LEN = 80;

    function looksLikeStack(text) {
        if (!text) return false;
        const t = String(text);
        const hit = STACK_MARKERS.some(function (m) { return t.indexOf(m) !== -1; });
        return hit || (t.length > 200 && /\s(at|line|File)\s/i.test(t));
    }

    function safeMessage(raw, maxLen) {
        if (raw == null) return '';
        let s = String(raw);
        if (looksLikeStack(s)) return '服务开小差了，请稍后重试';
        s = s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        const limit = maxLen || MAX_LEN;
        return s.length > limit ? s.slice(0, limit) + '…' : s;
    }

    function extractCode(e) {
        if (e && e.code) return String(e.code);
        const status = (e && e.response && e.response.status) || (e && e.status) || 0;
        if (status) return 'HTTP ' + status;
        if (e && e.name && e.name !== 'Error') return e.name;
        return '';
    }

    function extractServerMessage(e) {
        if (!e) return '';
        const d = (e.response && e.response.data) || e.data;
        if (d && typeof d === 'object') return d.detail || d.message || d.error || '';
        return e.message || '';
    }

    function fromError(e, fallback) {
        const code = extractCode(e);
        const status = (e && e.response && e.response.status) || (e && e.status) || 0;
        if (status === 401 || status === 403) {
            return { title: '登录已失效，请重新登录', message: '', code: code || 'HTTP ' + status };
        }
        const raw = extractServerMessage(e);
        const net = e && (e.code === 'ECONNABORTED' || e.code === 'ERR_NETWORK' || /network|timeout|socket/i.test(String(e.message || '')));
        if (net || /failed to fetch/i.test(String(raw || e.message || ''))) {
            return { title: '网络异常，请检查网络后重试', message: '', code: code || 'NETWORK' };
        }
        if (status >= 500 || looksLikeStack(raw)) {
            return { title: '服务开小差了', message: '请稍后重试，若持续出现请联系我们', code: code || 'SERVER' };
        }
        const safe = safeMessage(raw) || (fallback || '操作失败');
        return { title: fallback || '操作失败', message: safe === (fallback || '操作失败') ? '' : safe, code: code };
    }

    const NexusErrorText = { fromError: fromError, safeMessage: safeMessage, looksLikeStack: looksLikeStack };

    if (window.NexusUtils && typeof window.NexusUtils === 'object') {
        window.NexusUtils.safeErrorText = safeMessage;
    }

    window.NexusErrorText = NexusErrorText;
})();
