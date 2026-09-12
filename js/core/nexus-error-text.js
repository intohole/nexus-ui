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

    const ERROR_CODE_TEXT = {
        RATE_LIMIT_EXCEEDED: '操作过于频繁，请稍后再试',
        RATE_LIMITED: '操作过于频繁，请稍后再试',
        AUTH_ERROR: '登录已失效，请重新登录',
        FORBIDDEN: '没有权限执行此操作',
        NOT_FOUND: '请求的资源不存在',
        CONFLICT: '数据冲突，请刷新后重试',
        BAD_REQUEST: '请求参数有误，请检查后重试',
        VALIDATION_ERROR: '提交的数据有误，请检查后重试',
        CONTENT_FILTERED: '内容触发安全限制，请调整后重试',
        EXTERNAL_SERVICE_ERROR: '外部服务暂时不可用，请稍后重试',
        SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试',
        DATABASE_ERROR: '数据库操作失败，请稍后重试',
        XIANYU_AUTH_ERROR: '闲鱼认证失效，请重新登录闲鱼',
        XIANYU_RATE_LIMIT: '闲鱼请求过于频繁，请稍后再试'
    };

    function codeToTitle(e) {
        const c = (e && (e.errorCode || (e.response && e.response.data && e.response.data.error_code) || (e.response && e.response.data && e.response.data.code))) || '';
        return (c && ERROR_CODE_TEXT[c]) || '';
    }

    function fromError(e, fallback) {
        const code = extractCode(e);
        const status = (e && e.response && e.response.status) || (e && e.status) || 0;
        const codeTitle = codeToTitle(e);
        if (status === 401 || status === 403 || codeTitle) {
            return { title: codeTitle || '登录已失效，请重新登录', message: status === 401 ? '' : status === 403 ? '若已登录账号请刷新后重试' : '', code: code || 'HTTP ' + status };
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
