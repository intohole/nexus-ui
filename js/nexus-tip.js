(function () {
    'use strict';

    var TIP_VERSION = '1.1.0';
    var GAP = 8;
    var registry = new WeakMap();

    function nativeSupported() {
        return typeof HTMLElement !== 'undefined'
            && typeof HTMLElement.prototype.showPopover === 'function';
    }

    function ensureTip(el) {
        var entry = registry.get(el);
        if (entry) return entry;
        var tip = document.createElement('div');
        tip.setAttribute('data-nux-tip', '');
        tip.setAttribute('popover', 'auto');
        tip.className = 'nux-tip';
        var show = function () {
            if (!tip.isConnected) document.body.appendChild(tip);
            position(el, tip);
            try { tip.showPopover(); } catch (e) { tip.setAttribute('open', ''); }
        };
        var hide = function () {
            try { if (typeof tip.hidePopover === 'function') tip.hidePopover(); } catch (e) { }
            tip.removeAttribute('open');
        };
        var onEnter = function () { show(); };
        var onLeave = function () { hide(); };
        var onFocus = function () { show(); };
        var onBlur = function () { hide(); };
        el.addEventListener('mouseenter', onEnter);
        el.addEventListener('mouseleave', onLeave);
        el.addEventListener('focusin', onFocus);
        el.addEventListener('focusout', onBlur);
        entry = { tip: tip, show: show, hide: hide, listeners: [
            ['mouseenter', onEnter], ['mouseleave', onLeave],
            ['focusin', onFocus], ['focusout', onBlur]
        ] };
        registry.set(el, entry);
        return entry;
    }

    function position(el, tip) {
        var rect = el.getBoundingClientRect();
        tip.style.visibility = 'hidden';
        if (!tip.isConnected) document.body.appendChild(tip);
        try { if (typeof tip.showPopover === 'function') tip.showPopover(); } catch (e) { }
        var tw = tip.offsetWidth || 0;
        var th = tip.offsetHeight || 0;
        var top = rect.top - th - GAP;
        if (top < GAP) top = rect.bottom + GAP;
        var left = rect.left + rect.width / 2 - tw / 2;
        if (left < GAP) left = GAP;
        var maxLeft = document.documentElement.clientWidth - tw - GAP;
        if (left > maxLeft) left = Math.max(GAP, maxLeft);
        tip.style.position = 'fixed';
        tip.style.top = top + 'px';
        tip.style.left = left + 'px';
        tip.style.margin = '0';
        tip.style.visibility = '';
    }

    function bind(el, opts) {
        if (!el || !opts || !opts.text) return;
        if (!nativeSupported()) {
            el.setAttribute('title', opts.text);
            el.setAttribute('data-nux-tip-host', '');
            return;
        }
        var entry = ensureTip(el);
        entry.tip.textContent = opts.text;
        el.setAttribute('data-nux-tip-host', '');
    }

    function update(el, text) {
        if (!el || !text) return;
        if (!nativeSupported()) {
            if (el.hasAttribute('data-nux-tip-host')) el.setAttribute('title', text);
            return;
        }
        var entry = registry.get(el);
        if (!entry) return;
        entry.tip.textContent = text;
        var open = false;
        try { open = entry.tip.matches(':popover-open'); } catch (e) { open = entry.tip.hasAttribute('open'); }
        if (open) position(el, entry.tip);
    }

    function unbind(el) {
        if (!el) return;
        var entry = registry.get(el);
        if (!entry) return;
        entry.listeners.forEach(function (pair) { el.removeEventListener(pair[0], pair[1]); });
        if (entry.tip.isConnected) entry.tip.parentNode.removeChild(entry.tip);
        el.removeAttribute('data-nux-tip-host');
        el.removeAttribute('title');
        registry.delete(el);
    }

    window.NexusTip = {
        version: TIP_VERSION,
        supported: nativeSupported,
        bind: bind,
        update: update,
        unbind: unbind
    };
})();
