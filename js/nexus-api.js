(function() {
    const DEFAULT_BASE_URL = (window.PATH_PREFIX || '') + '/api';
    const MAX_RETRY = 3;
    const MAX_ABORT_CONTROLLERS = 100;
    const BASE_DELAY = 1000;
    const MAX_DELAY = 30000;

    class NexusApi {
        constructor(config = {}) {
            this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
            this.maxRetry = config.maxRetry || MAX_RETRY;
            this.tokenKey = config.tokenKey || 'token';
            this.userKey = config.userKey || 'user';
            this.onUnauthorized = config.onUnauthorized || null;
            this.timeout = config.timeout || 30000;
            this.responseAdapter = config.responseAdapter || null;
            this.abortControllers = new Map();
            this._requestCounter = 0;
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

        async request(url, options = {}) {
            const controller = new AbortController();
            const requestId = this._generateRequestId(url);
            this._registerController(requestId, controller);

            const timeoutValue = options.timeout !== undefined ? options.timeout : this.timeout;
            const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

            const token = localStorage.getItem(this.tokenKey);
            const headers = {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            };

            const isIdempotent = !options.method || options.method === 'GET';
            const maxAttempts = isIdempotent ? this.maxRetry : 1;
            let lastError;

            try {
                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        const response = await fetch(`${this.baseUrl}${url}`, {
                            ...options, headers,
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

                        if (!response.ok) {
                            const errorMsg = this._extractError(data);
                            if (response.status === 401) {
                                localStorage.removeItem(this.tokenKey);
                                localStorage.removeItem(this.userKey);
                                if (this.onUnauthorized) this.onUnauthorized();
                                throw new Error('登录已过期，请重新登录');
                            }
                            throw new Error(errorMsg);
                        }

                        return data;
                    } catch (error) {
                        lastError = error;
                        if (error.name === 'AbortError') {
                            throw new Error('请求超时，请稍后重试');
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

        _extractError(data) {
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

        get(url, params = {}) {
            const qs = new URLSearchParams(params).toString();
            return this.request(qs ? `${url}?${qs}` : url, { method: 'GET' });
        }

        post(url, data = {}) {
            return this.request(url, { method: 'POST', body: JSON.stringify(data) });
        }

        put(url, data = {}) {
            return this.request(url, { method: 'PUT', body: JSON.stringify(data) });
        }

        delete(url) {
            return this.request(url, { method: 'DELETE' });
        }

        cancel(url) {
            const keysToDelete = [];
            for (const [id, ctrl] of this.abortControllers) {
                if (id.includes(url)) { ctrl.abort(); keysToDelete.push(id); }
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
    }

    window.NexusApi = NexusApi;
})();
