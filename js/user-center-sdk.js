(function() {
const TOKEN_KEY = 'uc_access_token';
const REFRESH_KEY = 'uc_refresh_token';
const EXPIRES_KEY = 'uc_token_expires_at';
const LEGACY_KEYS = [
    ['siwu_uc_access_token', 'siwu_uc_refresh_token', 'siwu_uc_token_expires_at'],
    ['uc_token', 'uc_refresh_token', 'uc_token_expires_at'],
    ['ucToken', 'ucRefreshToken', 'ucTokenExpiresAt']
];

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
            const access = localStorage.getItem(oldAccess);
            if (access && !this._accessToken) {
                this._accessToken = access;
                this._refreshToken = localStorage.getItem(oldRefresh);
                const exp = localStorage.getItem(oldExpires);
                this._tokenExpiresAt = exp ? parseInt(exp) : null;
                localStorage.removeItem(oldAccess);
                localStorage.removeItem(oldRefresh);
                localStorage.removeItem(oldExpires);
            }
        }
        if (this._accessToken) {
            this._persistTokens();
        }
    }

    _loadPersistedTokens() {
        try {
            this._accessToken = localStorage.getItem(TOKEN_KEY);
            this._refreshToken = localStorage.getItem(REFRESH_KEY);
            const expiresAt = localStorage.getItem(EXPIRES_KEY);
            this._tokenExpiresAt = expiresAt ? parseInt(expiresAt) : null;
            if (!this._accessToken) {
                this._migrateLegacyTokens();
            }
        } catch (e) {}
    }

    _persistTokens() {
        try {
            if (this._accessToken) {
                localStorage.setItem(TOKEN_KEY, this._accessToken);
            } else {
                localStorage.removeItem(TOKEN_KEY);
            }
            if (this._refreshToken) {
                localStorage.setItem(REFRESH_KEY, this._refreshToken);
            } else {
                localStorage.removeItem(REFRESH_KEY);
            }
            if (this._tokenExpiresAt) {
                localStorage.setItem(EXPIRES_KEY, String(this._tokenExpiresAt));
            } else {
                localStorage.removeItem(EXPIRES_KEY);
            }
        } catch (e) {}
    }

    _emitAuthChange() {
        try {
            window.dispatchEvent(new CustomEvent('uc:authchange', { detail: { authenticated: !!this._accessToken } }));
        } catch (e) {}
    }

    _setTokens(data) {
        this._accessToken = data.access_token;
        this._refreshToken = data.refresh_token || this._refreshToken;
        this._tokenExpiresAt = data.expires_in
            ? Date.now() + data.expires_in * 1000
            : null;
        this._persistTokens();
        this._emitAuthChange();
        if (this._onTokenUpdate) {
            this._onTokenUpdate({
                access_token: this._accessToken,
                refresh_token: this._refreshToken,
                expires_in: data.expires_in
            });
        }
    }

    setTokens(data) {
        this._setTokens(data);
    }

    syncFromStorage() {
        try {
            var t = localStorage.getItem(TOKEN_KEY);
            if (t && t !== this._accessToken) this._accessToken = t;
            var r = localStorage.getItem(REFRESH_KEY);
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
        this._persistTokens();
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

    async login(username, password, inviteCode = null) {
        const data = { username, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
        return result;
    }

    async loginWithEmail(email, password, inviteCode = null) {
        const data = { email, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
        return result;
    }

    async loginWithPhone(phone, password, inviteCode = null) {
        const data = { phone, password, app_key: this.appKey };
        if (inviteCode) data.invite_code = inviteCode;
        const result = await this._request('POST', '/api/auth/login', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
        return result;
    }

    async register({ username, password, email = null, phone = null, inviteCode = null }) {
        const data = { password, app_key: this.appKey };
        if (username) data.username = username;
        if (email) data.email = email;
        if (phone) data.phone = phone;
        if (inviteCode) data.invite_code = inviteCode;
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
                this._setTokens(result.data);
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

    async thirdPartyLogin(provider, code, state = null, extra = null) {
        const data = { app_key: this.appKey, provider, code };
        if (state) data.state = state;
        if (extra) data.extra = extra;
        const result = await this._request('POST', '/api/auth/third-party', data, false);
        if (result.success && result.data) { this._setTokens(result.data); }
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
}

window.UserCenterSDK = UserCenterSDK;
})();
