(function() {
    const NuxOnboarding = {
        name: 'nux-onboarding',
        props: {
            steps: { type: Array, default: () => [] },
            doneKey: { type: String, default: 'nux_onboarding_done_v1' },
            showAfter: { type: Number, default: 0 }
        },
        data: function() {
            return {
                visible: false,
                step: 0
            };
        },
        computed: {
            current: function() {
                return this.steps[this.step] || null;
            },
            isLast: function() {
                return this.step >= this.steps.length - 1;
            }
        },
        mounted: function() {
            var self = this;
            if (!this.steps || !this.steps.length) return;
            try {
                if (window.localStorage.getItem(this.doneKey)) return;
            } catch (e) { return; }
            if (this.showAfter > 0) {
                setTimeout(function() { self.visible = true; }, this.showAfter);
            } else {
                this.visible = true;
            }
        },
        methods: {
            next: function() {
                if (this.isLast) { this.finish(); return; }
                this.step += 1;
            },
            finish: function() {
                try { window.localStorage.setItem(this.doneKey, String(Date.now())); } catch (e) {}
                this.visible = false;
                this.$emit('done');
            },
            skip: function() {
                try { window.localStorage.setItem(this.doneKey, String(Date.now())); } catch (e) {}
                this.visible = false;
                this.$emit('skip');
            },
            go: function(link) {
                if (link) window.location.href = link;
                this.finish();
            }
        },
        template: `
            <div class="nux-onboarding-mask" v-if="visible" role="dialog" aria-modal="true" aria-label="新手引导">
                <div class="nux-onboarding-card" @click.self.stop>
                    <button type="button" class="nux-onboarding-close" @click="skip" aria-label="跳过引导"><i class="fa fa-xmark"></i></button>
                    <div class="nux-onboarding-step-icon" v-if="current">
                        <i v-if="current.icon" :class="current.icon"></i>
                        <span v-else>{{ (current.step || 0) + 1 }}</span>
                    </div>
                    <h3 class="nux-onboarding-title" v-if="current">{{ current.title }}</h3>
                    <p class="nux-onboarding-desc" v-if="current">{{ current.desc }}</p>
                    <div class="nux-onboarding-links" v-if="current && current.links && current.links.length">
                        <a v-for="lnk in current.links" :key="lnk.label" :href="lnk.url" class="nux-onboarding-link"
                           :class="{ 'nux-onboarding-link-primary': lnk.primary }" @click="finish">
                            <i v-if="lnk.icon" :class="lnk.icon"></i>{{ lnk.label }}
                        </a>
                    </div>
                    <div class="nux-onboarding-dots" v-if="steps.length > 1">
                        <span v-for="(s, i) in steps" :key="i" class="nux-onboarding-dot" :class="{ active: i === step }"></span>
                    </div>
                    <div class="nux-onboarding-actions">
                        <button type="button" v-if="!isLast" class="nux-onboarding-btn nux-onboarding-btn-primary" @click="next">下一步</button>
                        <button type="button" v-else class="nux-onboarding-btn nux-onboarding-btn-primary" @click="finish">开始使用</button>
                        <button type="button" class="nux-onboarding-btn nux-onboarding-btn-ghost" @click="skip">跳过</button>
                    </div>
                </div>
            </div>
        `
    };
    window.NuxOnboarding = NuxOnboarding;
})();