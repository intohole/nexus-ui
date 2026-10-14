(function () {
    if (window.NuxMenuUser) return;
    if (!window.Vue) return;

    var STYLE_ID = 'nux-menu-user-style';
    var CSS = [
        '.nux-menu-user{position:relative;display:inline-flex;align-items:center;height:100%;margin-left:2px}',
        '.nux-menu-user .nux-avatar{width:32px;height:32px;font-size:13px}',
        '.nux-menu-user-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:38px;padding:0 4px;border:none;border-radius:var(--nx-radius-full,9999px);background:transparent;color:var(--nx-text-secondary,#64748b);cursor:pointer;transition:background .2s,color .2s;-webkit-tap-highlight-color:transparent}',
        '.nux-menu-user-btn:hover{background:var(--nx-bg-hover,#f1f5f9);color:var(--app-accent,var(--nx-primary))}',
        '.nux-menu-user-btn:focus-visible{outline:2px solid var(--app-accent,var(--nx-primary));outline-offset:2px}',
        '.nux-menu-user-btn svg{width:19px;height:19px}',
        '.nux-menu-user--labeled .nux-menu-user-btn{height:38px;padding:0 12px 0 6px}',
        '.nux-menu-user-label{font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.nux-menu-user-skel{width:32px;height:32px;border-radius:50%;background:linear-gradient(90deg,var(--nx-bg-muted,#f1f5f9) 25%,var(--nx-bg-hover,#e2e8f0) 50%,var(--nx-bg-muted,#f1f5f9) 75%);background-size:200% 100%;animation:nux-menu-user-shimmer 1.2s infinite}',
        '@keyframes nux-menu-user-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
        '.nux-menu-user-panel{position:absolute;top:calc(100% + 8px);right:0;min-width:184px;padding:8px;border-radius:12px;background:var(--nx-bg-card,#fff);border:1px solid var(--nx-border,#e2e8f0);box-shadow:0 12px 32px rgba(15,23,42,.14);z-index:1200}',
        '.nux-menu-user-name{padding:8px 10px;font-size:14px;font-weight:600;color:var(--nx-text-primary,#0f172a);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-bottom:1px solid var(--nx-border,#e2e8f0);margin-bottom:4px}',
        '.nux-menu-user-logout{display:block;width:100%;padding:8px 10px;border:none;border-radius:8px;background:transparent;color:var(--nx-text-secondary,#64748b);font-size:13px;cursor:pointer;text-align:left;transition:background .2s,color .2s}',
        '.nux-menu-user-logout:hover{background:var(--nx-bg-hover,#f1f5f9);color:#dc2626}',
        '@media(max-width:768px){.nux-menu-user-btn{height:44px}.nux-menu-user--labeled .nux-menu-user-btn{height:44px}}'
    ].join('');

    function injectCss() {
        window.NexusUtils && NexusUtils.injectStyle(STYLE_ID, CSS);
    }

    var DEPS = [
        { file: 'nux-avatar.js', sentinel: 'NuxAvatar' }
    ];

    var _base = (function () {
        var src = (document.currentScript && document.currentScript.src) || '';
        var idx = src.lastIndexOf('/');
        return idx > 0 ? src.slice(0, idx) : '';
    })();

    function loadScript(url) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.onload = resolve;
            s.onerror = function () { reject(new Error('fail:' + url)); };
            document.head.appendChild(s);
        });
    }

    function ensureDeps() {
        if (!_base) return Promise.resolve();
        var chain = Promise.resolve();
        DEPS.forEach(function (dep) {
            if (window[dep.sentinel]) return;
            chain = chain.then(function () { return loadScript(_base + '/' + dep.file); }).catch(function () {});
        });
        return chain;
    }

    function trustedUrl(u) {
        if (!u) return false;
        if (u.indexOf('://') !== -1) return true;
        return /\/?uc[-_]?api/i.test(u) || /\/usercenter/i.test(u);
    }

    function readConfig() {
        var cfg = window.ucConfig || null;
        if (cfg && cfg.base_url) return { baseUrl: cfg.base_url, appKey: cfg.app_key || '' };
        var uccfg = window.ucCfg || null;
        if (uccfg && uccfg.user_center && uccfg.user_center.base_url) {
            return { baseUrl: uccfg.user_center.base_url, appKey: uccfg.user_center.app_key || uccfg.app_key || '' };
        }
        var s = document.currentScript;
        if (s) {
            var baseUrl = s.getAttribute('data-base-url');
            if (baseUrl) return { baseUrl: baseUrl, appKey: s.getAttribute('data-app-key') || '' };
        }
        return { baseUrl: '', appKey: '' };
    }

    function createSdk() {
        var cfg = readConfig();
        if (!cfg || !cfg.baseUrl || !window.UserCenterSDK) return null;
        var sdk = new window.UserCenterSDK({ baseUrl: cfg.baseUrl, appKey: cfg.appKey });
        window.ucSDK = sdk;
        return sdk;
    }

    function configUrl() {
        var g = window.UC_CONFIG_URL || '';
        if (g) return g;
        var p = '';
        try { p = window.PATH_PREFIX || ''; } catch (e) {}
        return (p || '') + '/api/auth/config';
    }

    function fetchConfig() {
        var cached = window.ucSDK || window.__UC_SDK__ || window.ucSdk || null;
        if (cached && trustedUrl(cached.baseUrl)) return Promise.resolve(cached);
        var url = configUrl();
        if (!url) return Promise.resolve(null);
        return fetch(url, { headers: { 'Accept': 'application/json' } })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                var c = (data && data.data) ? data.data : data;
                if (c && c.user_center && c.user_center.base_url) c = c.user_center;
                if (!c || !c.base_url) return null;
                window.ucConfig = { base_url: c.base_url, app_key: c.app_key || '' };
                return createSdk();
            })
            .catch(function () { return null; });
    }

    var NuxMenuUser = {
        name: 'NuxMenuUser',
        props: {
            appName: { type: String, default: '' },
            loginUrl: { type: String, default: '' },
            label: { type: [Boolean, String], default: false }
        },
        emits: ['logout'],
        setup: function (props, ctx) {
            var ownVnode = Vue.getCurrentInstance().vnode;
            var appInstance = Vue.getCurrentInstance().appContext.app;
            var authed = Vue.ref(false);
            var ready = Vue.ref(false);
            var sdk = Vue.ref(null);
            var panel = Vue.ref(false);
            var displayName = Vue.ref('');
            var loginUrl = props.loginUrl || (window.ucConfig && window.ucConfig.login_url) || '';

            function onStorage(e) {
                if (!e || !e.key || !/token|uc_/i.test(e.key)) return;
                sync();
            }

            function onVisible() {
                if (!document.hidden) sync();
            }

            function isAuthed(sdkObj) {
                if (!sdkObj) return false;
                if (typeof sdkObj.isAuthenticated === 'function') return sdkObj.isAuthenticated();
                if (typeof sdkObj.getToken === 'function') return !!sdkObj.getToken();
                return false;
            }

            function resolveSdk() {
                var sdkObj = window.ucSDK || window.__UC_SDK__ || window.ucSdk || null;
                if (sdkObj && sdkObj.baseUrl && typeof sdkObj.changePassword === 'function') return sdkObj;
                return createSdk();
            }

            function loadProfile(sdkObj) {
                if (displayName.value || !sdkObj || typeof sdkObj.getCurrentUser !== 'function') return;
                sdkObj.getCurrentUser().then(function (r) {
                    var u = (r && r.data) || r || {};
                    displayName.value = u.display_name || u.nickname || u.username || '';
                }).catch(function () {});
            }

            function sync() {
                var sdkObj = resolveSdk() || null;
                var authedNow = !!(sdkObj && isAuthed(sdkObj));
                if (authedNow && !authed.value) {
                    ensureDeps().then(function () {
                        if (window.NuxAvatar) appInstance.component('nux-avatar', window.NuxAvatar);
                        ready.value = true;
                        loadProfile(sdkObj);
                    });
                }
                if (!authedNow) {
                    authed.value = false;
                    ready.value = false;
                    panel.value = false;
                    displayName.value = '';
                } else {
                    authed.value = true;
                    loadProfile(sdkObj);
                }
                if (sdkObj) sdk.value = sdkObj;
            }

            function togglePanel() {
                panel.value = !panel.value;
            }

            function onDocClick(e) {
                if (panel.value && ownVnode.el && !ownVnode.el.contains(e.target)) panel.value = false;
            }

            function goLogin() {
                window.dispatchEvent(new CustomEvent('uc:login-required', { detail: { url: loginUrl } }));
                if (loginUrl) window.location.href = loginUrl;
            }

            function onLogout() {
                ctx.emit('logout');
                var bound = !!(ownVnode && ownVnode.props && ownVnode.props.onLogout);
                if (!bound) setTimeout(function () { window.location.reload(); }, 0);
            }

            function goLogout() {
                panel.value = false;
                var sdkObj = resolveSdk();
                if (sdkObj && typeof sdkObj.logout === 'function') {
                    Promise.resolve(sdkObj.logout()).catch(function () {}).then(onLogout);
                } else {
                    onLogout();
                }
            }

            Vue.onMounted(function () {
                sync();
                window.addEventListener('uc:authchange', sync);
                window.addEventListener('storage', onStorage);
                document.addEventListener('visibilitychange', onVisible);
                document.addEventListener('click', onDocClick);
            });
            Vue.onUnmounted(function () {
                window.removeEventListener('uc:authchange', sync);
                window.removeEventListener('storage', onStorage);
                document.removeEventListener('visibilitychange', onVisible);
                document.removeEventListener('click', onDocClick);
            });

            fetchConfig().then(sync);

            var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>';
            var labelText = props.label === true ? '用户中心' : (props.label || '');
            var loginLabel = props.label ? '登录' : '';
            return { authed: authed, ready: ready, sdk: sdk, panel: panel, displayName: displayName, icon: icon, togglePanel: togglePanel, goLogin: goLogin, goLogout: goLogout, labelText: labelText, loginLabel: loginLabel };
        },
        template: '<span class="nux-menu-user" :class="{ \'nux-menu-user--labeled\': !!labelText || !!loginLabel }">' +
            '<template v-if="authed && ready">' +
            '<button type="button" class="nux-menu-user-btn" :title="labelText || \'用户中心\'" @click="togglePanel">' +
            '<nux-avatar :name="displayName || labelText || \'用户\'"></nux-avatar>' +
            '<span v-if="labelText" class="nux-menu-user-label">{{ labelText }}</span>' +
            '</button>' +
            '<div v-if="panel" class="nux-menu-user-panel">' +
            '<div class="nux-menu-user-name">{{ displayName || labelText || \'用户中心\' }}</div>' +
            '<button type="button" class="nux-menu-user-logout" @click="goLogout">退出登录</button>' +
            '</div>' +
            '</template>' +
            '<span v-else-if="authed" class="nux-menu-user-skel" aria-hidden="true"></span>' +
            '<button v-else type="button" class="nux-menu-user-btn" :title="loginLabel || \'登录\'" :aria-label="loginLabel || \'登录\'" @click="goLogin"><span v-html="icon"></span><span v-if="loginLabel" class="nux-menu-user-label">{{ loginLabel }}</span></button>' +
            '</span>'
    };

    injectCss();
    window.NuxMenuUser = NuxMenuUser;
})();
