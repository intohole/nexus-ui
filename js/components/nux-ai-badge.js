(function () {
    'use strict';

    const NuxAiBadge = {
        name: 'NuxAiBadge',
        props: {
            size: { type: String, default: 'md' },
            text: { type: String, default: 'AI 生成' },
            tone: { type: String, default: 'accent' }
        },
        computed: {
            cls() {
                return 'nx-ai-badge nx-ai-badge-sm' + (this.size === 'md' ? ' nx-ai-badge-md' : '');
            }
        },
        template: `
            <span :class="cls" :data-tone="tone" class="nx-ai-badge" role="note" aria-label="此内容由 AI 生成">
                <svg class="nx-ai-badge-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                    <path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9L12 3z"/>
                    <path d="M19 15l.8 1.9 1.9.8-1.9.8L19 20.4l-.8-1.9-1.9-.8 1.9-.8L19 15z"/>
                </svg>
                <span class="nx-ai-badge-text">{{ text }}</span>
            </span>
        `
    };

    window.NuxAiBadge = NuxAiBadge;
})();