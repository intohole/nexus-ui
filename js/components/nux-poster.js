(function () {
    if (window.NuxPoster) return;

    var DESIGN_WIDTH = 1080;

    function px(val, scale) {
        var n = parseFloat(val);
        if (isNaN(n)) return '0px';
        return (n * (scale || 1)).toFixed(2) + 'px';
    }

    function hexToRgb(hex) {
        var m = String(hex || '').match(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/);
        if (!m) return null;
        var h = m[1];
        if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
        var n = parseInt(h, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function alpha(hex, opacity) {
        var rgb = hexToRgb(hex);
        if (!rgb) return 'rgba(255,255,255,' + opacity + ')';
        return 'rgba(' + rgb.join(',') + ',' + opacity + ')';
    }

    function patternStyle(pattern) {
        if (pattern === 'grid') return 'linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px)';
        if (pattern === 'scan') return 'repeating-linear-gradient(0deg,rgba(255,255,255,.045) 0 1px,transparent 1px 4px)';
        if (pattern === 'rings') return 'radial-gradient(circle at 50% 50%,transparent 0 38%,rgba(255,255,255,.06) 38% 39%,transparent 39% 54%,rgba(255,255,255,.05) 54% 55%,transparent 55% 70%,rgba(255,255,255,.03) 70% 71%,transparent 71%)';
        return 'radial-gradient(circle,rgba(255,255,255,.055) 1.5px,transparent 1.6px)';
    }
    function patternSize(pattern) {
        if (pattern === 'grid') return '36px 36px';
        if (pattern === 'dots') return '24px 24px';
        return 'auto';
    }
    function patternObj(pattern) {
        return { backgroundImage: patternStyle(pattern), backgroundSize: patternSize(pattern) };
    }

    function glowItems(glow) {
        return (glow || []).map(function (g) {
            var col = alpha(g.color, g.opacity == null ? 0.45 : g.opacity);
            return {
                left: (g.x || 50) + '%', top: (g.y || 50) + '%',
                width: (g.size || 55) + '%', height: (g.size || 55) + '%',
                background: 'radial-gradient(circle,' + col + ' 0%,transparent 68%)',
            };
        });
    }

    function bgStyle(background, scale) {
        var bg = background || {};
        if (bg.type === 'image' && bg.url) {
            return { backgroundImage: 'url(' + bg.url + ')', backgroundSize: 'cover', backgroundPosition: 'center' };
        }
        if (bg.type === 'color' && bg.color) {
            return { background: bg.color };
        }
        var from = bg.from || '#0f1b2d';
        var to = bg.to || '#1e3a5f';
        var direction = bg.direction || '160deg';
        return { background: 'linear-gradient(' + direction + ',' + from + ',' + to + ')' };
    }

    function buildBgLayer(bg, width) {
        var base = bgStyle(bg, width / DESIGN_WIDTH);
        var isGrad = !base.backgroundImage && !base.background;
        var css = ['position:absolute', 'inset:0', 'width:100%', 'height:100%'];
        Object.keys(base).forEach(function (k) { css.push(k + ':' + base[k]); });
        var html = '<div style="' + css.join(';') + '"></div>';
        if (isGrad) {
            var pat = patternStyle((bg && bg.pattern) || '');
            var psz = patternSize((bg && bg.pattern) || '');
            html += '<div style="position:absolute;inset:0;pointer-events:none;width:100%;height:100%;background-image:' + pat + ';background-size:' + psz + ';"></div>';
            (bg.glow || []).forEach(function (g) {
                var c = hexToRgb(g.color) ? alpha(g.color, g.opacity == null ? 0.45 : g.opacity) : g.color;
                html += '<div style="position:absolute;left:' + (g.x || 50) + '%;top:' + (g.y || 50) + '%;width:' + (g.size || 55) + '%;height:' + (g.size || 55) + '%;transform:translate(-50%,-50%);pointer-events:none;background:radial-gradient(circle,' + c + ' 0%,transparent 68%)"></div>';
            });
        }
        return html;
    }

    function elementStyle(el, scale) {
        var p = el.position || {};
        var st = el.style || {};
        var s = scale || 1;
        var style = {
            position: 'absolute',
            left: (p.x || 0) + '%', top: (p.y || 0) + '%',
            width: (p.w || 80) + '%', height: (p.h || 10) + '%',
            boxSizing: 'border-box',
            fontSize: px(st.fontSize || 16, s),
            fontWeight: st.fontWeight || 'normal',
            color: st.color || '#ffffff',
            lineHeight: st.lineHeight || '1.4',
            letterSpacing: st.letterSpacing ? px(st.letterSpacing, s) : 'normal',
            overflowWrap: 'break-word', wordBreak: 'break-word', margin: 0,
        };
        if (st.alignment) style.textAlign = st.alignment;
        if (st.background) style.background = st.background;
        if (st.borderRadius) style.borderRadius = px(st.borderRadius, s);
        if (st.padding) style.padding = px(st.padding, s);
        if (st.textTransform) style.textTransform = st.textTransform;
        if (st.opacity) style.opacity = st.opacity;
        if (st.textShadow) style.textShadow = st.textShadow.replace(/(\d+)/g, function (m) { return px(m, s); });
        if (st.boxShadow) style.boxShadow = st.boxShadow.replace(/(\d+)/g, function (m) { return px(m, s); });
        if (st.border) style.border = st.border;
        if (st.gap != null) style.gap = st.gap;

        if (st.textGradient && st.textGradient.from && st.textGradient.to) {
            var deg = st.textGradient.direction || '120deg';
            style.backgroundImage = 'linear-gradient(' + deg + ',' + st.textGradient.from + ',' + st.textGradient.to + ')';
            style.WebkitBackgroundClip = 'text';
            style.backgroundClip = 'text';
            style.color = 'transparent';
        }

        if (el.element_type === 'cta' || el.element_type === 'badge' || el.element_type === 'price' || el.element_type === 'icon') {
            style.display = 'flex';
            style.alignItems = 'center';
            style.justifyContent = st.alignment === 'left' ? 'flex-start' : st.alignment === 'right' ? 'flex-end' : 'center';
            style.width = st.width && st.width !== 'auto' ? st.width + '%' : 'auto';
        }
        if (el.element_type === 'cta' && st.background) {
            style.padding = (st.padding ? px(st.padding, s) : px(12, s)) + ' ' + px(24, s);
        } else if (el.element_type === 'price') {
            style.fontWeight = st.fontWeight || 900;
            style.fontStyle = st.fontStyle || 'normal';
            if (st.background) style.padding = px(st.padding || 12, s) + ' ' + px(st.padding || 12, s);
        } else if (el.element_type === 'icon') {
            style.lineHeight = 1;
            style.fontSize = st.fontSize && st.fontSize > 40 ? px(st.fontSize, s) : px(st.fontSize || 96, s);
        } else if (el.element_type === 'divider') {
            style.borderTop = (st.borderWidth ? px(st.borderWidth, s) : '1px') + ' solid ' + (st.color || 'rgba(255,255,255,0.6)');
            style.height = '0'; style.overflow = 'hidden';
        } else if (el.element_type === 'image') {
            style.overflow = 'hidden';
            style.borderRadius = px(st.borderRadius || 0, s);
        } else if (el.element_type === 'info-card') {
            style.display = 'flex'; style.flexDirection = 'column';
            style.justifyContent = 'center';
            style.background = st.background || 'rgba(255,255,255,0.09)';
            style.borderRadius = px(st.borderRadius || 18, s);
            style.padding = px(st.padding || 16, s);
            style.backdropFilter = 'blur(6px)';
        } else if (el.element_type === 'decoration' || el.element_type === 'rect') {
            style.background = st.background || st.color || 'rgba(255,255,255,0.12)';
            style.borderRadius = px(st.borderRadius || 0, s);
        }
        return style;
    }

    function renderContent(el, scale) {
        var type = el.element_type;
        var content = String(el.content || '');
        var st = el.style || {};
        var text = content.replace(/</g, '&lt;');
        if (type === 'image' && (content.indexOf('http') === 0 || content.charAt(0) === '/')) {
            var src = content.charAt(0) === '/' ? (window.PATH_PREFIX || '') + content : content;
            return '<img src="' + src + '" onerror="this.style.display=\'none\'" style="width:100%;height:100%;object-fit:cover;display:block">';
        }
        if (type === 'cta' || type === 'badge') {
            var pad = 'padding:' + (st.padding ? px(st.padding, scale) : px(12, scale)) + ' ' + px(24, scale) + ';width:auto;';
            return '<span style="' + pad + 'border-radius:' + px(st.borderRadius || 40, scale) + ';background:' + (st.background || 'transparent') + ';font-size:' + px(st.fontSize || 16, scale) + ';font-weight:' + (st.fontWeight || 700) + ';">' + text + '</span>';
        }
        if (type === 'price') {
            var sign = st.currency == null ? '' : '<span style="font-size:' + px((st.fontSize || 16) * 0.5, scale) + ';">' + st.currency + '</span>';
            return sign + text;
        }
        if (type === 'info-card') {
            var lines = text.split('\n');
            return lines.map(function (ln) {
                var t = ln.replace(/^[•·\-]\s*/, '');
                return '<div style="font-size:' + px(st.fontSize || 20, scale) + ';line-height:1.4;opacity:.95;">• ' + t + '</div>';
            }).join('');
        }
        return text;
    }

    function buildInner(blueprint, scale) {
        var canvas = blueprint.canvas || { width: DESIGN_WIDTH, height: DESIGN_WIDTH };
        var bg = blueprint.background || {};
        var parts = ['<div style="position:relative;width:100%;height:100%;overflow:hidden;boxSizing:border-box">'];
        parts.push(buildBgLayer(bg, canvas.width));
        (blueprint.elements || []).forEach(function (el) {
            var st = elementStyle(el, scale);
            var inline = [];
            Object.keys(st).forEach(function (k) { inline.push(k + ':' + st[k]); });
            parts.push('<div style="' + inline.join(';') + '">' + renderContent(el, scale) + '</div>');
        });
        parts.push('</div>');
        return parts.join('');
    }

    async function capture(blueprint, scale) {
        var canvas = blueprint.canvas || { width: DESIGN_WIDTH, height: DESIGN_WIDTH };
        var designW = canvas.width || DESIGN_WIDTH;
        var designH = canvas.height || DESIGN_WIDTH;
        var node = document.createElement('div');
        node.style.cssText = 'position:fixed;left:-99999px;top:0;z-index:-1;width:' + designW + 'px;height:' + designH + 'px;overflow:hidden;background:#1e3a5f;';
        node.innerHTML = buildInner(blueprint, designW / DESIGN_WIDTH);
        document.body.appendChild(node);
        try {
            var img = await window.html2canvas(node, { scale: scale || 2, backgroundColor: null, useCORS: true, logging: false });
            return img.toDataURL('image/png');
        } finally {
            node.remove();
        }
    }

    async function download(blueprint, filename) {
        var dataUrl = await capture(blueprint, 2);
        var link = document.createElement('a');
        link.download = filename || 'poster.png';
        link.href = dataUrl;
        link.click();
    }

    var CSS = [
        '.nux-poster{display:flex;flex-direction:column;gap:10px;width:100%;align-items:center}',
        '.nux-poster-frame{width:100%;max-width:420px;border-radius:8px;overflow:hidden;box-shadow:0 12px 32px rgba(31,43,62,.18),0 0 0 1px rgba(31,43,62,.06);align-self:center;transition:transform .2s}',
        '.nux-poster-frame:hover{transform:translateY(-2px)}',
        '.nux-poster-canvas{background:#1e3a5f;position:relative}',
        '.np-pattern{position:absolute;inset:0;pointer-events:none}',
        '.np-glow{position:absolute;transform:translate(-50%,-50%);pointer-events:none}',
        '.nux-poster-el{pointer-events:none}',
    ];
    (function injectCss() {
        var tag = document.getElementById('nux-poster-style');
        if (tag) return;
        var style = document.createElement('style');
        style.id = 'nux-poster-style';
        style.textContent = CSS.join('');
        (document.head || document.documentElement).appendChild(style);
    })();

    var posterComponent = {
        name: 'nux-poster',
        props: {
            blueprint: { type: Object, default: null },
            maxWidth: { type: Number, default: 420 },
            downloadable: { type: Boolean, default: false },
        },
        data: function () { return { scale: 1 }; },
        template: [
            '<div class="nux-poster">',
            '<div class="nux-poster-frame" :style="frameStyle">',
            '<div class="nux-poster-canvas" :style="canvasStyle">',
            '<div v-if="pattern" class="np-pattern" :style="patternCss()"></div>',
            '<div v-for="(g, gi) in glows" :key="\'glow-\' + gi" class="np-glow" :style="g"></div>',
            '<div v-for="(el, eidx) in elements" :key="eidx" class="nux-poster-el" :class="\'nux-pe-\' + el.element_type" :style="elementStyle(el)">',
            '<img v-if="isImage(el)" :src="imageSrc(el)" alt="">',
            '<span v-else-if="needHtml(el)" v-html="renderText(el)"></span>',
            '<template v-else>{{ el.content }}</template>',
            '</div></div></div>',
        ].join(''),
        computed: {
            canvas: function () {
                return (this.blueprint && this.blueprint.canvas) || { width: DESIGN_WIDTH, height: DESIGN_WIDTH };
            },
            frameStyle: function () {
                return { aspectRatio: this.canvas.width + ' / ' + this.canvas.height, maxWidth: this.maxWidth + 'px' };
            },
            canvasStyle: function () {
                var base = { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', boxSizing: 'border-box' };
                var bg = bgStyle(this.blueprint && this.blueprint.background, this.scale);
                Object.keys(bg).forEach(function (k) { base[k] = bg[k]; });
                return base;
            },
            pattern: function () {
                return (this.blueprint && this.blueprint.background && this.blueprint.background.pattern) || '';
            },
            glows: function () {
                return glowItems((this.blueprint && this.blueprint.background && this.blueprint.background.glow) || []);
            },
            elements: function () {
                return (this.blueprint && this.blueprint.elements) || [];
            },
        },
        methods: {
            elementStyle: function (el) { return elementStyle(el, this.scale); },
            patternCss: function () { return patternObj(this.pattern); },
            isImage: function (el) {
                var c = el.content || '';
                return el.element_type === 'image' && (c.indexOf('http') === 0 || c.charAt(0) === '/');
            },
            imageSrc: function (el) {
                var c = el.content || '';
                return c.charAt(0) === '/' ? (window.PATH_PREFIX || '') + c : c;
            },
            isGradText: function (el) {
                var st = el.style || {};
                return !!(st.textGradient && st.textGradient.from && st.textGradient.to);
            },
            renderText: function (el) { return renderContent(el, this.scale); },
            needHtml: function (el) {
                return el.element_type === 'info-card' || el.element_type === 'price';
            },
            async doDownload() {
                try { await download(this.blueprint, 'poster.png'); }
                catch (e) { if (window.showToast) window.showToast('下载失败，请重试', 'error'); }
            },
        },
        mounted: function () {
            if (!('ResizeObserver' in window)) return;
            var self = this;
            var ob = new ResizeObserver(function (entries) {
                var w = entries[0].contentRect.width;
                if (w > 0) self.scale = w / self.canvas.width;
            });
            ob.observe(this.$el.querySelector('.nux-poster-canvas'));
            this._ob = ob;
        },
        beforeDestroy: function () { if (this._ob) this._ob.disconnect(); },
    };

    window.NuxPoster = posterComponent;
    window.PosterRender = { px: px, elementStyle: elementStyle, buildInner: buildInner, capture: capture, download: download, component: posterComponent };
    if (window.Vue) {
        try { Vue.component('nux-poster', posterComponent); } catch (e) {}
    }
})();