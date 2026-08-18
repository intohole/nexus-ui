(function() {
    if (window.NuxFloatUserCenter) return;

    const DEPS = [
        { name: 'UserCenterSDK', file: '../user-center-sdk.js', force: true },
        { name: 'NuxAvatar', file: 'nux-avatar.js' },
        { name: 'NuxDrawer', file: 'nux-drawer.js' },
        { name: 'NuxUserCenter', file: 'nux-user-center.js' },
        { name: 'NuxToast', file: 'nux-toast.js' }
    ];
    const POLL_INTERVAL = 1500;

    let _config = null;
    let _rootApp = null;
    let _timer = null;

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

    function trustedUrl(u) {
        if (!u) return false;
        if (u.indexOf('://') !== -1) return true;
        return /\/?uc[-_]?api/i.test(u) || /\/usercenter/i.test(u);
    }

    function readConfig() {
        if (_config) return _config;
        var cfg = window.ucConfig || null;
        if (cfg && cfg.base_url) {
            _config = { baseUrl: cfg.base_url, appKey: cfg.app_key || '' };
            return _config;
        }
        var uccfg = window.ucCfg || null;
        if (uccfg && uccfg.user_center && uccfg.user_center.base_url) {
            _config = {
                baseUrl: uccfg.user_center.base_url,
                appKey: uccfg.user_center.app_key || uccfg.app_key || ''
            };
            return _config;
        }
        var s = document.currentScript;
        if (s) {
            var baseUrl = s.getAttribute('data-base-url');
            var appKey = s.getAttribute('data-app-key');
            if (baseUrl) {
                _config = { baseUrl: baseUrl, appKey: appKey || '' };
                return _config;
            }
        }
        var sdk = window.ucSDK || window.__UC_SDK__ || window.ucSdk || null;
        if (sdk && typeof sdk.baseUrl === 'string' && trustedUrl(sdk.baseUrl)) {
            _config = { baseUrl: sdk.baseUrl, appKey: sdk.appKey || '' };
            return _config;
        }
        _config = { baseUrl: '', appKey: '' };
        return _config;
    }

    function createSdk() {
        var cfg = readConfig();
        if (!cfg || !cfg.baseUrl || !window.UserCenterSDK) return null;
        var sdk = new window.UserCenterSDK({ baseUrl: cfg.baseUrl, appKey: cfg.appKey });
        window.ucSDK = sdk;
        return sdk;
    }

    function configUrl() {
        var s = document.currentScript;
        var u = s && s.getAttribute('data-config-url');
        if (u) return u;
        var p = '';
        try { p = window.PATH_PREFIX || ''; } catch (e) {}
        return (p || '') + '/api/auth/config';
    }

    var _configFetching = null;
    var _configRetryAt = 0;

    function fetchConfig() {
        if (_config && _config.baseUrl) return Promise.resolve(_config);
        var now = Date.now();
        if (_configFetching || now < _configRetryAt) return Promise.resolve(null);
        var url = configUrl();
        if (!url) return Promise.resolve(null);
        _configFetching = fetch(url, { headers: { 'Accept': 'application/json' } })
            .then(function(resp) { return resp.ok ? resp.json() : null; })
            .then(function(data) {
                _configFetching = null;
                var c = (data && data.data) ? data.data : data;
                if (c && c.user_center && c.user_center.base_url) {
                    c = { base_url: c.user_center.base_url, app_key: c.user_center.app_key || c.app_key || '' };
                }
                c = c || {};
                var bu = c.base_url || c.uc_base_url || '';
                var ak = c.app_key || c.uc_app_key || '';
                if (bu) {
                    _config = { baseUrl: bu, appKey: ak || '' };
                    window.ucConfig = { base_url: bu, app_key: ak || '' };
                    if (window.UserCenterSDK) {
                        window.ucSDK = new window.UserCenterSDK({ baseUrl: bu, appKey: ak || '' });
                    }
                    if (typeof window.dispatchEvent === 'function') {
                        try { window.dispatchEvent(new CustomEvent('uc:authchange')); } catch (e) {}
                    }
                } else {
                    _configRetryAt = Date.now() + 30000;
                }
                return _config;
            })
            .catch(function() { _configFetching = null; _configRetryAt = Date.now() + 30000; return null; });
        return _configFetching;
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

    function unmount() {
        if (_rootApp) {
            _rootApp.unmount();
            _rootApp = null;
        }
        var root = document.getElementById('nux-float-user-center-root');
        if (root) root.remove();
    }

    function mount(sdk) {
        if (_rootApp) return _rootApp;
        var root = document.getElementById('nux-float-user-center-root');
        if (!root) {
            root = document.createElement('div');
            root.id = 'nux-float-user-center-root';
            document.body.appendChild(root);
        }
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
        _rootApp = app;
        app.mount(root);
        return app;
    }

    function sync() {
        if (!window.Vue) return false;
        if (!_config || !_config.baseUrl) fetchConfig();
        var sdk = resolveSdk();
        if (sdk && !sdk.baseUrl) sdk = null;
        var authed = !!(sdk && isAuthed(sdk));
        if (_rootApp && !authed) {
            unmount();
        } else if (!_rootApp && authed && sdk) {
            ensureDeps().then(function() {
                if (_rootApp) return;
                var sdk2 = resolveSdk();
                if (!sdk2 || !isAuthed(sdk2)) return;
                mount(sdk2);
            }).catch(function() {});
        }
        return authed;
    }

    function start() {
        if (_timer) return;
        _timer = setInterval(sync, POLL_INTERVAL);
    }

    function init() {
        sync();
        start();
    }

    window.addEventListener('uc:authchange', function() {
        sync();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    window.NuxFloatUserCenter = {
        init: init,
        configure: function(cfg) {
            if (cfg && cfg.base_url && cfg.app_key) {
                _config = { baseUrl: cfg.base_url, appKey: cfg.app_key };
            }
            init();
            return !!_config;
        },
        destroy: unmount
    };
})();
