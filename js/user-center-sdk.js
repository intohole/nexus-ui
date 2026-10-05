(function() {
const TOKEN_KEY = 'uc_access_token';
const REFRESH_KEY = 'uc_refresh_token';
const EXPIRES_KEY = 'uc_token_expires_at';
const LEGACY_KEYS = [
    ['siwu_uc_access_token', 'siwu_uc_refresh_token', 'siwu_uc_token_expires_at'],
    ['uc_token', 'uc_refresh_token', 'uc_token_expires_at'],
    ['ucToken', 'ucRefreshToken', 'ucTokenExpiresAt']
];

function storageOf(rememberMe) {
    try {
        return rememberMe ? window.localStorage : window.sessionStorage;
    } catch (e) {
        return window.localStorage;
    }
}

function getStored(key) {
    try {
        const s = window.sessionStorage ? window.sessionStorage.getItem(key) : null;
        if (s) return s;
    } catch (e) {}
    try {
        return window.localStorage ? window.localStorage.getItem(key) : null;
    } catch (e) {
        return null;
    }
}

function setStored(key, value, rememberMe) {
    const s = storageOf(rememberMe);
    try { s.setItem(key, value); } catch (e) {}
    try {
        const other = rememberMe ? window.sessionStorage : window.localStorage;
        if (other) other.removeItem(key);
    } catch (e) {}
}

function removeStored(key) {
    try { window.localStorage && window.localStorage.removeItem(key); } catch (e) {}
    try { window.sessionStorage && window.sessionStorage.removeItem(key); } catch (e) {}
}

function persistedIn() {
    try {
        if (window.sessionStorage && window.sessionStorage.getItem(TOKEN_KEY)) return 'session';
    } catch (e) {}
    try {
        if (window.localStorage && window.localStorage.getItem(TOKEN_KEY)) return 'local';
    } catch (e) {}
    return null;
}

const SSO_COOKIE = 'uc_sso_token';
const SSO_ROOT = 'songguokr.com';

// SDK 自有错误（error.detail）未覆盖状态码时的文案兜底：优先走 nexus-api-error.js 的
// mapHttpError 统一映射，缺失或未命中时保持原样（`HTTP xxx`），不改变既有行为。
function friendlyHttpText(status) {
    const fallback = `HTTP ${status}`;
    try {
        if (typeof window.mapHttpError === 'function') {
            const Ctor = typeof window.NexusApiError === 'function' ? window.NexusApiError : null;
            const err = Ctor ? new Ctor(fallback, status) : { name: 'NexusApiError', status: status, message: fallback };
            const text = window.mapHttpError(err);
            if (text && text !== fallback) return text;
        }
    } catch (e) { /* ignore */ }
    return fallback;
}

function ssoCookieDomain() {
    try {
        const host = window.location.hostname || '';
        if (host === 'localhost' || host === '127.0.0.1') return null;
        return host === SSO_ROOT || host.endsWith('.' + SSO_ROOT) ? '.' + SSO_ROOT : null;
    } catch (e) {
        return null;
    }
}

function readCookieBridge() {
    const domain = ssoCookieDomain();
    if (!domain) return null;
    try {
        const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + SSO_COOKIE + '=([^;]+)'));
        if (!m) return null;
        const data = JSON.parse(decodeURIComponent(m[1]));
        return data && data.a ? data : null;
    } catch (e) {
        return null;
    }
}

function writeCookieBridge(tokens, rememberMe) {
    const domain = ssoCookieDomain();
    if (!domain || !tokens || !tokens.a) return;
    const payload = encodeURIComponent(JSON.stringify({ a: tokens.a, r: tokens.r, e: tokens.e }));
    const maxAge = rememberMe !== false ? ';Max-Age=' + (30 * 24 * 3600) : '';
    try {
        document.cookie = SSO_COOKIE + '=' + payload + ';Domain=' + domain + ';Path=/;SameSite=Lax' + maxAge;
    } catch (e) {}
}

function clearCookieBridge() {
    const domain = ssoCookieDomain();
    if (!domain) return;
    try {
        document.cookie = SSO_COOKIE + '=;Domain=' + domain + ';Path=/;Max-Age=0';
    } catch (e) {}
}

