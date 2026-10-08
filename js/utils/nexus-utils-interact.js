/* nexus-utils interact —— nexus-utils.js 聚合入口的本体模块（由 build_all.py 拼接），直引入口或随 nexus-all 加载 */
(function() {
    const utils = window.NexusUtils = window.NexusUtils || {};
    Object.assign(utils, {
        copyToClipboard(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text).then(() => true).catch(() => utils._copyFallback(text));
            }
            return Promise.resolve(utils._copyFallback(text));
        },

        _copyFallback(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            textarea.remove();
            return ok;
        },

        copyText(text, opts = {}) {
            return utils.copyToClipboard(text).then((ok) => {
                if (ok) {
                    if (opts.success) utils.showToast(opts.success, opts.type || 'success');
                } else if (opts.fail) {
                    utils.showToast(opts.fail, 'error');
                }
                return ok;
            });
        },

        showToast(message, type = 'info', options = {}) {
            if (typeof window.showToast !== 'function') return;
            const opts = options || {};
            if (opts.center) {
                window.showToast(message, type, { duration: opts.duration || 3000, center: true });
            } else {
                window.showToast(message, type, opts.duration || 3000);
            }
        },

        confirm(message, title = '操作确认', options = {}) {
            if (typeof window.nuxConfirm !== 'function') return Promise.resolve(false);
            return window.nuxConfirm(message, title, options);
        },
    });
    utils.errorDetailText = function (v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'string') return v.trim();
        if (Array.isArray(v)) {
            return v.map(function (item) {
                if (item === null || item === undefined) return '';
                if (typeof item === 'string') return item;
                if (typeof item === 'object') {
                    return String(item.msg || item.message || item.detail || '').replace(/^Value error,\s*/, '');
                }
                return String(item);
            }).filter(Boolean).join('；');
        }
        if (typeof v === 'object') {
            var inner = v.message || v.detail || v.msg || v.error;
            if (inner === undefined || inner === v) return '';
            return utils.errorDetailText(inner);
        }
        return String(v);
    };

    utils.FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    utils.focusables = function (root) {
        if (!root) return [];
        return Array.prototype.slice.call(root.querySelectorAll(utils.FOCUSABLE_SELECTOR)).filter(function (el) {
            return el.offsetParent !== null;
        });
    };

    // 方向键在列表索引间移动（左右/上下/Home/End，首尾环绕）；非导航键返回 -1
    utils.rovingIndex = function (e, count, current) {
        if (!count || count <= 0) return -1;
        let idx = (current === undefined || current < 0 || current >= count) ? 0 : current;
        switch (e.key) {
            case 'ArrowRight': case 'ArrowDown': idx += 1; break;
            case 'ArrowLeft': case 'ArrowUp': idx -= 1; break;
            case 'Home': idx = 0; break;
            case 'End': idx = count - 1; break;
            default: return -1;
        }
        if (idx < 0) idx = count - 1;
        if (idx >= count) idx = 0;
        return idx;
    };

    utils.overlayStack = function () {
        const stack = [];
        return {
            push(uid) { stack.push(uid); },
            remove(uid) { const i = stack.indexOf(uid); if (i > -1) stack.splice(i, 1); },
            isTop(uid) { return stack[stack.length - 1] === uid; }
        };
    };

    utils.overlayBehavior = function (options) {
        const opts = options || {};
        const canInteract = opts.canInteract || (() => true);
        const escEnabled = opts.escEnabled || (() => true);
        let restoreEl = null;
        let active = false;

        function trapTab(e) {
            const panel = opts.panel ? opts.panel() : null;
            if (!panel) return;
            const list = utils.focusables(panel);
            if (!list.length) return;
            const first = list[0];
            const last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        function onKeydown(e) {
            if (!canInteract()) return;
            if (e.key === 'Escape') {
                if (escEnabled()) opts.requestClose();
                return;
            }
            if (e.key === 'Tab' && opts.trap !== false) trapTab(e);
        }

        function focusPanel() {
            let el = opts.focusEl ? opts.focusEl() : null;
            if (!el && opts.panel) {
                const list = utils.focusables(opts.panel());
                el = list.length ? list[0] : null;
            }
            if (el && el.focus) {
                try { el.focus(); } catch (e) { }
            }
        }

        function acquire() {
            if (active) return;
            active = true;
            if (opts.stack) opts.stack.push(opts.uid);
            if (utils.scrollLock) utils.scrollLock.lock();
            if (document.activeElement && document.activeElement !== document.body) {
                restoreEl = document.activeElement;
            }
            document.addEventListener('keydown', onKeydown);
            const schedule = (window.Vue && Vue.nextTick) ? Vue.nextTick
                : (window.requestAnimationFrame ? window.requestAnimationFrame : function (fn) { fn(); });
            schedule(focusPanel);
        }

        function release() {
            if (!active) return;
            active = false;
            document.removeEventListener('keydown', onKeydown);
            if (opts.stack) opts.stack.remove(opts.uid);
            if (utils.scrollLock) utils.scrollLock.unlock();
            if (restoreEl && restoreEl.focus) {
                try { restoreEl.focus(); } catch (e) { }
            }
            restoreEl = null;
        }

        return { acquire, release };
    };
})();
