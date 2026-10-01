(function() {
    if (!window.NexusApi) return;
    const ApiError = window.NexusApiError || Error;

    const UNWRAP_PRESETS = {
        raw: null,
        code200: function(data, response) {
            if (response && !response.ok) return data;
            if (data && typeof data === 'object' && 'code' in data) {
                if (data.code === 200) return data.data;
                throw new ApiError(data.message || data.detail || data.error || '操作失败', (response && response.status) || null, data, String(data.code));
            }
            return (data && typeof data === 'object' && 'data' in data) ? data.data : data;
        },
        dataOrRes: function(data) {
            return (data && typeof data === 'object' && 'data' in data) ? data.data : data;
        }
    };

    function buildUnauthorized(spec) {
        if (typeof spec === 'function') return spec;
        const clearKeys = spec.clearKeys || [];
        const event = spec.event || null;
        const redirect = spec.redirect || null;
        return function() {
            clearKeys.forEach((k) => {
                try { localStorage.removeItem(k); } catch (e) {}
                try { sessionStorage.removeItem(k); } catch (e) {}
            });
            if (event) { try { window.dispatchEvent(new CustomEvent(event)); } catch (e) {} }
            if (redirect) { try { window.location.href = redirect; } catch (e) {} }
        };
    }

    function applyMethods(api, methods) {
        if (!methods) return api;
        Object.keys(methods).forEach((name) => {
            const def = methods[name];
            if (typeof def === 'function') {
                api[name] = function(...args) { return def.apply(api, args); };
                return;
            }
            if (!Array.isArray(def)) return;
            const verb = String(def[0] || 'GET').toUpperCase();
            const url = def[1];
            if (verb === 'GET') api[name] = (params, options) => api.get(url, params, options);
            else if (verb === 'POST') api[name] = (data, options) => api.post(url, data, options);
            else if (verb === 'PUT') api[name] = (data) => api.put(url, data);
            else if (verb === 'PATCH') api[name] = (data) => api.patch(url, data);
            else if (verb === 'DELETE') api[name] = () => api.delete(url);
            else api[name] = (options) => api.request(url, { method: verb, ...options });
        });
        return api;
    }

    NexusApi.create = function(config = {}) {
        const opts = { ...config };
        const unwrap = opts.unwrap;
        delete opts.unwrap;
        if (typeof unwrap === 'function') {
            opts.responseAdapter = unwrap;
        } else if (unwrap !== undefined) {
            if (!(unwrap in UNWRAP_PRESETS)) throw new Error(`[NexusApi.create] Unknown unwrap preset: ${unwrap}`);
            if (UNWRAP_PRESETS[unwrap]) opts.responseAdapter = UNWRAP_PRESETS[unwrap];
        }
        if (opts.unauthorized) {
            opts.onUnauthorized = buildUnauthorized(opts.unauthorized);
            delete opts.unauthorized;
        }
        const methods = opts.methods;
        delete opts.methods;
        const api = new NexusApi(opts);
        return applyMethods(api, methods);
    };
})();
