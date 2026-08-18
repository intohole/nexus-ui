(function() {
    if (window.NuxFloatUserCenter) return;

    const DEPS = [
        { name: 'NuxAvatar', file: 'nux-avatar.js' },
        { name: 'NuxDrawer', file: 'nux-drawer.js' },
        { name: 'NuxUserCenter', file: 'nux-user-center.js' },
        { name: 'NuxToast', file: 'nux-toast.js' }
    ];

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
                if (window[dep.name] || !base) return;
                return loadScript(base + '/' + dep.file);
            });
        });
        return chain;
    }

    function resolveSdk() {
        return window.ucSDK || window.__UC_SDK__ || window.ucSdk || null;
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
                var checkTimer = null;
                function check() {
                    var v = isAuthed(sdk);
                    if (v !== loggedIn.value) loggedIn.value = v;
                }
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', check);
                }
                window.addEventListener('uc:authchange', check);
                checkTimer = setInterval(check, 2000);
                Vue.onUnmounted(function() {
                    if (checkTimer) clearInterval(checkTimer);
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

    function init(sdk) {
        if (!window.Vue) return null;
        sdk = sdk || resolveSdk();
        if (!sdk || !isAuthed(sdk)) return null;
        if (document.getElementById('nux-float-user-center-root')) return null;
        return ensureDeps().then(function() {
            if (document.getElementById('nux-float-user-center-root')) return null;
            return mount(sdk);
        }).catch(function(e) {});
    }

    function auto() {
        var sdk = resolveSdk();
        if (sdk && window.Vue) {
            init(sdk);
            return;
        }
        var tries = 0;
        var timer = setInterval(function() {
            var s = resolveSdk();
            if (s && window.Vue) {
                clearInterval(timer);
                init(s);
            } else if (++tries > 300) {
                clearInterval(timer);
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', auto);
    } else {
        auto();
    }

    window.NuxFloatUserCenter = { init: init, auto: auto };
})();
