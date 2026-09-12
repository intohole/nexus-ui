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

class UserCenterSDK {
    constructor(config) {
        this.baseUrl = (config.baseUrl || '').replace(/^https?:\/\//, '//').replace(/\/+$/, '');
        this.appKey = config.appKey;
        this.timeout = config.timeout || 30000;
        this._accessToken = null;
        this._refreshToken = null;
        this._tokenExpiresAt = null;
        this._onTokenUpdate = config.onTokenUpdate || null;
        this._onAuthError = config.onAuthError || null;
        this._loadPersistedTokens();
        if (!window.ucSDK && !config.silent) {
            window.ucSDK = this;
        }
    }

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
                throw new Error(error.detail || `HTTP ${response.status}`);
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
        if (captcha) { data.captcha_id = captcha.captchaId; data.captcha_code = captcha.captchaCode; }
        const result = await this._request('POST', '/api/auth/register', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
        return result;
    }

    async refreshAccessToken() {
        if (!this._refreshToken) return false;
        try {
            const result = await this._request('POST', '/api/auth/refresh', {
                refresh_token: this._refreshToken
            }, false, true);
            if (result.success && result.data) {
                this._setTokens(result.data, persistedIn() !== 'session');
                return true;
            }
        } catch (e) {
            this.clearTokens();
        }
        return false;
    }

    async logout() {
        try {
            await this._request('POST', '/api/auth/logout', null, true, true);
        } catch (e) {}
        this.clearTokens();
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
        if (existing && typeof existing.changePassword === 'function') return existing;
        const cfg = UserCenterSDK.resolveConfig();
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
        if (sdk && typeof sdk.syncFromStorage === 'function') sdk.syncFromStorage();
        window.dispatchEvent(new CustomEvent('uc:authchange', { detail: { authenticated: !!e.newValue } }));
    });
} catch (e) {}
})();
