(function () {
    var NuxOnboardingStrip = {
        name: 'nux-onboarding-strip',
        props: {
            steps: { type: Array, default: function () { return []; } },
            done: { type: Array, default: function () { return []; } },
            dismissKey: { type: String, default: '' }
        },
        data: function () {
            return { dismissed: false };
        },
        computed: {
            active: function () {
                var doneSet = {};
                (this.done || []).forEach(function (k) { doneSet[k] = true; });
                var list = this.steps || [];
                for (var i = 0; i < list.length; i++) {
                    if (!doneSet[list[i].key]) return list[i];
                }
                return null;
            }
        },
        methods: {
            dismiss: function () {
                this.dismissed = true;
                if (this.dismissKey) {
                    try { window.localStorage.setItem(this.dismissKey, '1'); } catch (e) {}
                }
                this.$emit('dismiss');
            }
        },
        template: `
<div v-if="active && !dismissed" class="nux-ob-strip" role="status">
    <div class="nux-ob-main">
        <div class="nux-ob-ico" v-if="active.icon"><span>{{ active.icon }}</span></div>
        <div style="min-width:0;">
            <div class="nux-ob-title">{{ active.title }}</div>
            <div class="nux-ob-desc" v-if="active.desc">{{ active.desc }}</div>
        </div>
    </div>
    <div class="nux-ob-actions">
        <button v-if="active.btn" type="button" class="nux-ob-btn" @click="$emit('action', active)">{{ active.btn }}</button>
        <button v-if="dismissKey" type="button" class="nux-ob-dismiss" @click="dismiss" aria-label="暂时忽略">✕</button>
    </div>
</div>
        `
    };

    NuxOnboardingStrip.mount = function (el, options) {
        if (!el) return null;
        options = options || {};
        var app = Vue.createApp({
            data: function () {
                return {
                    steps: options.steps || [],
                    done: options.done || [],
                    dismissKey: options.dismissKey || ''
                };
            },
            methods: {
                onAction: function (step) { if (options.onAction) options.onAction(step); },
                onDismiss: function () { if (options.onDismiss) options.onDismiss(); }
            },
            template: '<nux-onboarding-strip :steps="steps" :done="done" :dismiss-key="dismissKey" @action="onAction" @dismiss="onDismiss"></nux-onboarding-strip>'
        });
        app.component('nux-onboarding-strip', NuxOnboardingStrip);
        return app.mount(el);
    };

    window.NuxOnboardingStrip = NuxOnboardingStrip;
})();
