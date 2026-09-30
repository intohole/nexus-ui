(function() {
    const ACTION_W = 76;
    const OPEN_INSTANCES = [];

    const NuxSwipeActions = {
        name: 'NuxSwipeActions',
        props: {
            leftActions: { type: Array, default: () => [] },
            rightActions: { type: Array, default: () => [] },
            disabled: { type: Boolean, default: false }
        },
        emits: ['action'],
        data() {
            return { offset: 0, dragging: false, settled: true };
        },
        computed: {
            leftWidth() { return this.leftActions.length * ACTION_W; },
            rightWidth() { return this.rightActions.length * ACTION_W; },
            contentStyle() {
                if (!this.offset) return '';
                return 'transform:translateX(' + this.offset + 'px)';
            }
        },
        methods: {
            onDown(e) {
                if (this.disabled || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
                this._sx = e.clientX; this._sy = e.clientY;
                this._axis = null; this._t0 = Date.now(); this._lx = e.clientX;
                this._base = this.offset;
                this.settled = false;
            },
            onMove(e) {
                if (this._sx === undefined || this.disabled) return;
                const dx = e.clientX - this._sx;
                const dy = e.clientY - this._sy;
                if (!this._axis) {
                    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                    this._axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
                    if (this._axis === 'y') { this._sx = undefined; this.settled = true; return; }
                    this.dragging = true;
                    if (this.$refs.content.setPointerCapture) {
                        try { this.$refs.content.setPointerCapture(e.pointerId); } catch (err) {}
                    }
                    this.closeOthers();
                }
                if (!this.dragging) return;
                this._vx = e.clientX - this._lx; this._lx = e.clientX;
                let raw = dx + this._base;
                if (raw > this.leftWidth) raw = this.leftWidth + (raw - this.leftWidth) * 0.35;
                if (raw < -this.rightWidth) raw = -this.rightWidth + (raw + this.rightWidth) * 0.35;
                this.offset = Math.round(raw);
            },
            onUp() {
                if (this._sx === undefined) return;
                this._sx = undefined;
                if (!this.dragging) { this.settled = true; return; }
                this.dragging = false;
                this.settled = true;
                const v = this._vx || 0;
                if (this.offset > 0) {
                    this.offset = (this.offset > this.leftWidth * 0.5 || v > 4) ? this.leftWidth : 0;
                    if (this.offset) OPEN_INSTANCES.push(this);
                } else if (this.offset < 0) {
                    this.offset = (this.offset < -this.rightWidth * 0.5 || v < -4) ? -this.rightWidth : 0;
                    if (this.offset) OPEN_INSTANCES.push(this);
                }
            },
            onCancel() {
                this._sx = undefined;
                this.dragging = false;
                this.settled = true;
                this.offset = 0;
            },
            tapAction(a) {
                this.$emit('action', a.key, a);
                this.close();
            },
            close() {
                this.offset = 0;
                this.settled = true;
            },
            closeOthers() {
                const i = OPEN_INSTANCES.indexOf(this);
                if (i >= 0) OPEN_INSTANCES.splice(i, 1);
                OPEN_INSTANCES.splice(0).forEach(function (inst) {
                    if (inst !== this) inst.close();
                }, this);
            },
            guardClick(e) {
                if (this.offset !== 0) {
                    e.stopPropagation();
                    e.preventDefault();
                    this.close();
                }
            }
        },
        beforeUnmount() {
            const i = OPEN_INSTANCES.indexOf(this);
            if (i >= 0) OPEN_INSTANCES.splice(i, 1);
        },
        template: `
            <div class="nux-swipe" :class="{ 'nux-swipe--disabled': disabled }" role="group">
                <div v-if="leftActions.length" class="nux-swipe__side nux-swipe__side--left" :style="{ width: leftWidth + 'px' }" aria-hidden="true">
                    <button v-for="a in leftActions" :key="a.key" type="button" class="nux-swipe__action" :class="'nux-swipe__action--' + (a.tone || 'neutral')" :aria-label="a.label" tabindex="-1" @click="tapAction(a)">
                        <span v-if="a.icon" class="nux-swipe__action-icon">{{ a.icon }}</span>
                        <span>{{ a.label }}</span>
                    </button>
                </div>
                <div v-if="rightActions.length" class="nux-swipe__side nux-swipe__side--right" :style="{ width: rightWidth + 'px' }" aria-hidden="true">
                    <button v-for="a in rightActions" :key="a.key" type="button" class="nux-swipe__action" :class="'nux-swipe__action--' + (a.tone || 'neutral')" :aria-label="a.label" tabindex="-1" @click="tapAction(a)">
                        <span v-if="a.icon" class="nux-swipe__action-icon">{{ a.icon }}</span>
                        <span>{{ a.label }}</span>
                    </button>
                </div>
                <div ref="content" class="nux-swipe__content" :class="{ 'nux-swipe__content--settled': settled }" :style="contentStyle"
                    @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onCancel"
                    @click.capture="guardClick">
                    <slot></slot>
                </div>
            </div>
        `
    };
    window.NuxSwipeActions = NuxSwipeActions;
})();
