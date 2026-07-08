(function() {
    const DEFAULT_BASE_URL = (window.PATH_PREFIX || '') + '/api';
    const MAX_RETRY = 3;
    const MAX_ABORT_CONTROLLERS = 100;
    const BASE_DELAY = 1000;
    const MAX_DELAY = 30000;

    class NexusApi {
        constructor(config = {}) {
            this.baseUrl = config.baseUrl !== undefined ? config.baseUrl : DEFAULT_BASE_URL;
            this.maxRetry = config.maxRetry || MAX_RETRY;
            this.tokenKey = config.tokenKey || 'token';
            this.userKey = config.userKey || 'user';
            this.refreshTokenKey = config.refreshTokenKey || null;
            this.refreshUrl = config.refreshUrl || null;
            this.refreshMethod = config.refreshMethod || 'POST';
            this.refreshBodyBuilder = config.refreshBodyBuilder || null;
            this.onUnauthorized = config.onUnauthorized || null;
            this.onRefreshSuccess = config.onRefreshSuccess || null;
            this.onError = config.onError || null;
            this.timeout = config.timeout || 30000;
            this.responseAdapter = config.responseAdapter || null;
            this.storage = config.storage || localStorage;
            this.abortControllers = new Map();
            this._requestCounter = 0;
            this._refreshPromise = null;
        }

        _generateRequestId(url) {
            this._requestCounter = (this._requestCounter + 1) % Number.MAX_SAFE_INTEGER;
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                return `${url}_${crypto.randomUUID()}`;
            }
            return `${url}_${Date.now()}_${this._requestCounter}_${Math.random().toString(36).substring(2)}`;
        }

        _registerController(requestId, controller) {
            if (this.abortControllers.size >= MAX_ABORT_CONTROLLERS) {
                const oldestKey = this.abortControllers.keys().next().value;
                const oldCtrl = this.abortControllers.get(oldestKey);
                try { oldCtrl.abort(); } catch (e) {}
                this.abortControllers.delete(oldestKey);
            }
            this.abortControllers.set(requestId, controller);
        }

        _getToken() {
            try { return this.storage.getItem(this.tokenKey) || ''; } catch (e) { return ''; }
        }

        _setToken(token) {
            try { this.storage.setItem(this.tokenKey, token); } catch (e) {}
        }

        _getRefreshToken() {
            if (!this.refreshTokenKey) return '';
            try { return this.storage.getItem(this.refreshTokenKey) || ''; } catch (e) { return ''; }
        }

        _setRefreshToken(token) {
            if (!this.refreshTokenKey) return;
            try { this.storage.setItem(this.refreshTokenKey, token); } catch (e) {}
        }

        _clearAuth() {
            try {
                this.storage.removeItem(this.tokenKey);
                this.storage.removeItem(this.userKey);
                if (this.refreshTokenKey) this.storage.removeItem(this.refreshTokenKey);
            } catch (e) {}
        }

        _buildHeaders(extra) {
            const token = this._getToken();
            return {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...extra
            };
        }

        async _doFetch(url, options, controller) {
            const response = await fetch(`${this.baseUrl}${url}`, {
                ...options,
                headers: this._buildHeaders(options.headers),
                signal: controller.signal
            });

            let data;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                try { data = JSON.parse(text); } catch { data = { detail: text }; }
            }

            if (this.responseAdapter) {
                data = this.responseAdapter(data, response);
            }
            return { response, data };
        }

        _extractError(data) {
            if (data.success === false) return String(data.message || data.error || '操作失败');
            if (data.error) return String(data.error);
            if (data.message) {
                return Array.isArray(data.message) ? data.message.join(', ') :
                       typeof data.message === 'object' ? JSON.stringify(data.message) :
                       String(data.message);
            }
            if (data.detail) {
                return Array.isArray(data.detail) ? data.detail.join(', ') :
                       typeof data.detail === 'object' ? JSON.stringify(data.detail) :
                       String(data.detail);
            }
            return '请求失败';
        }

        async _tryRefresh() {
            if (this._refreshPromise) return this._refreshPromise;
            const refreshToken = this._getRefreshToken();
            if (!this.refreshUrl || !refreshToken) {
                return Promise.reject(new Error('no refresh config'));
            }
            const body = this.refreshBodyBuilder
                ? this.refreshBodyBuilder(refreshToken)
                : { refresh_token: refreshToken };
            const refreshTimeout = this.timeout || 30000;
            const refreshController = new AbortController();
            const refreshTimeoutId = setTimeout(() => refreshController.abort(), refreshTimeout);
            this._refreshPromise = fetch(`${this.baseUrl}${this.refreshUrl}`, {
                method: this.refreshMethod,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: refreshController.signal
            }).then(async (res) => {
                let rdata;
                try { rdata = await res.json(); } catch { rdata = {}; }
                if (!res.ok) throw new Error('refresh failed');
                const newToken = rdata.access_token || (rdata.data && rdata.data.access_token);
                const newRefresh = rdata.refresh_token || (rdata.data && rdata.data.refresh_token);
                if (!newToken) throw new Error('no token in refresh response');
                this._setToken(newToken);
                if (newRefresh) this._setRefreshToken(newRefresh);
                if (this.onRefreshSuccess) this.onRefreshSuccess(rdata);
                return newToken;
            }).catch((err) => {
                if (err.name === 'AbortError') {
                    throw new Error('refresh timeout');
                }
                throw err;
            }).finally(() => {
                clearTimeout(refreshTimeoutId);
                this._refreshPromise = null;
            });
            return this._refreshPromise;
        }

        async request(url, options = {}) {
            const controller = new AbortController();
            const requestId = this._generateRequestId(url);
            this._registerController(requestId, controller);

            const timeoutValue = options.timeout !== undefined ? options.timeout : this.timeout;
            const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

            const isIdempotent = !options.method || options.method === 'GET';
            const maxAttempts = isIdempotent ? this.maxRetry : 1;
            const skipAuthRefresh = options.skipAuthRefresh === true;
            let lastError;

            try {
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        const { response, data } = await this._doFetch(url, options, controller);

                        if (!response.ok) {
                            const errorMsg = this._extractError(data);
                            if (response.status === 401 && !skipAuthRefresh && this.refreshUrl) {
                                try {
                                    await this._tryRefresh();
                                    const retryResult = await this._doFetch(url, options, controller);
                                    if (!retryResult.response.ok) {
                                        throw new Error(this._extractError(retryResult.data));
                                    }
                                    return retryResult.data;
                                } catch (refreshErr) {
                                    this._clearAuth();
                                    if (this.onUnauthorized) this.onUnauthorized();
                                    throw new Error('登录已过期，请重新登录');
                                }
                            }
                            if (response.status === 401) {
                                if (skipAuthRefresh) {
                                    throw new Error(errorMsg || '认证失败');
                                }
                                this._clearAuth();
                                if (this.onUnauthorized) this.onUnauthorized();
                                throw new Error('登录已过期，请重新登录');
                            }
                            if (this.onError) this.onError(response.status, errorMsg);
                            throw new Error(errorMsg);
                        }

                        return data;
                    } catch (error) {
                        lastError = error;
                        if (error.name === 'AbortError') {
                            throw new Error('请求超时，请稍后重试');
                        }
                        if (error.message && error.message.includes('登录已过期')) {
                            throw error;
                        }
                        if (attempt < maxAttempts) {
                            const delay = Math.min(MAX_DELAY, BASE_DELAY * 2 ** (attempt - 1)) * (0.5 + Math.random() * 0.5);
                            await new Promise(r => setTimeout(r, delay));
                        }
                    }
                }
                throw lastError;
            } finally {
                clearTimeout(timeoutId);
                this.abortControllers.delete(requestId);
            }
        }

        get(url, params = {}) {
            const filtered = {};
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') filtered[k] = v;
            });
            const qs = new URLSearchParams(filtered).toString();
            return this.request(qs ? `${url}?${qs}` : url, { method: 'GET' });
        }

        post(url, data = {}, options = {}) {
            return this.request(url, { method: 'POST', body: JSON.stringify(data), ...options });
        }

        put(url, data = {}) {
            return this.request(url, { method: 'PUT', body: JSON.stringify(data) });
        }

        delete(url) {
            return this.request(url, { method: 'DELETE' });
        }

        upload(url, formData, options = {}) {
            const token = this._getToken();
            const headers = { ...(token && { 'Authorization': `Bearer ${token}` }), ...options.headers };
            return fetch(`${this.baseUrl}${url}`, {
                method: 'POST', body: formData, headers, ...options
            }).then(async (res) => {
                let data;
                const ct = res.headers.get('content-type') || '';
                if (ct.includes('application/json')) data = await res.json();
                else { const t = await res.text(); try { data = JSON.parse(t); } catch { data = { detail: t }; } }
                if (!res.ok) throw new Error(this._extractError(data));
                return data;
            });
        }

        cancel(url) {
            const keysToDelete = [];
            for (const [id, ctrl] of this.abortControllers) {
                if (id.includes(url)) { ctrl.abort(); keysToDelete.push(id); }
            }
            keysToDelete.forEach(id => this.abortControllers.delete(id));
        }

        async download(url, params = {}) {
            const qs = new URLSearchParams(params).toString();
            const fullUrl = qs ? `${url}?${qs}` : url;
            const token = this._getToken();
            const response = await fetch(`${this.baseUrl}${fullUrl}`, {
                headers: { ...(token && { 'Authorization': `Bearer ${token}` }) }
            });
            if (!response.ok) {
                const errorMsg = `下载失败 (${response.status})`;
                if (this.onError) this.onError(response.status, errorMsg);
                throw new Error(errorMsg);
            }
            return await response.blob();
        }

        createCrud(basePath) {
            return {
                create: (data) => this.post(basePath, data),
                list: (params) => this.get(basePath, params),
                get: (id) => this.get(`${basePath}/${id}`),
                update: (id, data) => this.put(`${basePath}/${id}`, data),
                delete: (id) => this.delete(`${basePath}/${id}`)
            };
        }

        logout() {
            this._clearAuth();
            if (this.onUnauthorized) this.onUnauthorized();
        }
    }

    window.NexusApi = NexusApi;
})();
