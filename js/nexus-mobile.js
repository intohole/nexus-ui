(function() {
    var SIDEBAR_SEL = '.sidebar, .nx-sidebar';
    var MOBILE_BREAKPOINT = 768;

    function isMobile() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    function init() {
        var sidebar = document.querySelector(SIDEBAR_SEL);
        if (!sidebar) return;

        if (document.querySelector('.nx-hamburger')) return;

        if (sidebar.dataset.nxMobileInit === '1') return;
        sidebar.dataset.nxMobileInit = '1';

        var overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay nx-drawer-overlay';
        overlay.style.display = 'none';
        document.body.appendChild(overlay);

        var hamburger = document.createElement('button');
        hamburger.className = 'mobile-menu-btn nx-hamburger';
        hamburger.style.display = 'none';
        hamburger.innerHTML = '<span class="nx-hamburger-inner"><span class="nx-hamburger-line"></span><span class="nx-hamburger-line"></span><span class="nx-hamburger-line"></span></span>';
        hamburger.setAttribute('aria-label', '菜单');
        hamburger.setAttribute('aria-expanded', 'false');

        var topbar = document.querySelector('.topbar, .nx-nav');
        if (topbar) {
            topbar.insertBefore(hamburger, topbar.firstChild);
        } else {
            sidebar.parentNode.insertBefore(hamburger, sidebar);
        }

        function isOpen() {
            return sidebar.classList.contains('sidebar-open') || sidebar.classList.contains('open');
        }

        function setOpen(open) {
            sidebar.classList.toggle('sidebar-open', open);
            sidebar.classList.toggle('open', open);
            overlay.classList.toggle('active', open);
            hamburger.classList.toggle('open', open);
            hamburger.setAttribute('aria-expanded', String(open));
            overlay.style.display = open ? 'block' : 'none';
            sidebar.style.transform = '';
        }

        function toggleSidebar() {
            setOpen(!isOpen());
        }

        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleSidebar();
        });

        overlay.addEventListener('click', function() {
            setOpen(false);
        });

        var navItems = sidebar.querySelectorAll('.nav-item, .nx-sidebar-item');
        navItems.forEach(function(item) {
            item.addEventListener('click', function() {
                if (isMobile() && isOpen()) setOpen(false);
            });
        });

        initSwipe(sidebar, setOpen, isMobile, isOpen);

        function checkMobile() {
            var mobile = isMobile();
            hamburger.style.display = mobile ? 'inline-flex' : 'none';
            if (!mobile) setOpen(false);
        }

        checkMobile();
        window.addEventListener('resize', checkMobile);
    }

    function initSwipe(sidebar, setOpen, isMobileFn, isOpenFn) {
        var touch = null;

        function onStart(e) {
            if (!isMobileFn() || !isOpenFn() || e.touches.length !== 1) return;
            if (e.touches[0].clientX > 24) return;
            touch = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
            sidebar.style.transition = 'none';
        }

        function onMove(e) {
            if (!touch) return;
            var dx = e.touches[0].clientX - touch.startX;
            var dy = e.touches[0].clientY - touch.startY;
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            if (Math.abs(dy) > Math.abs(dx)) { touch = null; return; }
            if (dx > 0) { touch = null; return; }
            e.preventDefault();
            sidebar.style.transform = 'translateX(' + dx + 'px)';
            sidebar.style.transition = 'none';
        }

        function onEnd(e) {
            if (!touch) return;
            var dx = e.changedTouches[0].clientX - touch.startX;
            sidebar.style.transition = '';
            if (dx < -40) {
                setOpen(false);
            } else {
                sidebar.style.transform = '';
            }
            touch = null;
        }

        sidebar.addEventListener('touchstart', onStart, { passive: true });
        sidebar.addEventListener('touchmove', onMove, { passive: false });
        sidebar.addEventListener('touchend', onEnd, { passive: true });
        sidebar.addEventListener('touchcancel', function() { touch = null; sidebar.style.transition = ''; sidebar.style.transform = ''; }, { passive: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
