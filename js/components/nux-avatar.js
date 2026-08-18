(function() {
    const NuxAvatar = {
        name: 'NuxAvatar',
        props: {
            src: { type: String, default: '' },
            name: { type: String, default: '' },
            size: { type: String, default: 'md' },
            shape: { type: String, default: 'circle' }
        },
        computed: {
            initial() {
                return this.name ? this.name.charAt(0).toUpperCase() : '';
            },
            sizeClass() {
                return `nux-avatar-${this.size}`;
            }
        },
        template: `
            <span :class="['nux-avatar', sizeClass, shape === 'square' ? 'nux-avatar-square' : '']">
                <img v-if="src" :src="src" :alt="name" class="nux-avatar-img">
                <span v-else-if="initial" class="nux-avatar-initial">{{ initial }}</span>
                <svg v-else class="nux-avatar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </span>
        `
    };
    window.NuxAvatar = NuxAvatar;
})();
