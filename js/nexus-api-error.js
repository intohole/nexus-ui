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
        402: '积分余额不足，请充值后重试',
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
        'INSUFFICIENT_CREDITS': '积分余额不足，请充值后重试',
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

    function hasCJKText(s) {
        return /[\u4e00-\u9fa5]/.test(s);
    }

    // detail 文本抽取（response/body/detail 三形态），经 NexusUtils.errorDetailText 单源
    // （数组拼接 + Value error 前缀剥离 + translate 钩子）；共享层未在场时降级为原文直取
    function detailText(err, translate) {
        if (!err || !window.NexusUtils || typeof window.NexusUtils.errorDetailText !== 'function') return '';
        let raw = null;
        if (err.response && err.response.detail !== undefined && err.response.detail !== null && err.response.detail !== '') {
            raw = err.response.detail;
        } else if (err.body && err.body.detail !== undefined && err.body.detail !== null && err.body.detail !== '') {
            raw = err.body.detail;
        } else if (err.detail !== undefined && err.detail !== null && err.detail !== '') {
            raw = err.detail;
        }
        if (raw === null) return '';
        return window.NexusUtils.errorDetailText(raw, translate ? { translate: translate } : undefined);
    }

    // 错误文案统一映射。ctx 通道（全部可选、向后兼容——只传 {status: 文案} 的存量调用语义不变）：
    //   ctx[status]      业务域文案覆写（数字键）
    //   ctx.prefix       文案前缀（「投放计划：服务器开小差了」）
    //   ctx.fallback     终态兜底（无任何命中时；不传沿用 message 直通）
    //   ctx.translate    detail 英文→中文映射表（usercenter EN_TO_ZH 形态）
    //   ctx.detailFirst  模式 C：detail → CJK → status（piying 形态）
    //   ctx.trustCJKOverStatus  模式 B：CJK → status → detail（adSmart/truemirror 形态）
    //   缺省模式 A：status → CJK → detail（travelMate 形态，亦即历史行为）
    function mapHttpError(err, context = {}) {
        emitInsufficientCredits(err);
        if (!err) return '未知错误';
        const ctx = context || {};
        const wrap = (t) => (ctx.prefix ? ctx.prefix + '：' + t : t);
        if (err.errorCode && ERROR_CODE_TEXT_MAP[err.errorCode]) {
            return wrap(ERROR_CODE_TEXT_MAP[err.errorCode]);
        }
        const msg = err.message || String(err);
        const byStatus = () => {
            if (err.name === 'NexusApiError' && err.status) {
                if (ctx[err.status]) return wrap(ctx[err.status]);
                const mapped = DEFAULT_ERROR_MAP[err.status];
                if (mapped) return wrap(mapped);
                if (err.status >= 500) return wrap('服务器暂时不可用，请稍后重试');
                return wrap(msg || '请求失败');
            }
            return null;
        };
        const byCJK = () => (hasCJKText(msg) ? wrap(msg) : null);
        const byDetail = () => {
            const det = detailText(err, ctx.translate);
            return det ? wrap(det) : null;
        };
        let out = null;
        if (ctx.detailFirst) {
            out = byDetail() || byCJK() || byStatus();
        } else if (ctx.trustCJKOverStatus) {
            out = byCJK() || byStatus() || byDetail();
        } else {
            out = byStatus() || byCJK() || byDetail();
        }
        if (out) return out;
        if (isNetworkError(err)) {
            return wrap('网络连接失败，请检查网络后重试');
        }
        if (isTimeoutError(err) || err.name === 'AbortError') {
            return wrap('请求超时，请稍后重试');
        }
        if (NETWORK_ERROR_PATTERNS.some(p => msg.includes(p))) {
            return wrap('网络连接失败，请检查网络后重试');
        }
        return wrap(ctx.fallback || msg || '操作失败');
    }

    // detail 原文单源出口（usercenter localizeDetail 形态：输入是裸 detail 非完整 error）
    function mapDetail(detail, opts) {
        if (window.NexusUtils && typeof window.NexusUtils.errorDetailText === 'function') {
            return window.NexusUtils.errorDetailText(detail, opts);
        }
        return detail === null || detail === undefined ? '' : String(detail);
    }

    function isInsufficientCreditsError(err) {
        if (!err) return false;
        if (err.status === 402) return true;
        const code = err.errorCode || err.code || '';
        if (code === 'INSUFFICIENT_CREDITS') return true;
        const msg = err.message || String(err);
        return msg.indexOf('余额不足') !== -1;
    }

    function emitInsufficientCredits(err) {
        try {
            if (!isInsufficientCreditsError(err)) return;
            const body = (err && err.response) || {};
            const payload = body.detail || body;
            const details = payload.details || payload || {};
            window.dispatchEvent(new CustomEvent('nexus:insufficient-credits', {
                detail: {
                    message: (err && err.message) || payload.message || '',
                    code: details.code || '',
                    balance: typeof details.balance === 'number' ? details.balance : null,
                    cost: typeof details.cost === 'number' ? details.cost : null,
                    overdraft: details.overdraft || null,
                    charge_mode: details.charge_mode || '',
                    lite_grace: details.lite_grace === true,
                    recovery: details.recovery || null,
                    wallet_url: details.wallet_url || (details.recovery && details.recovery.wallet_url) || '/user-center.html#wallet'
                }
            }));
        } catch (e) { /* 引导卡事件绝不影响错误处理主流程 */ }
    }

    window.NexusApiError = NexusApiError;
    window.isNetworkError = isNetworkError;
    window.isInsufficientCreditsError = isInsufficientCreditsError;
    window.mapHttpError = mapHttpError;
    window.mapDetail = mapDetail;
})();
