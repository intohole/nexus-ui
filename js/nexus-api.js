(function() {
    const H = window.NexusApiHelpers || {};
    const DEFAULT_BASE_URL = (window.PATH_PREFIX || '') + '/api';
    const MAX_RETRY = 3;
    const MAX_ABORT_CONTROLLERS = 500;
    const BASE_DELAY = 1000;
    const MAX_DELAY = 30000;
    const ApiError = window.NexusApiError || Error;

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
            this.serviceHeaders = config.serviceHeaders || null;
            this.headerBuilder = config.headers || null;
            this.cacheTtl = (config.cache && config.cache.ttl) || 0;
            this.cacheKeyHeaders = Array.isArray(config.cacheKeyHeaders) ? config.cacheKeyHeaders.map(function (h) { return String(h).toLowerCase(); }) : [];
            this.authEndpoints = Array.isArray(config.authEndpoints) ? config.authEndpoints : null;
            this.silentEndpoints = Array.isArray(config.silentEndpoints) ? config.silentEndpoints : null;
            this.errorToast = config.errorToast === true;
            this._cache = new Map();
            this._pendingGet = new Map();
            this.storage = config.dualStorage && window.NexusUtils && typeof window.NexusUtils.createDualStorage === 'function'
                ? window.NexusUtils.createDualStorage(this.tokenKey)
                : (config.storage || localStorage);
            this.abortControllers = new Map();
            this._requestCounter = 0;
            this._refreshPromise = null;
        }

        _generateRequestId(url) {
            this._requestCounter = (this._requestCounter + 1) % Number.MAX_SAFE_INTEGER;
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `${url}_${crypto.randomUUID()}`;
            return `${url}_${Date.now()}_${this._requestCounter}_${Math.random().toString(36).substring(2)}`;
        }

        _registerController(requestId, controller) {
            if (this.abortControllers.size >= MAX_ABORT_CONTROLLERS) {
                const oldestKey = this.abortControllers.keys().next().value;
                this.abortControllers.delete(oldestKey);
            }
            this.abortControllers.set(requestId, controller);
        }

        _handleSessionExpired() {
            this._clearAuth();
            this._rememberReturnUrl();
            this._notifySessionExpired();
            if (this.onUnauthorized) this.onUnauthorized();
        }

        _rememberReturnUrl() {
            try {
                var path = window.location.pathname || '';
                if (/\/(login|register)(\.html)?$/.test(path)) return;
                var target = path + (window.location.search || '') + (window.location.hash || '');
                window.sessionStorage.setItem('nux_return_url', target);
            } catch (e) {}
        }

        _notifySessionExpired() {
            var now = Date.now();
            if (this._sessionExpiredNotifiedAt && now - this._sessionExpiredNotifiedAt < 5000) return;
            this._sessionExpiredNotifiedAt = now;
            if (window.NexusUtils && typeof NexusUtils.showToast === 'function') {
                NexusUtils.showToast('登录已过期，请重新登录', 'error', { duration: 4000 });
            }
        }

        _buildHeaders(extra) {
            const token = this._getToken();
            const dynamic = this.headerBuilder ? (this.headerBuilder() || {}) : {};
            return {
                'Content-Type': 'application/json',
                ...(this.serviceHeaders || {}),
                ...dynamic,
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...extra
            };
        }

        async _doFetch(url, options, controller) {
            const response = await fetch(`${this.baseUrl}${url}`, {
                ...options, headers: this._buildHeaders(options.headers), signal: controller.signal
            });
            let data;
            const contentType = response.headers.get('content-type') || '';
            if (response.status === 204 || response.status === 304) {
                data = null;
            } else if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                try { data = JSON.parse(text); } catch { data = { detail: text }; }
            }
            if (this.responseAdapter && data !== null && data !== undefined) data = this.responseAdapter(data, response);
            return { response, data };
        }

        async request(url, options = {}) {
            const timeoutValue = options.timeout !== undefined ? options.timeout : this.timeout;

            const isIdempotent = !options.method || options.method === 'GET';
            const maxAttempts = isIdempotent ? this.maxRetry : 1;
            const skipAuthRefresh = options.skipAuthRefresh === true;
            let lastError;

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                const controller = new AbortController();
                const requestId = this._generateRequestId(url);
                this._registerController(requestId, controller);
                if (options.signal) {
                    if (options.signal.aborted) controller.abort();
                    else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
                }
                const timeoutId = setTimeout(() => controller.abort(), timeoutValue);
                try {
                    const { response, data } = await this._doFetch(url, options, controller);

                        if (!response.ok) {
                                const errorMsg = H.extractError(data);
                                const errorCode = H.extractErrorCode(data);
                                const skipUnauthorized = options.skipUnauthorized === true;
                                if (response.status === 401 && !skipUnauthorized && !skipAuthRefresh && this.refreshUrl && !this._isAuthEntry(url)) {
                                    try {
                                        await this._tryRefresh();
                                        const retryResult = await this._doFetch(url, options, controller);
                                        if (!retryResult.response.ok) {
                                            const retryMsg = H.extractError(retryResult.data);
                                            throw new ApiError(retryMsg, retryResult.response.status, retryResult.data, H.extractErrorCode(retryResult.data));
                                        }
                                        return retryResult.data;
                                    } catch (refreshErr) {
                                        if (refreshErr && refreshErr.status) throw refreshErr;
                                        // 网络瞬断/超时 ≠ 会话失效：保留 token 下次再试，只有服务端
                                        // 明确拒绝（refresh failed / no token / no config）才清会话登出
                                        const rmsg = (refreshErr && refreshErr.message) || '';
                                        const definiteReject = rmsg === 'refresh failed'
                                            || rmsg === 'no token in refresh response'
                                            || rmsg === 'no refresh config'
                                            || rmsg === 'shared refresh produced no token';
                                        if (definiteReject) {
                                            this._handleSessionExpired();
                                            throw new ApiError('登录已过期，请重新登录', 401, null);
                                        }
                                        throw new ApiError('登录状态刷新失败，请检查网络后重试', 401, null);
                                    }
                                }
                                if (response.status === 401) {
                                    const authEntry = this._isAuthEntry(url);
                                    const silentEntry = this._isSilentEntry(url);
                                    if (!skipUnauthorized && !authEntry && !silentEntry) {
                                        this._handleSessionExpired();
                                    }
                                    const keepServerMsg = skipUnauthorized || skipAuthRefresh || authEntry;
                                    const msg401 = keepServerMsg ? (errorMsg || '认证失败') : '登录已过期，请重新登录';
                                    throw new ApiError(msg401, 401, data, errorCode);
                                }
                                if (this._isSilentEntry(url)) {
                                    throw new ApiError(errorMsg, response.status, data, errorCode);
                                }
                                if (this.onError) {
                                    this.onError(response.status, errorMsg, url);
                                } else if (this.errorToast && window.NexusUtils && typeof NexusUtils.showToast === 'function') {
                                    try { NexusUtils.showToast(errorMsg, 'error'); } catch (e) {}
                                }
                                throw new ApiError(errorMsg, response.status, data, errorCode);
                            }

                        if (!isIdempotent && this._cache.size) this._cache.clear();
                        return data;
                    } catch (error) {
                        lastError = error;
                        if (error.name === 'AbortError') {
                            if (options.signal && options.signal.aborted) throw new ApiError('请求已取消', 499, null);
                            if (attempt < maxAttempts) {
                                const delay = Math.min(MAX_DELAY, BASE_DELAY * 2 ** (attempt - 1)) * (0.5 + Math.random() * 0.5);
                                await new Promise(r => setTimeout(r, delay));
                                continue;
                            }
                            throw new ApiError('请求超时，请稍后重试', 408, null);
                        }
                        if (H.isNetworkErr && H.isNetworkErr(error)) {
                            const e = new ApiError('网络连接失败，请检查网络后重试', null, null);
                            e.isNetwork = true; throw e;
                        }
                        if (error.name === 'NexusApiError' || (error.message && error.message.includes('登录已过期'))) throw error;
                        if (attempt < maxAttempts) {
                            const delay = Math.min(MAX_DELAY, BASE_DELAY * 2 ** (attempt - 1)) * (0.5 + Math.random() * 0.5);
                            await new Promise(r => setTimeout(r, delay));
                        }
                    } finally {
                        clearTimeout(timeoutId);
                        this.abortControllers.delete(requestId);
                    }
                }
                throw lastError;
        }

        get(url, params = {}, options = {}) {
            params = params || {};
            options = options || {};
            const filtered = {};
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') filtered[k] = v;
            });
            const qs = new URLSearchParams(filtered).toString();
            const fullUrl = qs ? `${url}?${qs}` : url;
            if (this.cacheTtl > 0 && !options.fresh && !options.skipCache) {
                return this._cached(this._cacheKey(fullUrl, options), () => this.request(fullUrl, { method: 'GET', ...options }));
            }
            return this.request(fullUrl, { method: 'GET', ...options });
        }

        _cacheKey(fullUrl, options) {
            if (!this.cacheKeyHeaders.length) return fullUrl;
            const h = this._buildHeaders(options.headers || {});
            const lower = {};
            Object.keys(h).forEach(function (k) { lower[k.toLowerCase()] = h[k]; });
            const scope = this.cacheKeyHeaders.map(function (k) { return k + '=' + (lower[k] === undefined || lower[k] === null ? '' : String(lower[k])); }).join('&');
            return `${fullUrl}\u0001${scope}`;
        }

        _cached(key, loader) {
            const hit = this._cache.get(key);
            if (hit && Date.now() - hit.at < this.cacheTtl) return Promise.resolve(hit.data);
            if (this._pendingGet.has(key)) return this._pendingGet.get(key);
            const pending = loader().then((data) => {
                if (this._cache.size >= 300) this._cache.delete(this._cache.keys().next().value);
                this._cache.set(key, { data, at: Date.now() });
                this._pendingGet.delete(key);
                return data;
            }).catch((err) => {
                this._pendingGet.delete(key);
                throw err;
            });
            this._pendingGet.set(key, pending);
            return pending;
        }

        invalidateCache(prefix) {
            if (!prefix) { this._cache.clear(); return; }
            for (const key of Array.from(this._cache.keys())) {
                if (key.includes(prefix)) this._cache.delete(key);
            }
        }

        post(url, data = {}, options = {}) {
            return this.request(url, { method: 'POST', body: JSON.stringify(data), ...options });
        }

        put(url, data = {}) {
            return this.request(url, { method: 'PUT', body: JSON.stringify(data) });
        }

        patch(url, data = {}) {
            return this.request(url, { method: 'PATCH', body: JSON.stringify(data) });
        }

        delete(url) {
            return this.request(url, { method: 'DELETE' });
        }

        upload(url, formData, options = {}) {
            const token = this._getToken();
            const dynamic = this.headerBuilder ? (this.headerBuilder() || {}) : {};
            const headers = { ...dynamic, ...(token && { 'Authorization': `Bearer ${token}` }), ...options.headers };
            const { headers: _mergedHeaders, ...fetchOptions } = options;
            return fetch(`${this.baseUrl}${url}`, { method: 'POST', body: formData, headers, ...fetchOptions })
            .then(async (res) => {
                let data; const ct = res.headers.get('content-type') || '';
                if (ct.includes('application/json')) data = await res.json();
                else { const t = await res.text(); try { data = JSON.parse(t); } catch { data = { detail: t }; } }
                if (res.status === 401) {
                    this._handleSessionExpired();
                }
                if (!res.ok) throw new ApiError(H.extractError(data), res.status, data, H.extractErrorCode(data));
                if (this.responseAdapter) data = this.responseAdapter(data, res);
                if (this._cache.size) this._cache.clear();
                return data;
            }).catch((err) => {
                if (err.name === 'NexusApiError') throw err;
                throw (H.isNetworkErr && H.isNetworkErr(err)) ? new ApiError('网络连接失败，请检查网络后重试', null, null) : new ApiError(err.message || '上传失败', null, null);
            });
        }

        cancel(url) {
            const keysToDelete = [];
            // requestId 形如 `${url}_${uuid}`：按 url 前缀+分隔符精确匹配同 URL 的在途请求，
            // 避免纯子串匹配把 /api/chat-history 误伤进 cancel('/api/chat')
            const prefix = String(url) + '_';
            for (const [id, ctrl] of this.abortControllers) {
                if (id === url || id.startsWith(prefix)) { ctrl.abort(); keysToDelete.push(id); }
            }
            keysToDelete.forEach(id => this.abortControllers.delete(id));
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

        crud(resource, options = {}) {
            const factory = window.createNexusCrud;
            if (typeof factory !== 'function') {
                return this.createCrud(resource);
            }
            return factory({
                api: this,
                basePath: resource,
                idField: options.idField || 'id',
                paramNames: options.paramNames,
                listAdapter: options.listAdapter,
                itemAdapter: options.itemAdapter,
                idPathParam: options.idPathParam
            });
        }

        uploadFile(url, file, options = {}) {
            const formData = new FormData();
            const fieldName = options.fieldName || 'file';
            if (file instanceof File || file instanceof Blob) {
                formData.append(fieldName, file, options.filename || file.name || 'blob');
            } else {
                throw new Error('uploadFile: file must be a File or Blob');
            }
            if (options.fields && typeof options.fields === 'object') {
                Object.entries(options.fields).forEach(([k, v]) => formData.append(k, v));
            }
            return this.upload(url, formData, { headers: options.headers || {} });
        }

        logout() {
            this._clearAuth();
            try { window.NexusUtils && window.NexusUtils.markSsoLogout && window.NexusUtils.markSsoLogout(); } catch (e) {}
            if (this.onUnauthorized) this.onUnauthorized();
        }
    }

    // 支撑层装配（token 存储/刷新单飞/鉴权端点判定/streamPost/download）——见 nexus-api-helpers.js
    if (H.methods) Object.assign(NexusApi.prototype, H.methods);

    window.NexusApi = NexusApi;
})();
