(function () {
    'use strict';

    const VERSION = '1.3.0';

    // vendor 相对路径（无版本字面量）。绝对地址在运行时按「加载 nexus-all.js / nexus-markdown.js 的
    // script 标签 src」推导同版本 vendor 目录，避免服务器清旧版本目录后固定版本回退 404。
    const VENDOR_PATHS = {
        marked: 'marked.umd.js',
        dompurify: 'purify.min.js',
        highlight: 'highlight.min.js',
        highlightCss: 'styles/atom-one-dark.min.css',
        katex: 'katex/katex.min.js',
        katexCss: 'katex/katex.min.css'
    };

    function resolveLibBase() {
        // 1) document.currentScript 在同步执行时可用（绝对 URL，相对路径引用也能正确解析）
        try {
            const cur = (document.currentScript && document.currentScript.src) || '';
            const m = cur.match(/^(.*)\/js\/nexus-(?:all|markdown)\.js(?:[?#].*)?$/);
            if (m) return m[1] + '/vendor/';
        } catch (e) { /* ignore */ }
        // 2) 兜底扫描页面 script 标签
        const scripts = document.scripts || [];
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].src || scripts[i].getAttribute('src') || '';
            const m = src.match(/^(.*)\/js\/nexus-(?:all|markdown)\.js(?:[?#].*)?$/);
            if (m) return m[1] + '/vendor/';
        }
        return '';
    }

    let _libBase = null;
    function libBase() {
        if (_libBase === null) _libBase = resolveLibBase();
        return _libBase;
    }

    function libs() {
        const base = libBase();
        if (!base) return null;
        const out = {};
        Object.keys(VENDOR_PATHS).forEach(function (k) { out[k] = base + VENDOR_PATHS[k]; });
        return out;
    }

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

    function hasKaTeXCss() {
        if (window.__NX_KATEX_CSS__) return true;
        return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .some(l => (l.href || '').indexOf('katex') > -1);
    }

    async function injectLibs() {
        if (libsLoaded) return true;
        if (libsLoading) return libsLoading;
        libsLoading = (async () => {
            const LIBS = libs();
            if (!LIBS) {
                console.warn('[NexusMarkdown] 无法从 nexus-all.js / nexus-markdown.js 的加载路径推导 vendor 目录，跳过 Markdown 库注入');
                libsLoaded = true;
                return false;
            }
            await Promise.all([
                hasGlobal('marked') ? Promise.resolve() : loadScript(LIBS.marked),
                hasGlobal('DOMPurify') ? Promise.resolve() : loadScript(LIBS.dompurify),
                hasGlobal('hljs') ? Promise.resolve() : loadScript(LIBS.highlight),
                hasGlobal('katex') ? Promise.resolve() : loadScript(LIBS.katex),
                hasHighlightCss() ? Promise.resolve() : loadStylesheet(LIBS.highlightCss).then(() => { window.__NX_HLJS_CSS__ = 1; }),
                hasKaTeXCss() ? Promise.resolve() : loadStylesheet(LIBS.katexCss)
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

    function wrapBareLatex(text) {
        const BARE_OPS = 'times|cdot|pm|mp|le|leq|ge|geq|ne|neq|approx|equiv|infty|partial|nabla|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|omega|sum|prod|int|sqrt|vec|left|right|begin|end|qquad|quad';
        const BARE_LATEX_RE = new RegExp('\\\\[a-zA-Z]+\\s*(?:\\[[^\\]]*\\]\\s*)?(?:\\{[^{}]*\\})+|\\\\(' + BARE_OPS + ')(?![a-zA-Z])', 'g');
        const parts = [];
        let last = 0;
        let i = 0;
        const len = text.length;
        while (i < len) {
            const ch = text[i];
            if (ch === '\\' && i + 1 < len && text[i + 1] === '$') { i += 2; continue; }
            if (ch === '$') {
                let close;
                if (text[i + 1] === '$') {
                    close = text.indexOf('$$', i + 2);
                    if (close === -1) break;
                } else {
                    close = text.indexOf('$', i + 1);
                    if (close === -1) break;
                }
                const end = close + (text[i + 1] === '$' ? 2 : 1);
                parts.push(text.slice(last, i));
                parts.push(text.slice(i, end));
                i = end;
                last = i;
                continue;
            }
            i++;
        }
        parts.push(text.slice(last));
        return parts.map(function (part, idx) {
            if (idx % 2 === 1) return part;
            return part.replace(BARE_LATEX_RE, function (m) { return '$' + m + '$'; });
        }).join('');
    }

    function protectMath(text) {
        const mathBlocks = [];
        const codeBlocks = [];
        const noCode = String(text).replace(/(```[\s\S]*?```|`[^`\n]*`)/g, function (m) {
            codeBlocks.push(m);
            return '\u0003NXMDCODE' + (codeBlocks.length - 1) + '\u0004';
        });
        const wrapped = wrapBareLatex(noCode);
        const noMath = wrapped.replace(/\$\$\s*([\s\S]+?)\s*\$\$|\$([^\s$][^$\n]{0,98}[^\s$])\$/g, function (m) {
            mathBlocks.push(m);
            return '\u0001NXMDMATH' + (mathBlocks.length - 1) + '\u0002';
        });
        return {
            mathBlocks: mathBlocks,
            text: noMath.replace(/\u0003NXMDCODE(\d+)\u0004/g, function (m, i) {
                return codeBlocks[Number(i)];
            })
        };
    }

    function restoreMath(html, mathBlocks) {
        if (!mathBlocks || !mathBlocks.length) return html;
        return html.replace(/\u0001NXMDMATH(\d+)\u0002/g, function (m, i) {
            const expr = mathBlocks[Number(i)];
            if (expr === undefined) return '';
            const display = expr.indexOf('$$') === 0 && expr.lastIndexOf('$$') === expr.length - 2;
            const body = (display ? expr.slice(2, -2) : expr.slice(1, -1)).trim();
            if (!body) return '';
            if (window.katex) {
                try {
                    const hasCJK = /[\u4e00-\u9fff]/.test(body);
                    const looksMath = /[\\^_{}]/.test(body);
                    if (hasCJK && !looksMath) return escapeHtml(body);
                    return katex.renderToString(body, { displayMode: display, throwOnError: false, strict: false });
                } catch (e) {}
            }
            return escapeHtml(body);
        });
    }

    const MATH_LATIN_BASES = [0x1D400, 0x1D434, 0x1D468, 0x1D49C, 0x1D4D0, 0x1D504, 0x1D538, 0x1D56C, 0x1D5A0, 0x1D5D4, 0x1D608, 0x1D63C, 0x1D670];
    const MATH_DIGIT_BASES = [0x1D7CE, 0x1D7D8, 0x1D7E2, 0x1D7EC, 0x1D7F6];
    const LETTERLIKE_MAP = {
        '\u210E': 'h', '\u210F': 'h', '\u2110': 'I', '\u2112': 'L', '\u2113': 'l',
        '\u2118': 'P', '\u211B': 'R', '\u211C': 'R', '\u211D': 'R', '\u2124': 'Z',
        '\u2126': 'O', '\u2128': 'Z', '\u212C': 'B', '\u212D': 'C', '\u212F': 'e',
        '\u2130': 'E', '\u2131': 'F', '\u2132': 'F', '\u2133': 'M', '\u2134': 'o'
    };
    const MATH_ALNUM_RE = /[\u{1D400}-\u{1D7FF}\u210E\u210F\u2110\u2112\u2113\u2118\u211B-\u211D\u2124\u2126\u2128\u212C\u212D\u212F-\u2134]/gu;

    function mathCharToAscii(ch) {
        const cp = ch.codePointAt(0);
        if (cp >= 0x1D400 && cp <= 0x1D7FF) {
            for (const base of MATH_LATIN_BASES) {
                if (cp >= base && cp < base + 52) {
                    const off = cp - base;
                    return String.fromCharCode(off < 26 ? 65 + off : 97 + off - 26);
                }
            }
            for (const base of MATH_DIGIT_BASES) {
                if (cp >= base && cp < base + 10) return String.fromCharCode(48 + cp - base);
            }
            return ch;
        }
        return LETTERLIKE_MAP[ch] || ch;
    }

    function normalizeMathUnicode(text) {
        if (text === null || text === undefined) return '';
        return String(text).replace(MATH_ALNUM_RE, mathCharToAscii);
    }

    function render(text, options) {
        if (!text) return '';
        const opts = options || {};
        const normalized = normalizeMathUnicode(text);
        if (window.marked && window.DOMPurify) {
            try {
                const protected_ = protectMath(normalized);
                const raw = marked.parse(protected_.text);
                const sanitized = DOMPurify.sanitize(raw, {
                    ADD_ATTR: ['target', 'rel'],
                    ALLOWED_TAGS: opts.allowTags || DEFAULT_ALLOWED_TAGS
                });
                return restoreMath(sanitized, protected_.mathBlocks);
            } catch (e) {
                console.warn('[NexusMarkdown] render fail:', e);
            }
        }
        return escapeHtml(normalized).replace(/\n/g, '<br>');
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
