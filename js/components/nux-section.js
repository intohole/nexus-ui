(function() {
    const NuxSection = {
        name: 'NuxSection',
        props: {
            title: { type: String, default: '' },
            description: { type: String, default: '' },
            flat: { type: Boolean, default: false }
        },
        template: `
            <section class="nux-section" :class="{ 'nux-section--flat': flat }">
                <header v-if="title || description || $slots.actions" class="nux-section-head">
                    <div class="nux-section-meta">
                        <h3 v-if="title" class="nux-section-title">{{ title }}</h3>
                        <p v-if="description" class="nux-section-desc">{{ description }}</p>
                    </div>
                    <div v-if="$slots.actions" class="nux-section-actions">
                        <slot name="actions"></slot>
                    </div>
                </header>
                <div class="nux-section-body">
                    <slot></slot>
                </div>
            </section>
        `
    };
    window.NuxSection = NuxSection;
})();
