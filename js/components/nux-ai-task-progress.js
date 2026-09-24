(function () {
    if (window.NuxAiTaskProgress) return;
    if (!window.Vue) return;

    var NuxAiTaskProgress = {
        name: 'NuxAiTaskProgress',
        props: {
            title: { type: String, default: '正在生成' },
            stages: { type: Array, default: function () { return []; } },
            current: { type: [String, Number], default: null },
            percent: { type: Number, default: null },
            message: { type: String, default: '' },
            cancellable: { type: Boolean, default: false },
            compact: { type: Boolean, default: false }
        },
        emits: ['cancel'],
        computed: {
            normalized: function () {
                var list = [];
                var source = Array.isArray(this.stages) ? this.stages : [];
                for (var i = 0; i < source.length; i++) {
                    var item = source[i];
                    if (item && typeof item === 'object') {
                        list.push({ key: item.key === undefined ? String(i) : String(item.key), label: item.label || '' });
                    } else {
                        list.push({ key: String(i), label: item === undefined || item === null ? '' : String(item) });
                    }
                }
                return list;
            },
            currentIndex: function () {
                var list = this.normalized;
                if (!list.length) return -1;
                if (typeof this.current === 'number' && !isNaN(this.current)) {
                    return Math.min(Math.max(Math.round(this.current), 0), list.length - 1);
                }
                if (typeof this.current === 'string' && this.current) {
                    for (var i = 0; i < list.length; i++) {
                        if (list[i].key === this.current) return i;
                    }
                    return -1;
                }
                return -1;
            },
            pct: function () {
                if (typeof this.percent === 'number' && !isNaN(this.percent)) {
                    return Math.min(Math.max(Math.round(this.percent), 0), 100);
                }
                if (this.currentIndex >= 0 && this.normalized.length) {
                    return Math.round(((this.currentIndex + 1) / this.normalized.length) * 100);
                }
                return 0;
            },
            pctText: function () {
                return this.pct + '%';
            },
            activeLabel: function () {
                return this.currentIndex >= 0 ? this.normalized[this.currentIndex].label : '';
            }
        },
        methods: {
            stateOf: function (index) {
                if (this.currentIndex < 0) return 'pending';
                if (index < this.currentIndex) return 'done';
                if (index === this.currentIndex) return 'active';
                return 'pending';
            }
        },
        template: `
            <div class="nux-ai-task" :class="{ 'is-compact': compact }" role="status" aria-live="polite">
                <div class="nux-ai-task-head">
                    <span class="nux-ai-task-spinner" aria-hidden="true"></span>
                    <span class="nux-ai-task-title">{{ title }}</span>
                    <span v-if="!compact" class="nux-ai-task-pct">{{ pctText }}</span>
                </div>
                <ol v-if="normalized.length" class="nux-ai-task-stages">
                    <li v-for="(stage, i) in normalized" :key="stage.key"
                        class="nux-ai-task-stage" :class="'is-' + stateOf(i)">
                        <span class="nux-ai-task-dot" aria-hidden="true"></span>
                        <span class="nux-ai-task-stage-label">{{ stage.label }}</span>
                    </li>
                </ol>
                <div class="nux-ai-task-bar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100" aria-label="生成进度">
                    <div class="nux-ai-task-bar-val" :style="{ width: pct + '%' }"></div>
                </div>
                <p v-if="message || activeLabel" class="nux-ai-task-msg">{{ message || activeLabel }}</p>
                <div v-if="cancellable || $slots.actions" class="nux-ai-task-foot">
                    <button v-if="cancellable" type="button" class="nux-btn nux-btn--ghost nux-ai-task-cancel" @click="$emit('cancel')">取消生成</button>
                    <slot name="actions"></slot>
                </div>
            </div>
        `
    };

    if (window.Vue && Vue.component) {
        try { Vue.component('nux-ai-task-progress', NuxAiTaskProgress); } catch (e) {}
    }

    window.NuxAiTaskProgress = NuxAiTaskProgress;
})();