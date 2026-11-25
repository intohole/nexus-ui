/* NexusApiHelpers —— nexus-api 支撑层（前21 拆出）：错误归一纯函数 + 原型 mixin。
 * mixin 含：token 存储/刷新单飞（window.__ucTokenRefresh 全局互认）/鉴权端点判定/streamPost/download。
 * 装配双向容错：聚合包序=本文件先于 nexus-api.js（后者主动 Object.assign）；
 * 若被晚于 nexus-api.js 加载，此处直接补到原型上，实例方法调用面（nxApi._getToken 等）不受加载序影响。
 */
(function() {
    'use strict';
    if (window.NexusApiHelpers) return;

    const ApiError = window.NexusApiError || Error;
    const NET_PATTERNS = ['Failed to fetch', 'NetworkError', 'Network request failed', 'Load failed'];

    function isNetworkErr(err) {
        if (!err) return false;
        if (err.isNetwork === true) return true;
        const msg = err.message || '';
        return NET_PATTERNS.some(p => msg.includes(p));
    }

    function errMsg(v) {
        if (window.NexusUtils && NexusUtils.errorDetailText) return NexusUtils.errorDetailText(v);
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v;
        if (Array.isArray(v)) return v.join('；');
        if (typeof v === 'object') return v.message || v.detail || v.msg || v.error || '';
        return String(v);
    }

    function extractError(data) {
        if (data.success === false) return errMsg(data.message) || errMsg(data.error) || '操作失败';
        if (data.error) return errMsg(data.error);
        if (data.message) return errMsg(data.message);
        if (data.detail) return errMsg(data.detail);
        return '请求失败';
    }

    function extractErrorCode(data) {
        if (!data || typeof data !== 'object') return null;
        const code = data.error_code || data.errorCode || data.code;
        if (code == null) return null;
        return typeof code === 'string' ? code : String(code);
    }

    const methods = {
        _getToken() {
            try { return this.storage.getItem(this.tokenKey) || ''; } catch (e) { return ''; }
        },

        _setToken(token) {
            try { this.storage.setItem(this.tokenKey, token); } catch (e) {}
        },

        _getRefreshToken() {
            if (!this.refreshTokenKey) return '';
            try { return this.storage.getItem(this.refreshTokenKey) || ''; } catch (e) { return ''; }
        },

        _setRefreshToken(token) {
            if (!this.refreshTokenKey) return;
            try { this.storage.setItem(this.refreshTokenKey, token); } catch (e) {}
        },

        _clearAuth() {
            try {
                this.storage.removeItem(this.tokenKey);
                this.storage.removeItem(this.userKey);
                if (this.refreshTokenKey) this.storage.removeItem(this.refreshTokenKey);
            } catch (e) {}
        },

        _isAuthEntry(url) {
            const path = String(url || '').split('?')[0].split('#')[0];
            if (/(\/login|\/register|\/sms-login|\/refresh)$/.test(path)) return true;
            if (this.authEndpoints) {
                return this.authEndpoints.some((ep) => path.indexOf(ep) >= 0);
            }
            return false;
        },

        _isSilentEntry(url) {
            if (!this.silentEndpoints) return false;
            const path = String(url || '').split('?')[0].split('#')[0];
            return this.silentEndpoints.some((ep) => path.indexOf(ep) >= 0);
        },

        async _tryRefresh() {
            if (this._refreshPromise) return this._refreshPromise;
            // 全局刷新单飞（与 UserCenterSDK.refreshAccessToken 互认）：UC 的 refresh token
            // 轮换+重用检测会把并发的第二次刷新判为盗用并吊销整个 token 家族（用户被随机登出）。
            // 共享方落定后直接读存储（_getToken 每次现读），SDK 写入的新 token 自动可见。
            const inflight = window.__ucTokenRefresh;
            if (inflight && inflight.then) {
                this._refreshPromise = Promise.resolve(inflight).then(() => {
                    const token = this._getToken();
                    if (!token) throw new Error('shared refresh produced no token');
                    return token;
                });
                try { return await this._refreshPromise; } finally { this._refreshPromise = null; }
            }
            const refreshToken = this._getRefreshToken();
            if (!this.refreshUrl || !refreshToken) return Promise.reject(new Error('no refresh config'));
            const body = this.refreshBodyBuilder ? this.refreshBodyBuilder(refreshToken) : { refresh_token: refreshToken };
            const refreshController = new AbortController();
            const refreshTimeoutId = setTimeout(() => refreshController.abort(), this.timeout || 30000);
            this._refreshPromise = fetch(`${this.baseUrl}${this.refreshUrl}`, {
                method: this.refreshMethod,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: refreshController.signal
            }).then(async (res) => {
                let rdata; try { rdata = await res.json(); } catch { rdata = {}; }
                if (!res.ok) throw new Error('refresh failed');
                const newToken = rdata.access_token || (rdata.data && rdata.data.access_token);
                const newRefresh = rdata.refresh_token || (rdata.data && rdata.data.refresh_token);
                if (!newToken) throw new Error('no token in refresh response');
                this._setToken(newToken);
                if (newRefresh) this._setRefreshToken(newRefresh);
                if (this.onRefreshSuccess) this.onRefreshSuccess(rdata, this);
                return newToken;
            }).catch((err) => {
                throw err.name === 'AbortError' ? new Error('refresh timeout') : err;
            }).finally(() => { clearTimeout(refreshTimeoutId); this._refreshPromise = null; });
            const gateGuard = this._refreshPromise.catch(() => false);
            window.__ucTokenRefresh = gateGuard;
            gateGuard.then(() => { if (window.__ucTokenRefresh === gateGuard) window.__ucTokenRefresh = null; });
            return this._refreshPromise;
        },

        ensureFreshToken(skewMs = 120000) {
            const token = this._getToken();
            if (!token || token.split('.').length < 2 || !this.refreshUrl) return Promise.resolve();
            try {
                const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                const expMs = (payload.exp || 0) * 1000;
                if (expMs && Date.now() > expMs - skewMs) return this._tryRefresh().catch(() => {});
            } catch (e) {}
            return Promise.resolve();
        },

        async streamPost(url, data = {}, { onEvent, onError, timeout = 60000, idleTimeout, headers = {} } = {}) {
            const controller = new AbortController();
            const requestId = this._generateRequestId(url);
            this._registerController(requestId, controller);
            try {
                for await (const evt of NexusStream.post(`${this.baseUrl}${url}`, {
                    body: JSON.stringify(data),
                    headers: this._buildHeaders(headers),
                    signal: controller.signal,
                    idleTimeout: idleTimeout || Math.max(timeout, 90000),
                    priority: 'sse-event',
                    onUnauthorized: () => this._handleSessionExpired(),
                })) {
                    if (onEvent) {
                        try { onEvent(evt.event, evt.data); } catch (e) { }
                    }
                }
            } catch (error) {
                let msg = (error && error.message) || '网络错误';
                let code = (error && error.code) || null;
                if (error && error.status === 401) {
                    msg = '登录已过期，请重新登录';
                    code = null;
                } else if (error && error.status) {
                    const m = /^HTTP \d+ (.*)$/s.exec(error.message || '');
                    if (m) {
                        try {
                            const errData = JSON.parse(m[1]);
                            const detail = extractError(errData);
                            if (detail) msg = detail;
                            code = extractErrorCode(errData);
                        } catch (e) { }
                    }
                    if (this.onError) this.onError(error.status, msg);
                } else if (error && (error.code === 'timeout' || error.name === 'AbortError')) {
                    msg = '连接超时，请检查网络后重试';
                } else if (isNetworkErr(error)) {
                    msg = '网络连接失败，请检查网络后重试';
                }
                if (onError) onError(msg, code);
            } finally {
                this.abortControllers.delete(requestId);
            }
        },

        async download(url, params = {}, options = {}) {
            if (params && typeof params === 'object' && !(params instanceof URLSearchParams)
                && ('method' in params || 'body' in params || 'headers' in params || 'params' in params || 'timeout' in params)) {
                options = params;
                params = options.params || {};
            }
            const method = options.method || 'GET';
            const qs = new URLSearchParams(params).toString();
            const fullUrl = qs ? `${url}?${qs}` : url;
            const token = this._getToken();
            const headers = { ...(token && { 'Authorization': `Bearer ${token}` }), ...(options.headers || {}) };
            if (options.body !== undefined && options.body !== null) headers['Content-Type'] = 'application/json';
            const controller = new AbortController();
            const timeoutId = options.timeout ? setTimeout(() => controller.abort(), options.timeout) : null;
            let response;
            try {
                response = await fetch(`${this.baseUrl}${fullUrl}`, {
                    method,
                    headers,
                    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
                    signal: options.timeout ? controller.signal : undefined
                });
            } catch (err) {
                throw isNetworkErr(err) ? new ApiError('网络连接失败，请检查网络后重试', null, null) : new ApiError(err.message || '下载失败', null, null);
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
            }
            if (!response.ok) {
                let errData;
                try { errData = await response.json(); } catch { errData = {}; }
                if (response.status === 401) {
                    this._handleSessionExpired();
                }
                const errorMsg = extractError(errData) || `下载失败 (${response.status})`;
                if (this.onError) this.onError(response.status, errorMsg);
                throw new ApiError(errorMsg, response.status, errData, extractErrorCode(errData));
            }
            return await response.blob();
        }
    };

    window.NexusApiHelpers = { isNetworkErr, errMsg, extractError, extractErrorCode, methods };

    // 误序兜底：被晚于 nexus-api.js 加载时直接补原型（聚合包正确序下此处为 no-op）
    if (window.NexusApi && window.NexusApi.prototype) {
        Object.assign(window.NexusApi.prototype, methods);
    }
})();
