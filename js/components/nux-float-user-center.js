(function() {
    if (window.NuxFloatUserCenter) return;

    const DEPS = [
        { name: 'UserCenterSDK', file: '../user-center-sdk.js', force: true },
        { name: 'NuxAvatar', file: 'nux-avatar.js' },
        { name: 'NuxDrawer', file: 'nux-drawer.js' },
        { name: 'NuxUserCenter', file: 'nux-user-center.js' },
        { name: 'NuxToast', file: 'nux-toast.js' }
    ];

    let _config = null;

    function componentBase() {
        var src = (document.currentScript && document.currentScript.src) || '';
        var idx = src.lastIndexOf('/');
        return idx > 0 ? src.slice(0, idx) : '';
    }

    function loadScript(url) {
        return new Promise(function(resolve, reject) {
            var s = document.createElement('script');
            s.src = url;
            s.async = true;
            s.onload = resolve;
            s.onerror = function() { reject(new Error('加载失败: ' + url)); };
            document.head.appendChild(s);
        });
    }

    function ensureDeps() {
        var base = componentBase();
        var chain = Promise.resolve();
        DEPS.forEach(function(dep) {
            chain = chain.then(function() {
                if (!dep.force && (window[dep.name] || !base)) return;
                return loadScript(base + '/' + dep.file);
            });
        });
        return chain;
    }

    function readConfig() {
        if (_config) return _config;
        var cfg = window.ucConfig || null;
        if (cfg && cfg.base_url && cfg.app_key) {
            _config = { baseUrl: cfg.base_url, appKey: cfg.app_key };
            return _config;
        }
        var s = document.currentScript;
        if (s) {
            var baseUrl = s.getAttribute('data-base-url');
            var appKey = s.getAttribute('data-app-key');
            if (baseUrl && appKey) {
                _config = { baseUrl: baseUrl, appKey: appKey };
                return _config;
            }
        }
        return null;
    }

    function createSdk() {
        var cfg = readConfig();
        if (!cfg || !window.UserCenterSDK) return null;
        var sdk = new window.UserCenterSDK({ baseUrl: cfg.baseUrl, appKey: cfg.appKey });
        window.ucSDK = sdk;
        return sdk;
    }

    function resolveSdk() {
        var sdk = window.ucSDK || window.__UC_SDK__ || window.ucSdk || null;
        if (sdk && typeof sdk.changePassword === 'function') return sdk;
        return createSdk();
    }

    function isAuthed(sdk) {
        if (!sdk) return false;
        if (typeof sdk.isAuthenticated === 'function') return sdk.isAuthenticated();
        if (typeof sdk.getToken === 'function') return !!sdk.getToken();
        return false;
    }

    function mount(sdk) {
        var root = document.getElementById('nux-float-user-center-root');
        if (root) return null;
        root = document.createElement('div');
        root.id = 'nux-float-user-center-root';
        document.body.appendChild(root);
        var app = Vue.createApp({
            name: 'NuxFloatUserCenterRoot',
            setup: function() {
                var loggedIn = Vue.ref(isAuthed(sdk));
                function check() {
                    var v = isAuthed(sdk);
                    if (v !== loggedIn.value) loggedIn.value = v;
                }
                window.addEventListener('uc:authchange', check);
                Vue.onUnmounted(function() {
                    window.removeEventListener('uc:authchange', check);
                });
                return { loggedIn: loggedIn, sdk: sdk };
            },
            template: '<nux-toast></nux-toast><nux-user-center v-if="loggedIn" :sdk="sdk" floating></nux-user-center>'
        });
        if (window.NuxToast) app.component('nux-toast', window.NuxToast);
        if (window.NuxAvatar) app.component('nux-avatar', window.NuxAvatar);
        if (window.NuxDrawer) app.component('nux-drawer', window.NuxDrawer);
        if (window.NuxUserCenter) app.component('nux-user-center', window.NuxUserCenter);
        app.mount(root);
        return app;
    }

    function init() {
        if (!window.Vue) return null;
        if (document.getElementById('nux-float-user-center-root')) return null;
        return ensureDeps().then(function() {
            if (document.getElementById('nux-float-user-center-root')) return null;
            var sdk = resolveSdk();
            if (!sdk || !isAuthed(sdk)) return null;
            return mount(sdk);
        }).catch(function() {});
    }

    function auto() {
        if (!window.Vue) {
            var tries = 0;
            var timer = setInterval(function() {
                if (window.Vue) {
                    clearInterval(timer);
                    init();
                } else if (++tries > 300) {
                    clearInterval(timer);
                }
            }, 500);
            return;
        }
        init();
    }

    window.addEventListener('uc:authchange', function() {
        init();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', auto);
    } else {
        auto();
    }

    window.NuxFloatUserCenter = { init: init, auto: auto };
})();
