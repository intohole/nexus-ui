(function() {
    const NuxAppCard = {
        name: 'NuxAppCard',
        props: {
            app: { type: Object, default: () => ({}) },
            accent: { type: String, default: '' },
            desc: { type: String, default: '' },
            badge: { type: Object, default: null },
            showFav: { type: Boolean, default: false },
            faved: { type: Boolean, default: false },
            editable: { type: Boolean, default: false }
        },
        emits: ['open', 'fav', 'edit'],
        computed: {
            href() {
                return this.app && this.app.url ? this.app.url : '#';
            },
            icon() {
                return this.app && this.app.icon_url ? this.app.icon_url : '';
            },
            name() {
                return this.app && (this.app.display_name || this.app.name) || '';
            },
            desc() {
                if (this.desc) return this.desc;
                return this.app ? (this.app.description || '') : '';
            },
            vars() {
                const p = this.accent || '#818cf8';
                return {
                    '--app-accent': p,
                    '--app-accent-soft': p + '24',
                    '--app-accent-glow': p + '4d'
                };
            }
        },
        methods: {
            emitOpen(e) {
                if (this.app && this.app.url) {
                    e.preventDefault();
                    this.$emit('open', e);
                }
            },
            emitFav(e) {
                e.preventDefault();
                e.stopPropagation();
                this.$emit('fav', e);
            },
            emitEdit(e) {
                e.preventDefault();
                e.stopPropagation();
                this.$emit('edit', e);
            }
        },
        template: `
            <a :href="href" class="nux-app-card" :style="vars" @click="emitOpen">
                <span class="nux-app-card-glow"></span>
                <div class="nux-app-card-top">
                    <img v-if="icon" :src="icon" :alt="name" class="nux-app-card-icon">
                    <div v-else class="nux-app-card-icon-fallback"><i class="fa fa-cube"></i></div>
                    <div class="nux-app-card-actions">
                        <span v-if="badge" :class="['nux-app-card-badge', badge.tone ? 'nux-app-card-badge-' + badge.tone : '']">
                            <i v-if="badge.icon" :class="badge.icon"></i>{{ badge.label }}
                        </span>
                        <button v-if="showFav" type="button" class="nux-app-card-fav" :class="{on: faved}"
                                :title="faved ? '取消收藏' : '收藏'" :aria-label="faved ? '取消收藏' : '收藏'" @click="emitFav">
                            <i class="fa" :class="faved ? 'fa-star' : 'fa-star-o'"></i>
                        </button>
                        <button v-if="editable" type="button" class="nux-app-card-edit" title="编辑应用信息与跳转" @click="emitEdit">
                            <i class="fa fa-sliders"></i>
                        </button>
                    </div>
                </div>
                <div class="nux-app-card-body">
                    <h4 class="nux-app-card-name">{{ name }}</h4>
                    <p class="nux-app-card-desc">{{ desc }}</p>
                </div>
                <span class="nux-app-card-enter">打开 <i class="fa fa-arrow-right"></i></span>
            </a>
        `
    };
    window.NuxAppCard = NuxAppCard;
})();