(function () {
    /* nux-reveal-strip 承接条（v2.86.0）—— 承诺动词落点原语，收编各仓手搓 strip/banner 家族。
     * 诚实性语义：可见性由消费方 computed 求交决定（用户级资格旗标 × 条目级属性），
     * 本组件只管呈现与动作承接，不代判资格（piying 前6 P0 谎报判例的平台化防线）。
     * dismissKey 提供时 dismiss 记忆落 localStorage（nxrs: 前缀，TTL 默认 7 天）。
     */
    var DISMISS_PREFIX = 'nxrs:';
    var DEFAULT_ICONS = { info: '💬', success: '🎉', warn: '⚠️', accent: '✨' };

    function readDismiss(key) {
        try {
            var raw = localStorage.getItem(DISMISS_PREFIX + key);
            if (!raw) return false;
            var rec = JSON.parse(raw);
            if (!rec || typeof rec.ts !== 'number') return false;
            return (Date.now() - rec.ts) >= 0 && (Date.now() - rec.ts) < (rec.ttl || 0);
        } catch (e) { return false; }
    }

    function writeDismiss(key, ttl) {
        try {
            localStorage.setItem(DISMISS_PREFIX + key, JSON.stringify({ ts: Date.now(), ttl: ttl }));
        } catch (e) { /* ignore */ }
    }

    var NuxRevealStrip = {
        name: 'NuxRevealStrip',
        props: {
            variant: { type: String, default: 'accent' },
            icon: { type: String, default: '' },
            title: { type: String, required: true },
            desc: { type: String, default: '' },
            ctaText: { type: String, default: '' },
            ctaLoading: { type: Boolean, default: false },
            dismissible: { type: Boolean, default: false },
            dismissKey: { type: String, default: '' },
            dismissTtl: { type: Number, default: 7 * 24 * 3600 * 1000 }
        },
        emits: ['cta', 'dismiss'],
        data: function () { return { hidden: false }; },
        computed: {
            resolvedIcon: function () {
                return this.icon || DEFAULT_ICONS[this.variant] || '✨';
            },
            canDismiss: function () {
                return this.dismissible && !!this.dismissKey;
            },
            cls: function () {
                return ['nx-reveal-strip', 'is-' + this.variant];
            }
        },
        created: function () {
            if (this.canDismiss && readDismiss(this.dismissKey)) this.hidden = true;
        },
        methods: {
            onCta: function () {
                if (this.ctaLoading) return;
                this.$emit('cta');
            },
            onDismiss: function () {
                this.hidden = true;
                if (this.canDismiss) writeDismiss(this.dismissKey, this.dismissTtl);
                this.$emit('dismiss');
            }
        },
        template:
            '<div v-if="!hidden" :class="cls" role="status" aria-live="polite">' +
            '  <span v-if="resolvedIcon" class="nx-rs-icon" aria-hidden="true">{{ resolvedIcon }}</span>' +
            '  <div class="nx-rs-body">' +
            '    <div class="nx-rs-title">{{ title }}</div>' +
            '    <div v-if="desc" class="nx-rs-desc">{{ desc }}</div>' +
            '  </div>' +
            '  <button v-if="ctaText" type="button" class="nux-btn nux-btn--primary nx-rs-cta"' +
            '          :disabled="ctaLoading" @click="onCta">{{ ctaLoading ? \'…\' : ctaText }}</button>' +
            '  <button v-if="dismissible" type="button" class="nx-rs-close" aria-label="关闭" @click="onDismiss">×</button>' +
            '</div>'
    };

    window.NuxRevealStrip = NuxRevealStrip;
})();
