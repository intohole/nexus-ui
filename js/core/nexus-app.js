/* ===== core/nexus-app.js ===== */
(function () {
    'use strict';

    function _status(err) {
        return err && (err.status !== undefined ? err.status : err.response && err.response.status) || null;
    }

    const _toastState = { last: 0 };
    let _authHandler = null;

    const NexusApp = {
        get authHandler() { return _authHandler; },
        setAuthHandler(fn) {
            if (typeof fn === 'function') _authHandler = fn;
        },

        handleError(err, instance, info) {
            if (!err) return;
            if (err && err.name === 'NexusStreamError') {
                this.handleErrorPayload(err.message, err.status || 401, err);
                return;
            }
            const status = _status(err);
            if (window.NexusErrorText && typeof window.NexusErrorText.fromError === 'function') {
                const mapped = window.NexusErrorText.fromError(err, err.message || '操作失败');
                this.handleErrorPayload(mapped.message || mapped.title, status, err);
                return;
            }
            const message = (window.mapHttpError && typeof window.mapHttpError === 'function')
                ? window.mapHttpError(err)
                : (err.message || '操作失败');
            this.handleErrorPayload(message, status, err);
        },

        handleErrorPayload(message, status, err) {
            if (status === 401) {
                if (NexusApp.clearStaleAuth) NexusApp.clearStaleAuth();
                if (_authHandler) { _authHandler(message); return; }
                NexusApp.notify('登录已过期，请重新登录', 'error');
                return;
            }
            if (!message) return;
            const safe = (window.NexusErrorText && typeof window.NexusErrorText.safeMessage === 'function')
                ? window.NexusErrorText.safeMessage(message)
                : message;
            if (!safe) return;
            const now = Date.now();
            if (now - _toastState.last < 1000) return;
            _toastState.last = now;
            NexusApp.notify(safe, 'error');
            if (typeof console !== 'undefined' && console.error) console.error('[NexusApp]', err || message);
        },

        notify(message, type) {
            if (window.ElementPlus && ElementPlus.ElMessage) {
                try { ElementPlus.ElMessage({ message, type: type || 'error', duration: 3000 }); return; } catch (e) {}
            }
            if (window.NexusUtils && typeof NexusUtils.showToast === 'function') {
                NexusUtils.showToast(message, type || 'error', { duration: 3000 });
                return;
            }
            if (message) window.alert ? window.alert(message) : void 0;
        },

        bindGlobal() {
            if (NexusApp._bound) return;
            NexusApp._bound = true;
            window.addEventListener('unhandledrejection', function (evt) {
                if (!evt || !evt.reason) return;
                if (evt.reason && evt.reason.__nxHandled) return;
                if (evt.reason && evt.reason.name === 'AbortError') return;
                if (evt.reason && evt.reason.name === 'NexusStreamError') {
                    NexusApp.handleError(evt.reason);
                    evt.reason.__nxHandled = true;
                    return;
                }
                const status = _status(evt.reason);
                if (status === 401) {
                    NexusApp.handleError(evt.reason);
                    evt.reason.__nxHandled = true;
                }
            });
            window.addEventListener('error', function (evt) {
                if (evt && evt.error && evt.error.name === 'AbortError') return;
            });
        },

        clearStaleAuth() {
            const keys = ['uc_access_token', 'uc_refresh_token', 'uc_token_expires_at', 'uc_token', 'access_token', 'refresh_token', 'user'];
            keys.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
            if (window.NexusStore) { try { NexusStore.prototype.logout && new NexusStore().logout(); } catch (e) {} }
        },

        registerCoreComponents(app) {
            if (!app || !app.component) return;
            const map = {
                'nux-ai-badge': window.NuxAiBadge,
                'nux-error-state': window.NuxErrorState,
                'nux-skeleton': window.NuxSkeleton,
                'nux-empty-state': window.NuxEmptyState
            };
            Object.keys(map).forEach(function (name) {
                const comp = map[name];
                if (comp && !app.component(name)) {
                    try { app.component(name, comp); } catch (e) {}
                }
            });
        },

        install(app) {
            if (!app) return;
            NexusApp.registerCoreComponents(app);
            if (app.config) app.config.errorHandler = NexusApp.handleError;
            NexusApp.bindGlobal();
            NexusApp.initAppLoading();
        },

        bootstrap(__options) {
            const options = __options || {};
            const root = options.el || '#app';
            const imports = options.components || {};
            const mount = options.mount !== false;
            let app;
            if (options.app) {
                app = options.app;
            } else if (window.Vue && typeof window.Vue.createApp === 'function') {
                app = window.Vue.createApp(options.setup || {});
            } else {
                return null;
            }
            Object.keys(imports).forEach(function (name) {
                if (imports[name]) { try { app.component(name, imports[name]); } catch (e) {} }
            });
            NexusApp.install(app);
            if (mount) {
                const el = typeof root === 'string' ? document.querySelector(root) : root;
                if (el) { try { app.mount(el); } catch (e) {} }
            }
            return app;
        },

        initAppLoading() {
            if (NexusApp._loadingInit) return;
            NexusApp._loadingInit = true;
            const overlay = document.getElementById('app-loading');
            if (!overlay) return;
            const hide = function () {
                if (!overlay || !overlay.parentNode || overlay.dataset.nxHidden) return;
                overlay.dataset.nxHidden = '1';
                overlay.classList.add('nx-app-loading-done');
                setTimeout(function () {
                    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                }, 320);
            };
            if (typeof MutationObserver === 'function') {
                const target = document.querySelector('#app[data-v-app]') || document.getElementById('app');
                if (target && target.dataset.vApp !== undefined) { hide(); return; }
                const root = document.getElementById('app') || document.body;
                const mo = new MutationObserver(function (mutations) {
                    const el = document.getElementById('app');
                    if (el && el.getAttribute('data-v-app') !== null) { mo.disconnect(); hide(); }
                });
                mo.observe(root, { attributes: true, subtree: true, childList: true });
                setTimeout(function () { mo.disconnect(); hide(); }, 6000);
            } else {
                setTimeout(hide, 6000);
            }
        }
    };

    window.NexusApp = NexusApp;

    if (typeof window !== 'undefined') {
        NexusApp.bindGlobal();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { NexusApp.initAppLoading(); });
        } else {
            NexusApp.initAppLoading();
        }
    }
})();