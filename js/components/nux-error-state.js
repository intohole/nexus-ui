(function() {
    const NuxErrorState = {
        name: 'NuxErrorState',
        props: {
            icon: { type: String, default: '⚠️' },
            title: { type: String, default: '加载失败' },
            message: { type: String, default: '' },
            code: { type: String, default: '' },
            retryText: { type: String, default: '重试' }
        },
        emits: ['retry'],
        template: `
            <div class="nx-empty-state nux-error-state" role="alert" aria-live="assertive">
                <i v-if="icon" aria-hidden="true">{{ icon }}</i>
                <h3>{{ title }}</h3>
                <p v-if="message">{{ message }}</p>
                <div v-if="retryText" class="nx-empty-actions">
                    <button class="nux-btn nux-btn--primary" @click="$emit('retry')">{{ retryText }}</button>
                </div>
                <div v-if="code" class="nux-error-code">{{ code }}</div>
            </div>
        `
    };

    window.NuxErrorState = NuxErrorState;
})();
