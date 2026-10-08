(function() {
    'use strict';

    var TRIGGER = 64;
    var MAX_PULL = 96;
    var SPIN_MS = 700;

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function isTouchEnv() {
        return 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
    }

    function makeIndicator() {
        var el = document.createElement('div');
        el.className = 'nx-pull-refresh';
        el.setAttribute('aria-hidden', 'false');
        el.innerHTML = '<span class="nx-pull-refresh-spinner" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg></span>' +
            '<span class="nx-pull-refresh-text">下拉刷新</span>';
        return el;
    }

    function attach(el, opts) {
        opts = opts || {};
        var scrollEl = el || document.scrollingElement || document.documentElement;
        var onRefresh = typeof opts.onRefresh === 'function' ? opts.onRefresh : null;
        if (!onRefresh || !isTouchEnv()) return { detach: function() {} };

        var host = (scrollEl === document.scrollingElement || scrollEl === document.documentElement) ? document.body : scrollEl;
        if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
        if (host.dataset.nxPullRefresh === '1') return { detach: function() {} };
        host.dataset.nxPullRefresh = '1';

        var indicator = makeIndicator();
        var spinner = indicator.querySelector('.nx-pull-refresh-spinner');
        var label = indicator.querySelector('.nx-pull-refresh-text');
        var state = 'idle';
        var startY = 0;
        var pulling = false;
        var dist = 0;

        function scrollTop() {
            if (host === document.body) return window.scrollY || document.documentElement.scrollTop || 0;
            return host.scrollTop;
        }

        function render() {
            var d = Math.max(0, dist);
            var p = Math.min(1, d / TRIGGER);
            indicator.style.opacity = d > 4 ? String(0.35 + 0.65 * p) : '0';
            indicator.style.visibility = d > 4 ? 'visible' : 'hidden';
            indicator.style.transform = 'translateY(' + (d * 0.5 - 28) + 'px)';
            spinner.style.transform = 'rotate(' + (d * 2.2) + 'deg)';
            if (state === 'pulling') {
                label.textContent = d >= TRIGGER ? '释放刷新' : '下拉刷新';
            }
        }

        function setBusy() {
            state = 'busy';
            indicator.style.opacity = '1';
            indicator.style.visibility = 'visible';
            indicator.style.transform = 'translateY(6px)';
            label.textContent = '正在刷新…';
            spinner.classList.add('is-spinning');
        }

        function settle(done) {
            state = done ? 'done' : 'idle';
            label.textContent = done ? '已更新' : '下拉刷新';
            spinner.classList.remove('is-spinning');
            var hold = done ? 500 : 0;
            setTimeout(function() {
                indicator.style.opacity = '0';
                indicator.style.visibility = 'hidden';
                indicator.style.transform = 'translateY(-28px)';
                state = 'idle';
            }, hold);
        }

        function onStart(e) {
            if (state === 'busy' || e.touches.length !== 1) return;
            if (scrollTop() > 2) return;
            startY = e.touches[0].clientY;
            pulling = true;
            dist = 0;
        }

        function onMove(e) {
            if (!pulling || state === 'busy') return;
            var raw = e.touches[0].clientY - startY;
            if (raw <= 0) { dist = 0; render(); return; }
            if (raw > 8 && scrollTop() > 2) { pulling = false; dist = 0; render(); return; }
            if (state !== 'pulling') state = 'pulling';
            e.preventDefault();
            var over = raw > MAX_PULL ? (raw - MAX_PULL) * 0.2 : 0;
            dist = Math.min(raw, MAX_PULL) + over;
            render();
        }

        function onEnd() {
            if (!pulling || state === 'busy') return;
            pulling = false;
            if (dist >= TRIGGER) {
                setBusy();
                var ret = null;
                try { ret = onRefresh(); } catch (err) { console.error('[nexus-pull-refresh]', err); }
                if (ret && typeof ret.then === 'function') {
                    ret.then(function() { settle(true); }, function() { settle(false); });
                } else {
                    setTimeout(function() { settle(true); }, 400);
                }
            } else {
                settle(false);
            }
            dist = 0;
        }

        host.appendChild(indicator);
        scrollEl.addEventListener('touchstart', onStart, { passive: true });
        scrollEl.addEventListener('touchmove', onMove, { passive: false });
        scrollEl.addEventListener('touchend', onEnd, { passive: true });
        scrollEl.addEventListener('touchcancel', onEnd, { passive: true });

        return {
            detach: function() {
                scrollEl.removeEventListener('touchstart', onStart);
                scrollEl.removeEventListener('touchmove', onMove);
                scrollEl.removeEventListener('touchend', onEnd);
                scrollEl.removeEventListener('touchcancel', onEnd);
                delete host.dataset.nxPullRefresh;
                if (indicator.parentNode) indicator.parentNode.removeChild(indicator);
            }
        };
    }

    window.NexusPullRefresh = {
        attach: attach,
        TRIGGER: TRIGGER,
        isSupported: isTouchEnv
    };
})();
