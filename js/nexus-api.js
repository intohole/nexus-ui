(function() {
    const DEFAULT_BASE_URL = (window.PATH_PREFIX || '') + '/api';
    const MAX_RETRY = 3;
    const MAX_ABORT_CONTROLLERS = 500;
    const BASE_DELAY = 1000;
    const MAX_DELAY = 30000;
    const ApiError = window.NexusApiError || Error;
    const NET_PATTERNS = ['Failed to fetch', 'NetworkError', 'Network request failed', 'Load failed'];

    function _isNetworkErr(err) {
        if (!err) return false;
        if (err.isNetwork === true) return true;
        const msg = err.message || '';
        return NET_PATTERNS.some(p => msg.includes(p));
    }

    function _errMsg(v) {
        if (window.NexusUtils && NexusUtils.errorDetailText) return NexusUtils.errorDetailText(v);
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v;
        if (Array.isArray(v)) return v.join('；');
        if (typeof v === 'object') return v.message || v.detail || v.msg || v.error || '';
        return String(v);
    }

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
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                try { data = JSON.parse(text); } catch { data = { detail: text }; }
            }
            if (this.responseAdapter) data = this.responseAdapter(data, response);
            return { response, data };
        }

        _extractError(data) {
            if (data.success === false) return _errMsg(data.message) || _errMsg(data.error) || '操作失败';
            if (data.error) return _errMsg(data.error);
            if (data.message) return _errMsg(data.message);
            if (data.detail) return _errMsg(data.detail);
            return '请求失败';
        }

        _extractErrorCode(data) {
            if (!data || typeof data !== 'object') return null;
            const code = data.error_code || data.errorCode || data.code;
            if (code == null) return null;
            return typeof code === 'string' ? code : String(code);
        }

        async _tryRefresh() {
            if (this._refreshPromise) return this._refreshPromise;
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
            return this._refreshPromise;
        }

        ensureFreshToken(skewMs = 120000) {
            const token = this._getToken();
            if (!token || token.split('.').length < 2 || !this.refreshUrl) return Promise.resolve();
            try {
                const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
                const expMs = (payload.exp || 0) * 1000;
                if (expMs && Date.now() > expMs - skewMs) return this._tryRefresh().catch(() => {});
            } catch (e) {}
            return Promise.resolve();
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
                                const errorMsg = this._extractError(data);
                                const errorCode = this._extractErrorCode(data);
                                const skipUnauthorized = options.skipUnauthorized === true;
                                if (response.status === 401 && !skipUnauthorized && !skipAuthRefresh && this.refreshUrl) {
                                    try {
                                        await this._tryRefresh();
                                        const retryResult = await this._doFetch(url, options, controller);
                                        if (!retryResult.response.ok) {
                                            const retryMsg = this._extractError(retryResult.data);
                                            throw new ApiError(retryMsg, retryResult.response.status, retryResult.data, this._extractErrorCode(retryResult.data));
                                        }
                                        return retryResult.data;
                                    } catch (refreshErr) {
                                        if (refreshErr && refreshErr.status) throw refreshErr;
                                        this._handleSessionExpired();
                                        throw new ApiError('登录已过期，请重新登录', 401, null);
                                    }
                                }
                                if (response.status === 401) {
                                    if (!skipUnauthorized) {
                                        this._handleSessionExpired();
                                    }
                                    const msg401 = skipUnauthorized ? (errorMsg || '认证失败') : (skipAuthRefresh ? (errorMsg || '认证失败') : '登录已过期，请重新登录');
                                    throw new ApiError(msg401, 401, data, errorCode);
                                }
                                if (this.onError) this.onError(response.status, errorMsg);
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
                        if (_isNetworkErr(error)) {
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
            const filtered = {};
            Object.entries(params).forEach(([k, v]) => {
                if (v !== undefined && v !== null && v !== '') filtered[k] = v;
            });
            const qs = new URLSearchParams(filtered).toString();
            const fullUrl = qs ? `${url}?${qs}` : url;
            if (this.cacheTtl > 0 && !options.fresh && !options.skipCache) {
                return this._cached(fullUrl, () => this.request(fullUrl, { method: 'GET', ...options }));
            }
            return this.request(fullUrl, { method: 'GET', ...options });
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
                if (!res.ok) throw new ApiError(this._extractError(data), res.status, data, this._extractErrorCode(data));
                if (this.responseAdapter) data = this.responseAdapter(data, res);
                if (this._cache.size) this._cache.clear();
                return data;
            }).catch((err) => {
                if (err.name === 'NexusApiError') throw err;
                throw _isNetworkErr(err) ? new ApiError('网络连接失败，请检查网络后重试', null, null) : new ApiError(err.message || '上传失败', null, null);
            });
        }

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
                            const detail = this._extractError(errData);
                            if (detail) msg = detail;
                            code = this._extractErrorCode(errData);
                        } catch (e) { }
                    }
                    if (this.onError) this.onError(error.status, msg);
                } else if (error && (error.code === 'timeout' || error.name === 'AbortError')) {
                    msg = '连接超时，请检查网络后重试';
                } else if (_isNetworkErr(error)) {
                    msg = '网络连接失败，请检查网络后重试';
                }
                if (onError) onError(msg, code);
            } finally {
                this.abortControllers.delete(requestId);
            }
        }

        cancel(url) {
            const keysToDelete = [];
            for (const [id, ctrl] of this.abortControllers) {
                if (id.includes(url)) { ctrl.abort(); keysToDelete.push(id); }
            }
            keysToDelete.forEach(id => this.abortControllers.delete(id));
        }

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
                throw _isNetworkErr(err) ? new ApiError('网络连接失败，请检查网络后重试', null, null) : new ApiError(err.message || '下载失败', null, null);
            } finally {
                if (timeoutId) clearTimeout(timeoutId);
            }
            if (!response.ok) {
                let errData;
                try { errData = await response.json(); } catch { errData = {}; }
                if (response.status === 401) {
                    this._handleSessionExpired();
                }
                const errorMsg = this._extractError(errData) || `下载失败 (${response.status})`;
                if (this.onError) this.onError(response.status, errorMsg);
                throw new ApiError(errorMsg, response.status, errData, this._extractErrorCode(errData));
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

    window.NexusApi = NexusApi;
})();
