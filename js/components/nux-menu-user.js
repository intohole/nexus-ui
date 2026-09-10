(function () {
    if (window.NuxMenuUser) return;
    if (!window.Vue) return;

    var STYLE_ID = 'nux-menu-user-style';
    var CSS = [
        '.nux-menu-user{display:inline-flex;align-items:center;height:100%;margin-left:2px}',
        '.nux-menu-user .nux-uc-trigger{width:38px;height:38px}',
        '.nux-menu-user .nux-uc-floating{position:static;top:auto;right:auto;width:38px;height:38px;border:none;box-shadow:none;background:transparent}',
        '.nux-menu-user .nux-uc-floating:hover{transform:none;box-shadow:none}',
        '.nux-menu-user .nux-uc-floating .nux-avatar{width:32px;height:32px;font-size:13px}',
        '.nux-menu-user-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:38px;height:38px;padding:0;border:none;border-radius:var(--nx-radius-full,9999px);background:transparent;color:var(--nx-text-secondary,#64748b);cursor:pointer;transition:background .2s,color .2s;-webkit-tap-highlight-color:transparent}',
        '.nux-menu-user-btn:hover{background:var(--nx-bg-hover,#f1f5f9);color:var(--app-accent,var(--nx-primary))}',
        '.nux-menu-user-btn:focus-visible{outline:2px solid var(--app-accent,var(--nx-primary));outline-offset:2px}',
        '.nux-menu-user-btn svg{width:19px;height:19px}',
        '.nux-menu-user-skel{width:32px;height:32px;border-radius:50%;background:linear-gradient(90deg,var(--nx-bg-muted,#f1f5f9) 25%,var(--nx-bg-hover,#e2e8f0) 50%,var(--nx-bg-muted,#f1f5f9) 75%);background-size:200% 100%;animation:nux-menu-user-shimmer 1.2s infinite}',
        '@keyframes nux-menu-user-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
        '@media(max-width:768px){.nux-menu-user .nux-uc-trigger,.nux-menu-user-btn{width:40px;height:40px}}'
    ].join('');

    function injectCss() {
        if (document.getElementById(STYLE_ID)) return;
        var st = document.createElement('style');
        st.id = STYLE_ID;
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    var DEPS = [
        'nux-avatar.js', 'nux-drawer.js', 'nux-user-center.js', 'nux-toast.js'
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
        DEPS.forEach(function (file) {
            var key = file.replace('.js', '');
            var name = { 'nux-avatar': 'NuxAvatar', 'nux-drawer': 'NuxDrawer', 'nux-user-center': 'NuxUserCenter', 'nux-toast': 'NuxToast' }[key];
            if (window[name]) return;
            chain = chain.then(function () { return loadScript(_base + '/' + file); }).catch(function () {});
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
            loginUrl: { type: String, default: '' }
        },
        emits: ['logout'],
        setup: function (props, ctx) {
            var appInstance = Vue.getCurrentInstance().appContext.app;
            var authed = Vue.ref(false);
            var ready = Vue.ref(false);
            var sdk = Vue.ref(null);
            var loginUrl = props.loginUrl || (window.ucConfig && window.ucConfig.login_url) || '';
            var timer = null;

            function isAuthed(sdkObj) {
                if (!sdkObj) return false;
                if (typeof sdkObj.isAuthenticated === 'function') return sdkObj.isAuthenticated();
                if (typeof sdkObj.getToken === 'function') return !!sdkObj.getToken();
                return false;
            }

            function resolveSdk() {
                var sdkObj = window.ucSDK || window.__UC_SDK__ || window.ucSdk || null;
                if (sdkObj && typeof sdkObj.changePassword === 'function') return sdkObj;
                return createSdk();
            }

            function registerComponents() {
                [['nux-avatar', 'NuxAvatar'], ['nux-drawer', 'NuxDrawer'], ['nux-user-center', 'NuxUserCenter'], ['nux-toast', 'NuxToast']].forEach(function (pair) {
                    if (window[pair[1]]) appInstance.component(pair[0], window[pair[1]]);
                });
            }

            function sync() {
                var sdkObj = resolveSdk() || null;
                var authedNow = !!(sdkObj && isAuthed(sdkObj));
                if (authedNow && !authed.value) {
                    ensureDeps().then(function () {
                        registerComponents();
                        ready.value = true;
                    });
                }
                authed.value = authedNow;
                if (sdkObj) sdk.value = sdkObj;
            }

            function goLogin() {
                window.dispatchEvent(new CustomEvent('uc:login-required', { detail: { url: loginUrl } }));
                if (loginUrl) window.location.href = loginUrl;
            }

            function onLogout() { ctx.emit('logout'); }

            Vue.onMounted(function () {
                sync();
                window.addEventListener('uc:authchange', sync);
                timer = setInterval(sync, 8000);
            });
            Vue.onUnmounted(function () {
                if (timer) clearInterval(timer);
                window.removeEventListener('uc:authchange', sync);
            });

            fetchConfig().then(sync);

            var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>';
            return { authed: authed, ready: ready, sdk: sdk, icon: icon, goLogin: goLogin, onLogout: onLogout, appName: props.appName };
        },
        template: '<span class="nux-menu-user">' +
            '<nux-user-center v-if="authed && ready" :sdk="sdk" :app-name="appName" @logout="onLogout"></nux-user-center>' +
            '<span v-else-if="authed" class="nux-menu-user-skel" aria-hidden="true"></span>' +
            '<button v-else type="button" class="nux-menu-user-btn" title="登录" aria-label="登录" @click="goLogin"><span v-html="icon"></span></button>' +
            '</span>'
    };

    injectCss();
    window.NuxMenuUser = NuxMenuUser;
})();