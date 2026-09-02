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
            onScroll() {
                this.visible = (window.scrollY || document.documentElement.scrollTop) > this.threshold;
            },
            toTop() {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                this.$emit('click');
            }
        },
        mounted() {
            window.addEventListener('scroll', this.onScroll, { passive: true });
            this.onScroll();
        },
        beforeUnmount() {
            window.removeEventListener('scroll', this.onScroll);
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
