(function() {
    const NuxGrid = {
        name: 'NuxGrid',
        props: {
            cols: { type: Number, default: 3 },
            min: { type: String, default: '' },
            gap: { type: String, default: '' }
        },
        computed: {
            style() {
                const s = {};
                if (this.min) {
                    s['--nux-grid-min'] = this.min;
                } else {
                    s['--nux-grid-cols'] = this.cols;
                }
                if (this.gap) s['--nux-grid-gap'] = this.gap;
                return s;
            }
        },
        template: `
            <div class="nux-grid" :class="{ 'nux-grid--auto': !!min }" :style="style">
                <slot></slot>
            </div>
        `
    };
    window.NuxGrid = NuxGrid;
})();