class UserCenterSDK {
    constructor(config) {
        this.baseUrl = (config.baseUrl || '').replace(/^https?:\/\//, '//').replace(/\/+$/, '');
        this.appKey = config.appKey;
        this.timeout = config.timeout || 30000;
        this._accessToken = null;
        this._refreshToken = null;
        this._tokenExpiresAt = null;
        this._refreshPromise = null;
        this._onTokenUpdate = config.onTokenUpdate || null;
        this._onAuthError = config.onAuthError || null;
        this._loadPersistedTokens();
        if (!window.ucSDK && !config.silent && this.baseUrl) {
            window.ucSDK = this;
        }
    }

    get isConfigured() { return !!this.baseUrl; }

    static initFromConfig(config) {
        return new UserCenterSDK({ baseUrl: config.baseUrl, appKey: config.appKey });
    }

    _migrateLegacyTokens() {
        for (const [oldAccess, oldRefresh, oldExpires] of LEGACY_KEYS) {
            const access = getStored(oldAccess);
            if (access && !this._accessToken) {
                this._accessToken = access;
                this._refreshToken = getStored(oldRefresh);
                const exp = getStored(oldExpires);
                this._tokenExpiresAt = exp ? parseInt(exp) : null;
                removeStored(oldAccess);
                removeStored(oldRefresh);
                removeStored(oldExpires);
            }
        }
        if (this._accessToken) {
            this._persistTokens(true);
        }
    }

    _loadPersistedTokens() {
        try {
            this._accessToken = getStored(TOKEN_KEY);
            this._refreshToken = getStored(REFRESH_KEY);
            const expiresAt = getStored(EXPIRES_KEY);
            this._tokenExpiresAt = expiresAt ? parseInt(expiresAt) : null;
            if (!this._accessToken) {
                this._migrateLegacyTokens();
            }
            if (!this._accessToken) {
                const bridge = readCookieBridge();
                if (bridge && bridge.a) {
                    this._accessToken = bridge.a;
                    this._refreshToken = bridge.r || null;
                    this._tokenExpiresAt = bridge.e ? parseInt(bridge.e) : null;
                    this._persistTokens(true);
                }
            }
        } catch (e) {}
    }

    _persistTokens(rememberMe) {
        try {
            const keep = rememberMe !== false;
            if (this._accessToken) {
                setStored(TOKEN_KEY, this._accessToken, keep);
            } else {
                removeStored(TOKEN_KEY);
            }
            if (this._refreshToken) {
                setStored(REFRESH_KEY, this._refreshToken, keep);
            } else {
                removeStored(REFRESH_KEY);
            }
            if (this._tokenExpiresAt) {
                setStored(EXPIRES_KEY, String(this._tokenExpiresAt), keep);
            } else {
                removeStored(EXPIRES_KEY);
            }
            if (this._accessToken) {
                writeCookieBridge({ a: this._accessToken, r: this._refreshToken, e: this._tokenExpiresAt }, keep);
                try { window.localStorage.setItem('uc_session_epoch', String(Date.now())); } catch (e) {}
            } else {
                clearCookieBridge();
            }
        } catch (e) {}
    }

    _emitAuthChange() {
        try {
            window.dispatchEvent(new CustomEvent('uc:authchange', { detail: { authenticated: !!this._accessToken } }));
        } catch (e) {}
    }

    _setTokens(data, rememberMe) {
        this._accessToken = data.access_token;
        this._refreshToken = data.refresh_token || this._refreshToken;
        this._tokenExpiresAt = data.expires_in
            ? Date.now() + data.expires_in * 1000
            : null;
        this._persistTokens(rememberMe);
        this._emitAuthChange();
        if (this._onTokenUpdate) {
            this._onTokenUpdate({
                access_token: this._accessToken,
                refresh_token: this._refreshToken,
                expires_in: data.expires_in
            });
        }
    }

    setTokens(data, rememberMe) {
        this._setTokens(data, rememberMe);
    }

    syncFromStorage() {
        try {
            var t = getStored(TOKEN_KEY);
            if (t && t !== this._accessToken) this._accessToken = t;
            var r = getStored(REFRESH_KEY);
            if (r) this._refreshToken = r;
        } catch (e) {}
    }

    // 只清内存态，不动存储/cookie 桥（供他页登出的 storage 事件同步用；登出方自己清存储）
    forgetTokens() {
        this._accessToken = null;
        this._refreshToken = null;
        this._tokenExpiresAt = null;
    }

    getToken() { this.syncFromStorage(); return this._accessToken; }
    getRefreshToken() { this.syncFromStorage(); return this._refreshToken; }
    isAuthenticated() { this.syncFromStorage(); return !!this._accessToken; }

    isTokenExpiringSoon(bufferSeconds = 60) {
        if (!this._tokenExpiresAt) return false;
        return Date.now() > (this._tokenExpiresAt - bufferSeconds * 1000);
    }

    clearTokens() {
        this._accessToken = null;
        this._refreshToken = null;
        this._tokenExpiresAt = null;
        this._persistTokens(true);
        this._emitAuthChange();
    }

    async _request(method, path, data = null, requireAuth = true, skipRefresh = false) {
        if (requireAuth && this.isTokenExpiringSoon() && !skipRefresh) {
            await this.refreshAccessToken();
        }
        const url = `${this.baseUrl}${path}`;
        const headers = { 'Content-Type': 'application/json' };
        if (requireAuth && this._accessToken) {
            headers['Authorization'] = `Bearer ${this._accessToken}`;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        const options = { method, headers, signal: controller.signal };
        if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
            options.body = JSON.stringify(data);
        }
        try {
            const response = await fetch(url, options);
            if (response.status === 401 && requireAuth && this._refreshToken && !skipRefresh) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    return this._request(method, path, data, requireAuth, true);
                }
            }
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: response.statusText }));
                if (response.status === 401 && this._onAuthError) {
                    this._onAuthError(error);
                }
                const detailText = (window.NexusUtils && NexusUtils.errorDetailText)
                    ? (NexusUtils.errorDetailText(error.detail) || NexusUtils.errorDetailText(error.message))
                    : '';
                throw new Error(detailText || friendlyHttpText(response.status));
            }
            return response.json();
        } catch (e) {
            if (e.name === 'AbortError') {
                throw new Error('请求超时，请稍后重试');
            }
            throw e;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    async login(username, password, inviteCode = null, captcha = null, rememberMe = true) {
        const data = { username, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        if (captcha) { data.captcha_id = captcha.captchaId; data.captcha_code = captcha.captchaCode; }
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data, rememberMe); }
        return result;
    }

    async loginWithEmail(email, password, inviteCode = null, captcha = null, rememberMe = true) {
        const data = { email, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        if (captcha) { data.captcha_id = captcha.captchaId; data.captcha_code = captcha.captchaCode; }
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data, rememberMe); }
        return result;
    }

    async loginWithPhone(phone, password, inviteCode = null, captcha = null, rememberMe = true) {
        const data = { phone, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        if (captcha) { data.captcha_id = captcha.captchaId; data.captcha_code = captcha.captchaCode; }
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data, rememberMe); }
        return result;
    }

    async register({ username, password, email = null, phone = null, inviteCode = null, captcha = null }) {
        const data = { password, app_key: this.appKey };
        if (username) data.username = username;
        if (email) data.email = email;
        if (phone) data.phone = phone;
        if (inviteCode) data.invite_code = inviteCode;
        try {
            const ref = new URLSearchParams(window.location.search).get('ref');
            if (ref) data.ref_code = ref;
        } catch (e) {}
        if (captcha) { data.captcha_id = captcha.captchaId; data.captcha_code = captcha.captchaCode; }
        const result = await this._request('POST', '/api/auth/register', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
        return result;
    }

    async refreshAccessToken() {
        if (!this._refreshToken) return false;
        if (this._refreshPromise) return this._refreshPromise;
        var self = this;
        // 全局刷新单飞：与 NexusApi._tryRefresh 共享在途请求。UC 的 refresh token
        // 轮换+重用检测会把并发的第二次刷新判为盗用并吊销整个 token 家族
        // （用户被随机登出），两条刷新链必须互认；复用方在落定后重读存储同步新 token。
        var inflight = window.__ucTokenRefresh;
        if (inflight && inflight.then) {
            this._refreshPromise = Promise.resolve(inflight).catch(function () {}).then(function () {
                self.syncFromStorage();
                return !!self._accessToken;
            });
            try {
                return await this._refreshPromise;
            } finally {
                this._refreshPromise = null;
            }
        }
        this._refreshPromise = (async () => {
            try {
                const result = await this._request('POST', '/api/auth/refresh', {
                    refresh_token: this._refreshToken
                }, false, true);
                if (result.success && result.data) {
                    this._setTokens(result.data, persistedIn() !== 'session');
                    return true;
                }
                return false;
            } catch (e) {
                // 网络瞬断/超时 ≠ 会话失效：保留 refresh token 下次再试，
                // 只有服务端明确拒绝（这里不抛异常的 4xx 路径）才清会话
                var msg = String((e && e.message) || '');
                var transient = e && (e.name === 'AbortError' || e instanceof TypeError)
                    || msg === '请求超时，请稍后重试' || msg === 'Failed to fetch' || msg === 'NetworkError when attempting to fetch resource.';
                if (!transient) this.clearTokens();
                return false;
            }
        })();
        var guard = this._refreshPromise.catch(function () { return false; });
        window.__ucTokenRefresh = guard;
        guard.then(function () {
            if (window.__ucTokenRefresh === guard) window.__ucTokenRefresh = null;
        });
        try {
            return await this._refreshPromise;
        } finally {
            this._refreshPromise = null;
        }
    }

    async logout() {
        try {
            await this._request('POST', '/api/auth/logout', null, true, true);
        } catch (e) {}
        this.clearTokens();
        try { window.NexusUtils && window.NexusUtils.markSsoLogout && window.NexusUtils.markSsoLogout(); } catch (e) {}
        try { localStorage.removeItem('nux_remembered_identifier'); } catch (e) {}
    }

    async clientCredentials() {
        const result = await this._request('POST', '/api/auth/token', {
            grant_type: 'client_credentials',
            app_key: this.appKey,
        }, false);
        if (result.success && result.data) {
            this._accessToken = result.data.access_token;
            this._tokenExpiresAt = result.data.expires_in
                ? Date.now() + result.data.expires_in * 1000 : null;
            this._persistTokens();
        }
        return result;
    }

    async verifyToken(token, permission = null) {
        const data = { token: token || this._accessToken };
        if (permission) data.permission = permission;
        return this._request('POST', '/api/auth/token/validate', data, false);
    }

    async checkPermission(token, permission) {
        return this._request('POST', '/api/auth/check-permission', { token, permission }, false);
    }

    async getLoginPageConfig(appKey = null) {
        const key = appKey || this.appKey;
        return this._request('GET', `/api/auth/login-page-config?app_key=${key}`, null, false);
    }

    async getCurrentUser() { return this._request('GET', '/api/users/me'); }
    async getUserinfo() { return this._request('GET', '/api/auth/userinfo'); }
    async updateCurrentUser(updateData) { return this._request('PUT', '/api/users/me', updateData); }

    async getFavorites(itemType = 'app') { return this._request('GET', `/api/users/me/favorites?item_type=${itemType}`); }
    async addFavorite(itemKey, itemType = 'app') {
        return this._request('POST', '/api/users/me/favorites', { item_type: itemType, item_key: itemKey });
    }
    async removeFavorite(itemKey, itemType = 'app') {
        return this._request('DELETE', `/api/users/me/favorites/${encodeURIComponent(itemKey)}?item_type=${itemType}`);
    }

    async changePassword({ oldPassword, newPassword, revokeOthers = true }) {
        return this._request('POST', '/api/auth/change-password', {
            old_password: oldPassword,
            new_password: newPassword,
            revoke_others: revokeOthers
        });
    }

    async forgotPassword({ email = null, phone = null }) {
        const data = {};
        if (email) data.email = email;
        if (phone) data.phone = phone;
        return this._request('POST', '/api/auth/forgot-password', data, false);
    }

    async resetPassword({ code, newPassword, email = null, phone = null }) {
        const data = { code, new_password: newPassword };
        if (email) data.email = email;
        if (phone) data.phone = phone;
        return this._request('POST', '/api/auth/reset-password', data, false);
    }

    async getSessions() { return this._request('GET', '/api/auth/sessions'); }
    async revokeSession(sessionId) { return this._request('DELETE', `/api/auth/sessions/${sessionId}`); }
    async revokeAllSessions() { return this._request('DELETE', '/api/auth/sessions'); }

    async getPointsSummary() { return this._request('GET', '/api/points/summary'); }
    async getPointsTransactions(direction = 'all', page = 1, pageSize = 20) {
        return this._request('GET', `/api/points/transactions?direction=${direction}&page=${page}&page_size=${pageSize}`);
    }
    async getPointsCatalog(appKey = '') {
        const q = appKey ? `?app=${encodeURIComponent(appKey)}` : '';
        return this._request('GET', `/api/billing/catalog${q}`);
    }
    async getMetersSummary() { return this._request('GET', '/api/billing/meters/summary'); }
    async getBillingSummary() { return this._request('GET', '/api/billing/summary'); }

    async getCreditPackages() { return this._request('GET', '/api/billing/packages'); }
    async createCreditOrder(packageId) {
        const appKey = (window.ucConfig && window.ucConfig.app_key) || null;
        const data = { package_id: packageId };
        if (appKey) data.app = appKey;
        return this._request('POST', '/api/billing/orders', data);
    }
    async getCreditOrders(page = 1, pageSize = 20) {
        return this._request('GET', `/api/billing/orders?page=${page}&page_size=${pageSize}`);
    }
    async cancelCreditOrder(orderNo) { return this._request('POST', `/api/billing/orders/${orderNo}/cancel`); }
    async payCreditOrder(orderNo) { return this._request('POST', `/api/billing/orders/${orderNo}/pay`); }

    async getCreditTasks() { return this._request('GET', '/api/credits/tasks'); }
    async getCreditsInvite() { return this._request('GET', '/api/credits/invite'); }
    async checkinCreditTask() { return this._request('POST', '/api/credits/tasks/checkin'); }
    async claimCreditTask(code) { return this._request('POST', `/api/credits/tasks/${encodeURIComponent(code)}/claim`); }

    async getAccountExport() { return this._request('GET', '/api/auth/account/export'); }

    async deleteAccount({ password }) {
        return this._request('DELETE', '/api/auth/account', { password }, true);
    }

    async sendBindCode({ email = null, phone = null }) {
        const data = {};
        if (email) data.email = email;
        if (phone) data.phone = phone;
        return this._request('POST', '/api/auth/send-bind-code', data);
    }

    async bindContact({ code, email = null, phone = null }) {
        const data = { code };
        if (email) data.email = email;
        if (phone) data.phone = phone;
        return this._request('PUT', '/api/auth/bind-contact', data);
    }

    async thirdPartyLogin(provider, code, state = null, extra = null, rememberMe = true) {
        const data = { app_key: this.appKey, provider, code };
        if (state) data.state = state;
        if (extra) data.extra = extra;
        const result = await this._request('POST', '/api/auth/third-party', data, false);
        if (result.success && result.data) { this._setTokens(result.data, rememberMe); }
        return result;
    }

    static initFromScriptTag() {
        const scripts = document.getElementsByTagName('script');
        for (const script of scripts) {
            if (script.src && script.src.includes('userCenterSDK')) {
                const baseUrl = script.getAttribute('data-base-url') || script.getAttribute('data-server');
                const appKey = script.getAttribute('data-app-key');
                if (baseUrl && appKey) {
                    return new UserCenterSDK({ baseUrl, appKey });
                }
            }
        }
        return null;
    }

    static resolveConfig() {
        const cfg = window.ucConfig || null;
        if (cfg && cfg.base_url) {
            return { baseUrl: cfg.base_url, appKey: cfg.app_key || '' };
        }
        const scripts = document.getElementsByTagName('script');
        for (const script of scripts) {
            if (script.src && script.src.indexOf('user-center-sdk.js') !== -1) {
                const baseUrl = script.getAttribute('data-base-url');
                if (baseUrl) {
                    return { baseUrl, appKey: script.getAttribute('data-app-key') || '' };
                }
            }
        }
        return { baseUrl: '', appKey: '' };
    }

    static ensureGlobalSdk() {
        const existing = window.ucSDK || window.__UC_SDK__ || window.ucSdk || null;
        if (existing && existing.baseUrl && typeof existing.changePassword === 'function') return existing;
        const cfg = UserCenterSDK.resolveConfig();
        if (!cfg.baseUrl) return null;
        const sdk = new UserCenterSDK({ baseUrl: cfg.baseUrl, appKey: cfg.appKey, silent: true });
        window.ucSDK = sdk;
        return sdk;
    }

    static getToken() {
        return getStored(TOKEN_KEY);
    }

    static clearTokens() {
        removeStored(TOKEN_KEY);
        removeStored(REFRESH_KEY);
        removeStored(EXPIRES_KEY);
    }
}

window.UserCenterSDK = UserCenterSDK;

try {
    window.addEventListener('storage', function (e) {
        if (!e || e.key !== TOKEN_KEY) return;
        var sdk = window.ucSDK || window.__UC_SDK__ || window.ucSdk || null;
        if (sdk) {
            if (e.newValue === null && typeof sdk.forgetTokens === 'function') {
                sdk.forgetTokens();
            } else if (typeof sdk.syncFromStorage === 'function') {
                sdk.syncFromStorage();
            }
        }
        window.dispatchEvent(new CustomEvent('uc:authchange', { detail: { authenticated: !!e.newValue } }));
    });
} catch (e) {}
})();
