/* nexus-utils dom —— nexus-utils.js 聚合入口的本体模块（由 build_all.py 拼接），直引入口或随 nexus-all 加载 */
(function() {
    const utils = window.NexusUtils = window.NexusUtils || {};
    Object.assign(utils, {
        scrollLock: (function() {
            let count = 0;
            let prevOverflow = '';
            let prevPaddingRight = '';
            return {
                lock() {
                    count++;
                    if (count > 1) return;
                    const body = document.body;
                    prevOverflow = body.style.overflow;
                    prevPaddingRight = body.style.paddingRight;
                    const gap = window.innerWidth - document.documentElement.clientWidth;
                    body.style.overflow = 'hidden';
                    if (gap > 0) body.style.paddingRight = gap + 'px';
                },
                unlock() {
                    if (count === 0) return;
                    count--;
                    if (count > 0) return;
                    document.body.style.overflow = prevOverflow;
                    document.body.style.paddingRight = prevPaddingRight;
                }
            };
        })(),

        downloadFile(content, filename, mimeType = 'text/plain') {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        },

        autoResize(el) {
            if (!el) return;
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        },

        setViewportHeight() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--nx-vh', `${vh}px`);
            document.documentElement.style.setProperty('--nx-vh-full', `${vh * 100}px`);
        },

        escapeHtml(text) {
            if (text === null || text === undefined) return '';
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        hexToRgba(hex, alpha = 1) {
            if (typeof hex !== 'string') return `rgba(99, 102, 241, ${alpha})`;
            let h = hex.trim().replace('#', '');
            if (h.length === 3) h = h.split('').map(c => c + c).join('');
            if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(99, 102, 241, ${alpha})`;
            const r = parseInt(h.slice(0, 2), 16);
            const g = parseInt(h.slice(2, 4), 16);
            const b = parseInt(h.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        },

        isDarkColor(hex) {
            if (typeof hex !== 'string' || hex.length < 7) return false;
            const h = hex.trim().replace('#', '');
            if (!/^[0-9a-fA-F]{6}$/.test(h)) return false;
            const r = parseInt(h.slice(0, 2), 16);
            const g = parseInt(h.slice(2, 4), 16);
            const b = parseInt(h.slice(4, 6), 16);
            return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
        },

        compressImage(file, opts = {}) {
            const maxDim = opts.maxDim || 1600;
            const quality = opts.quality || 0.85;
            const output = opts.output || 'file';
            return new Promise((resolve) => {
                if (!file || !/^image\//.test(file.type || '')) { resolve(file); return; }
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    const longest = Math.max(img.width || 1, img.height || 1);
                    const mime = opts.mime || (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
                    if (longest <= maxDim && mime === file.type && output === 'file') { resolve(file); return; }
                    const scale = Math.min(1, maxDim / longest);
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
                    canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
                    const ctx = canvas.getContext('2d');
                    if (mime === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    if (output === 'dataurl') { resolve(canvas.toDataURL(mime, quality)); return; }
                    canvas.toBlob((blob) => {
                        if (!blob) { resolve(file); return; }
                        if (output === 'blob') { resolve(blob); return; }
                        const base = (file.name || 'image').replace(/\.[^.\/]+$/, '');
                        const ext = mime === 'image/png' ? '.png' : '.jpg';
                        resolve(new File([blob], base + ext, { type: mime }));
                    }, mime, quality);
                };
                img.src = url;
            });
        },

        isDarkTheme() {
            return document.documentElement.getAttribute('data-theme') === 'dark';
        },

        chartText(darkColor = '#a0a0a0', lightColor = '#333') {
            return utils.isDarkTheme() ? darkColor : lightColor;
        },

        getPathPrefix() {
            if (window.PATH_PREFIX) return window.PATH_PREFIX;
            const scripts = document.querySelectorAll('script[src]');
            for (const script of scripts) {
                const src = script.getAttribute('src');
                if (src && src.startsWith('/') && !src.startsWith('//')) {
                    const match = src.match(/^\/([^/]+)\//);
                    if (match && match[1] !== 'static' && match[1] !== 'api') {
                        window.PATH_PREFIX = '/' + match[1];
                        return window.PATH_PREFIX;
                    }
                }
            }
            window.PATH_PREFIX = '';
            return '';
        },

        prefersReducedMotion() {
            try {
                return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
            } catch (e) { return false; }
        },

        injectStyle(id, css) {
            if (!id || document.getElementById(id)) return;
            const style = document.createElement('style');
            style.id = id;
            style.textContent = Array.isArray(css) ? css.join('\n') : css;
            (document.head || document.documentElement).appendChild(style);
        },

        motionDuration(ms) {
            return utils.prefersReducedMotion() ? 0 : ms;
        },
    });
    utils.setViewportHeight();
    utils._resizeHandler = utils.debounce(utils.setViewportHeight, 100);
    window.addEventListener('resize', utils._resizeHandler);
})();
