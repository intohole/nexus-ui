(function () {
    const NuxEmptyState = {
        name: 'NuxEmptyState',
        props: {
            icon: { type: String, default: '💡' },
            title: { type: String, default: '这里还空着' },
            description: { type: String, default: '' },
            hint: { type: String, default: '' },
            primaryText: { type: String, default: '' },
            secondaryText: { type: String, default: '' },
            primaryLoading: { type: Boolean, default: false },
        },
        emits: ['primary', 'secondary'],
        template: `
            <div class="nx-empty-state">
                <i v-if="icon">{{ icon }}</i>
                <h3>{{ title }}</h3>
                <p v-if="description">{{ description }}</p>
                <div v-if="hint" class="nx-empty-hint">{{ hint }}</div>
                <div v-if="primaryText || secondaryText" class="nx-empty-actions">
                    <button v-if="primaryText" class="nux-btn nux-btn--primary"
                            :disabled="primaryLoading" @click="$emit('primary')">
                        <span v-if="primaryLoading" class="nx-spinner" style="width:14px;height:14px;margin-right:6px;"></span>
                        {{ primaryLoading ? '…' : primaryText }}
                    </button>
                    <button v-if="secondaryText" class="nux-btn nux-btn--ghost" @click="$emit('secondary')">
                        {{ secondaryText }}
                    </button>
                </div>
            </div>
        `
    };

    window.NuxEmptyState = NuxEmptyState;
})();