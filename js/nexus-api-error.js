(function() {
    const NETWORK_ERROR_PATTERNS = [
        'Failed to fetch',
        'NetworkError when attempting to fetch resource',
        'Network request failed',
        'Load failed',
        'ERR_NETWORK',
        'ERR_INTERNET_DISCONNECTED',
        'ERR_CONNECTION_REFUSED',
        'ERR_CONNECTION_RESET',
        'ERR_CONNECTION_CLOSED',
        'ERR_ABORTED'
    ];

    const DEFAULT_ERROR_MAP = {
        400: '请求参数有误，请检查后重试',
        401: '登录已过期，请重新登录',
        403: '没有权限执行此操作',
        404: '请求的资源不存在',
        408: '请求超时，请稍后重试',
        409: '数据冲突，请刷新后重试',
        422: '提交的数据有误，请检查后重试',
        429: '操作过于频繁，请稍后再试',
        500: '服务器开小差了，请稍后重试',
        502: '网关错误，服务暂时不可用',
        503: '服务暂时不可用，请稍后重试',
        504: '网关超时，请稍后重试'
    };

    class NexusApiError extends Error {
        constructor(message, status = null, response = null, code = null) {
            super(message);
            this.name = 'NexusApiError';
            this.status = status;
            this.response = response;
            this.code = code;
            this.errorCode = code;
            this.isNetwork = false;
        }
    }

    const ERROR_CODE_TEXT_MAP = {
        'RATE_LIMIT_EXCEEDED': '操作过于频繁，请稍后再试',
        'AUTH_ERROR': '登录已失效，请重新登录',
        'FORBIDDEN': '没有权限执行此操作',
        'NOT_FOUND': '请求的资源不存在',
        'VALIDATION_ERROR': '提交的数据有误，请检查后重试',
        'CONFLICT': '数据冲突，请刷新后重试',
        'BAD_REQUEST': '请求参数有误，请检查后重试',
        'INTERNAL_ERROR': '服务器开小差了，请稍后重试',
        'EXTERNAL_SERVICE_ERROR': '外部服务暂时不可用，请稍后重试',
        'SERVICE_UNAVAILABLE': '服务暂时不可用，请稍后重试',
        'XIANYU_AUTH_ERROR': '闲鱼认证失效，请重新登录闲鱼',
        'XIANYU_RATE_LIMIT': '闲鱼请求过于频繁，请稍后再试',
        'RATE_LIMITED': '操作过于频繁，请稍后再试'
    };

    function isNetworkError(err) {
        if (!err) return false;
        if (err.isNetwork === true) return true;
        const msg = err.message || String(err);
        return NETWORK_ERROR_PATTERNS.some(p => msg.includes(p));
    }

    function isTimeoutError(err) {
        if (!err) return false;
        return err.name === 'AbortError' ||
               (err.message && err.message.includes('timeout')) ||
               (err.status === 408);
    }

    function mapHttpError(err, context = {}) {
        if (!err) return '未知错误';
        if (err.errorCode && ERROR_CODE_TEXT_MAP[err.errorCode]) {
            return ERROR_CODE_TEXT_MAP[err.errorCode];
        }
        if (err.name === 'NexusApiError' && err.status) {
            const custom = context[err.status];
            if (custom) return custom;
            const mapped = DEFAULT_ERROR_MAP[err.status];
            if (mapped) return mapped;
            if (err.status >= 500) return '服务器暂时不可用，请稍后重试';
            if (err.status >= 400) return err.message || '请求失败';
            return err.message || '请求失败';
        }
        if (isNetworkError(err)) {
            return '网络连接失败，请检查网络后重试';
        }
        if (isTimeoutError(err)) {
            return '请求超时，请稍后重试';
        }
        if (err.name === 'AbortError') {
            return '请求超时，请稍后重试';
        }
        const msg = err.message || String(err);
        if (NETWORK_ERROR_PATTERNS.some(p => msg.includes(p))) {
            return '网络连接失败，请检查网络后重试';
        }
        if (msg === 'Failed to fetch' || msg.includes('Failed to fetch')) {
            return '网络连接失败，请检查网络后重试';
        }
        return msg || '操作失败';
    }

    window.NexusApiError = NexusApiError;
    window.isNetworkError = isNetworkError;
    window.mapHttpError = mapHttpError;
})();
