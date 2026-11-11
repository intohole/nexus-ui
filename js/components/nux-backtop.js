(function() {
    const NuxBacktop = {
        name: 'NuxBacktop',
        props: {
            threshold: { type: Number, default: 300 },
            bottom: { type: String, default: '' },
            right: { type: String, default: '' }
        },
        emits: ['click'],
        data() {
            return { visible: false };
        },
        computed: {
            style() {
                const s = {};
                if (this.bottom) s.bottom = this.bottom;
                if (this.right) s.right = this.right;
                return s;
            }
        },
        methods: {
            onIntersect(entries) {
                this.visible = !entries[entries.length - 1].isIntersecting;
            },
            toTop() {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                this.$emit('click');
            }
        },
        mounted() {
            const sentinel = document.createElement('div');
            sentinel.setAttribute('data-nux-backtop-sentinel', '');
            sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;';
            document.body.insertBefore(sentinel, document.body.firstChild);
            this._sentinel = sentinel;
            this._observer = new IntersectionObserver(this.onIntersect, {
                rootMargin: this.threshold + 'px 0px 0px 0px'
            });
            this._observer.observe(sentinel);
        },
        beforeUnmount() {
            if (this._observer) this._observer.disconnect();
            if (this._sentinel && this._sentinel.parentNode) this._sentinel.parentNode.removeChild(this._sentinel);
        },
        template: `
            <transition name="nux-backtop-fade">
                <button v-if="visible" type="button" class="nux-backtop" :style="style" aria-label="回到顶部" @click="toTop">
                    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 16V5"/><path d="m5 9 5-5 5 5"/></svg>
                </button>
            </transition>
        `
    };
    window.NuxBacktop = NuxBacktop;
})();
