/* nexus-utils auth —— nexus-utils.js 聚合入口的本体模块（由 build_all.py 拼接），直引入口或随 nexus-all 加载 */
(function() {
    const SSO_COOKIE_DOMAIN = '.songguokr.com';
    const SSO_LOGOUT_COOKIE = 'uc_sso_logout';
    const SSO_LOGOUT_MAX_AGE = 30 * 24 * 3600;
    const SSO_EPOCH_KEY = 'uc_session_epoch';
    const utils = window.NexusUtils = window.NexusUtils || {};
    Object.assign(utils, {
        ssoCookieDomain() {
            try {
                const host = window.location.hostname || '';
                if (host === 'localhost' || host === '127.0.0.1') return null;
                return (host === 'songguokr.com' || host.endsWith('.songguokr.com')) ? SSO_COOKIE_DOMAIN : null;
            } catch (e) { return null; }
        },

        markSsoLogout() {
            try { window.localStorage.removeItem(SSO_EPOCH_KEY); } catch (e) {}
            if (!utils.ssoCookieDomain()) return;
            try {
                document.cookie = SSO_LOGOUT_COOKIE + '=' + Date.now() +
                    ';Domain=' + SSO_COOKIE_DOMAIN + ';Path=/;Max-Age=' + SSO_LOGOUT_MAX_AGE + ';SameSite=Lax';
            } catch (e) {}
        },

        ssoLogoutPending() {
            if (!utils.ssoCookieDomain()) return false;
            try {
                const epoch = window.localStorage.getItem(SSO_EPOCH_KEY);
                if (!epoch) return false;
                const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + SSO_LOGOUT_COOKIE + '=(\\d+)'));
                if (!m) return false;
                return parseInt(m[1], 10) > parseInt(epoch, 10);
            } catch (e) { return false; }
        },

        ssoSessionGuard() {
            if (!utils.ssoLogoutPending()) return false;
            utils.clearAuthState();
            return true;
        },

        createDualStorage(tokenKey = 'uc_access_token') {
            const read = (s, k) => { try { return s.getItem(k); } catch (e) { return null; } };
            const write = (s, k, v) => { try { s.setItem(k, v); } catch (e) {} };
            const clear = (s, k) => { try { s.removeItem(k); } catch (e) {} };
            const preferSession = () => read(window.sessionStorage, tokenKey) !== null;
            const SSO_COOKIE = 'uc_sso_token';
            const BRIDGE_KEYS = ['uc_access_token', 'uc_refresh_token', 'uc_token_expires_at'];
            const ssoDomain = () => utils.ssoCookieDomain();
            const readStorage = (key) => {
                const v = read(window.sessionStorage, key);
                if (v !== null) return v;
                return read(window.localStorage, key);
            };
            const readBridge = () => {
                const domain = ssoDomain();
                if (!domain) return null;
                try {
                    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + SSO_COOKIE + '=([^;]+)'));
                    if (!m) return null;
                    const data = JSON.parse(decodeURIComponent(m[1]));
                    return data && data.a ? data : null;
                } catch (e) { return null; }
            };
            const bridgeValue = (key) => {
                const data = readBridge();
                if (!data) return null;
                if (key === 'uc_access_token') return data.a;
                if (key === 'uc_refresh_token') return data.r;
                if (key === 'uc_token_expires_at') return data.e !== undefined && data.e !== null ? String(data.e) : null;
                return null;
            };
            const writeBridge = () => {
                const domain = ssoDomain();
                if (!domain) return;
                const access = readStorage('uc_access_token');
                if (!access) return;
                const refresh = readStorage('uc_refresh_token');
                const expires = readStorage('uc_token_expires_at');
                const payload = encodeURIComponent(JSON.stringify({ a: access, r: refresh, e: expires ? parseInt(expires) : null }));
                const maxAge = preferSession() ? '' : ';Max-Age=' + (30 * 24 * 3600);
                try {
                    document.cookie = SSO_COOKIE + '=' + payload + ';Domain=' + domain + ';Path=/;SameSite=Lax' + maxAge;
                } catch (e) {}
            };
            const clearBridge = () => {
                const domain = ssoDomain();
                if (!domain) return;
                try {
                    document.cookie = SSO_COOKIE + '=;Domain=' + domain + ';Path=/;Max-Age=0';
                } catch (e) {}
            };
            const resolveKey = (key) => (key === undefined || key === null ? tokenKey : key);
            return {
                getItem(key) {
                    const k = resolveKey(key);
                    const v = readStorage(k);
                    if (v !== null) return v;
                    return BRIDGE_KEYS.indexOf(k) !== -1 ? bridgeValue(k) : null;
                },
                setItem(key, value) {
                    const k = resolveKey(key);
                    const useSession = preferSession();
                    write(useSession ? window.sessionStorage : window.localStorage, k, value);
                    clear(useSession ? window.localStorage : window.sessionStorage, k);
                    if (k === tokenKey && value) {
                        try { window.localStorage.setItem(SSO_EPOCH_KEY, String(Date.now())); } catch (e) {}
                    }
                    if (BRIDGE_KEYS.indexOf(k) !== -1) writeBridge();
                },
                removeItem(key) {
                    const k = resolveKey(key);
                    clear(window.sessionStorage, k);
                    clear(window.localStorage, k);
                    if (BRIDGE_KEYS.indexOf(k) !== -1) clearBridge();
                }
            };
        },

        authToken() {
            return utils.createDualStorage('uc_access_token').getItem() || '';
        },

        clearAuthState() {
            try {
                const ds = utils.createDualStorage('uc_access_token');
                ['uc_access_token', 'uc_refresh_token', 'uc_token_expires_at'].forEach((k) => ds.removeItem(k));
            } catch (e) {}
            try { window.localStorage.removeItem(SSO_EPOCH_KEY); } catch (e) {}
            try { window.dispatchEvent(new CustomEvent('uc:authchange', { detail: { authenticated: false } })); } catch (e) {}
        },

        consumeReturnUrl() {
            try {
                const v = window.sessionStorage.getItem('nux_return_url');
                if (v) window.sessionStorage.removeItem('nux_return_url');
                return v;
            } catch (e) { return null; }
        },

        handleUnauthorized(opts = {}) {
            utils.clearAuthState();
            const msg = opts.message || '登录已过期，请重新登录';
            utils.showToast(msg, 'error');
            const redirect = opts.redirect || utils.consumeReturnUrl() || window.location.pathname + window.location.search;
            setTimeout(() => {
                const target = '/login.html?redirect=' + encodeURIComponent('/' + String(redirect).replace(/^\/+/, ''));
                window.location.href = target;
            }, opts.delay || 1200);
        }
    });
})();
