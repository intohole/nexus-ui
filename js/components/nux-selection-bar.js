(function() {
    const NuxSelectionBar = {
        name: 'NuxSelectionBar',
        props: {
            count: { type: Number, default: 0 },
            countLabel: { type: String, default: '已选 {n} 项' },
            clearLabel: { type: String, default: '取消' }
        },
        emits: ['clear'],
        computed: {
            countText() {
                return this.countLabel.replace('{n}', this.count);
            }
        },
        template: `
            <transition name="nux-undo">
                <div v-if="count > 0" class="nux-selection-bar">
                    <span class="nux-selection-count">{{ countText }}</span>
                    <div class="nux-selection-actions"><slot></slot></div>
                    <button class="nux-selection-clear" @click="$emit('clear')">{{ clearLabel }}</button>
                </div>
            </transition>
        `
    };
    window.NuxSelectionBar = NuxSelectionBar;
})();
