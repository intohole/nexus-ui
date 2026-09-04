(function () {
    'use strict';

    const VERSION = '1.2.0';

    const FALLBACK_LIBS = {
        marked: 'https://registry.npmmirror.com/marked/9.1.6/files/lib/marked.umd.js',
        dompurify: 'https://songguokr.com/nexus-ui/v2.10.63/vendor/purify.min.js',
        highlight: 'https://songguokr.com/nexus-ui/v2.10.63/vendor/highlight.min.js',
        highlightCss: 'https://songguokr.com/nexus-ui/v2.10.63/vendor/styles/atom-one-dark.min.css'
    };

    const LIB_BASE = (function () {
        const scripts = document.scripts || [];
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].getAttribute('src') || '';
            const m = src.match(/^(.*)\/js\/nexus-(?:all|markdown)\.js(?:[?#].*)?$/);
            if (m) return m[1] + '/vendor/';
        }
        return '';
    })();

    const LIBS = LIB_BASE ? {
        marked: LIB_BASE + 'marked.umd.js',
        dompurify: LIB_BASE + 'purify.min.js',
        highlight: LIB_BASE + 'highlight.min.js',
        highlightCss: LIB_BASE + 'styles/atom-one-dark.min.css'
    } : FALLBACK_LIBS;

    const DEFAULT_ALLOWED_TAGS = [
        'p', 'br', 'strong', 'em', 'code', 'pre', 'span',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'hr',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'a', 'img', 'div', 'del', 'sub', 'sup',
        'details', 'summary', 'figure', 'figcaption',
        'kbd', 'samp', 'var', 'mark', 'input'
    ];

    let libsLoaded = false;
    let libsLoading = null;

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`load fail: ${src}`));
            document.head.appendChild(script);
        });
    }

    function loadStylesheet(href) {
        return new Promise((resolve) => {
            if (document.querySelector(`link[href="${href}"]`)) { resolve(); return; }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            link.onerror = resolve;
            document.head.appendChild(link);
        });
    }

    function hasGlobal(name) { return typeof window[name] !== 'undefined'; }

    function hasHighlightCss() {
        if (window.__NX_HLJS_CSS__) return true;
        return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .some(l => (l.href || '').indexOf('highlight') > -1);
    }

    async function injectLibs() {
        if (libsLoaded) return true;
        if (libsLoading) return libsLoading;
        libsLoading = (async () => {
            await Promise.all([
                hasGlobal('marked') ? Promise.resolve() : loadScript(LIBS.marked),
                hasGlobal('DOMPurify') ? Promise.resolve() : loadScript(LIBS.dompurify),
                hasGlobal('hljs') ? Promise.resolve() : loadScript(LIBS.highlight),
                hasHighlightCss() ? Promise.resolve() : loadStylesheet(LIBS.highlightCss).then(() => { window.__NX_HLJS_CSS__ = 1; })
            ]).catch(err => console.warn('[NexusMarkdown] lib load fail:', err.message));
            if (window.marked) {
                marked.setOptions({ breaks: true, gfm: true });
            }
            libsLoaded = true;
            return true;
        })();
        return libsLoading;
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function render(text, options) {
        if (!text) return '';
        const opts = options || {};
        if (window.marked && window.DOMPurify) {
            try {
                const raw = marked.parse(text);
                return DOMPurify.sanitize(raw, {
                    ADD_ATTR: ['target', 'rel'],
                    ALLOWED_TAGS: opts.allowTags || DEFAULT_ALLOWED_TAGS
                });
            } catch (e) {
                console.warn('[NexusMarkdown] render fail:', e);
            }
        }
        return escapeHtml(text).replace(/\n/g, '<br>');
    }

    async function renderAsync(text, options) {
        await injectLibs();
        return render(text, options);
    }

    function postProcess(container) {
        if (!container) return;
        if (window.hljs) {
            container.querySelectorAll('pre code').forEach(block => {
                if (block.dataset.nxHighlighted) return;
                try {
                    hljs.highlightElement(block);
                    block.dataset.nxHighlighted = '1';
                } catch (e) {}
            });
        }
        container.querySelectorAll('a').forEach(a => {
            if (!a.target) a.target = '_blank';
            if (!a.rel) a.rel = 'noopener noreferrer';
        });
        container.querySelectorAll('pre').forEach(pre => {
            if (pre.querySelector('.nx-md-copy')) return;
            const code = pre.querySelector('code');
            if (!code) return;
            const lang = (code.className.match(/language-(\w+)/) || [])[1] || '';
            if (lang) {
                const tag = document.createElement('span');
                tag.className = 'nx-md-lang';
                tag.textContent = lang;
                pre.appendChild(tag);
            }
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'nx-md-copy';
            btn.textContent = '复制';
            btn.addEventListener('click', () => {
                const text = code.textContent || '';
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(text).then(() => {
                        btn.textContent = '已复制';
                        setTimeout(() => { btn.textContent = '复制'; }, 1500);
                    }).catch(() => {});
                }
            });
            pre.appendChild(btn);
        });
    }

    function renderTo(element, text, options) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (!el) return;
        el.innerHTML = render(text, options);
        el.classList.add('nx-md');
        postProcess(el);
    }

    async function renderToAsync(element, text, options) {
        await injectLibs();
        renderTo(element, text, options);
    }

    function directive(options) {
        const opts = options || {};
        return {
            mounted(el, binding) {
                applyDirective(el, binding.value, opts);
            },
            updated(el, binding) {
                if (binding.value === binding.oldValue) return;
                applyDirective(el, binding.value, opts);
            }
        };
    }

    function applyDirective(el, value, opts) {
        const text = value === null || value === undefined ? '' : String(value);
        const fallback = () => { el.innerHTML = escapeHtml(text).replace(/\n/g, '<br>'); };
        if (!window.NexusMarkdown) { fallback(); return; }
        NexusMarkdown.injectLibs().then(() => {
            el.innerHTML = NexusMarkdown.render(text, opts);
            el.classList.add('nx-md');
            NexusMarkdown.postProcess(el);
        }).catch(fallback);
    }

    function install(vueApp, options) {
        if (!vueApp || !vueApp.directive) return null;
        const d = directive(options);
        vueApp.directive('md', d);
        return d;
    }

    const NexusMarkdown = {
        version: VERSION,
        injectLibs,
        render,
        renderAsync,
        renderTo,
        renderToAsync,
        escapeHtml,
        postProcess,
        directive,
        install,
        DEFAULT_ALLOWED_TAGS
    };

    window.NexusMarkdown = NexusMarkdown;
})();
