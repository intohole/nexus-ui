(function () {
    if (window.NuxMenuAbout) return;
    if (!window.Vue) return;

    var STYLE_ID = 'nux-menu-about-style';
    var CSS = [
        '.nux-menu-about{display:inline-flex;align-items:center;height:100%;margin-left:2px}',
        '.nux-menu-about-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:38px;height:38px;padding:0;border:none;border-radius:var(--nx-radius-full,9999px);background:transparent;color:var(--nx-text-secondary,#64748b);cursor:pointer;text-decoration:none;transition:background .2s,color .2s;-webkit-tap-highlight-color:transparent}',
        '.nux-menu-about-btn:hover{background:var(--nx-bg-hover,#f1f5f9);color:var(--app-accent,var(--nx-primary))}',
        '.nux-menu-about-btn:focus-visible{outline:2px solid var(--app-accent,var(--nx-primary));outline-offset:2px}',
        '.nux-menu-about-btn svg{width:19px;height:19px}',
        '.nux-menu-about-label{font-size:13px;font-weight:500;white-space:nowrap}',
        '@media(max-width:768px){.nux-menu-about-btn{width:40px;height:40px}}'
    ].join('');

    function injectCss() {
        if (document.getElementById(STYLE_ID)) return;
        var st = document.createElement('style');
        st.id = STYLE_ID;
        st.textContent = CSS;
        document.head.appendChild(st);
    }

    var NuxMenuAbout = {
        name: 'NuxMenuAbout',
        props: {
            label: { type: [Boolean, String], default: false }
        },
        setup: function (props) {
            var aboutUrl = (function () {
                var src = ((document.currentScript && document.currentScript.src) || '').split('?')[0];
                var m = src.match(/^(.*)\/js\/components\/nux-menu-about\.js$/);
                return m ? (m[1] + '/about.html') : '';
            })();
            if (!aboutUrl) aboutUrl = 'https://songguokr.com/nexus-ui/about.html';
            var prefix = '';
            try { prefix = (window.PATH_PREFIX || '').replace(/\/$/, ''); } catch (e) {}
            aboutUrl = aboutUrl + '?app=' + encodeURIComponent(prefix);
            var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
            return { href: aboutUrl, icon: icon, labelText: props.label === true ? '关于' : (props.label || '') };
        },
        template: '<span class="nux-menu-about">' +
            '<a class="nux-menu-about-btn" :href="href" title="关于我们" aria-label="关于我们"><span v-html="icon"></span><span v-if="labelText" class="nux-menu-about-label">{{ labelText }}</span></a>' +
            '</span>'
    };

    injectCss();
    window.NuxMenuAbout = NuxMenuAbout;
})();