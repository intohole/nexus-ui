(function () {
    const STYLE_ID = 'nux-sortable-style';
    const DRAG_THRESHOLD = 6;

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
.nsk{position:relative;display:flex;flex-direction:column;gap:var(--nx-space-2,8px)}
.nsk--h{flex-direction:row}
.nsk-item{position:relative;display:flex;align-items:center;gap:var(--nx-space-2,8px);border-radius:var(--nx-radius-sm,6px);transition:box-shadow var(--nx-transition-fast,150ms ease),transform var(--nx-transition-fast,150ms ease)}
.nsk-dragging{z-index:3;touch-action:none;user-select:none;background:var(--nx-bg-surface,#fff);box-shadow:var(--nx-shadow-lg,0 8px 24px rgba(0,0,0,.12));transform:scale(1.02)}
.nsk-handle{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:var(--nx-radius-sm,6px);background:transparent;color:var(--nx-text-muted,#94a3b8);cursor:grab;touch-action:none}
.nsk-handle:hover{color:var(--nx-text-heading,#0f172a);background:var(--nx-bg-hover,#f1f5f9)}
.nsk-handle:focus-visible{outline:2px solid var(--app-accent,#6366f1);outline-offset:2px}
.nsk-handle:disabled{cursor:default;opacity:.4}
.nsk-icon{width:10px;height:16px;display:block}
@media(hover:none) and (pointer:coarse){.nsk-handle{width:44px;height:44px}}
`;
        document.head.appendChild(style);
    }
    ensureStyle();

    function itemKeyOf(item, itemKey, index) {
        if (itemKey && item && typeof item === 'object' && item[itemKey] !== undefined && item[itemKey] !== null) {
            return String(item[itemKey]);
        }
        return 'nsk-' + index;
    }

    function moveItem(list, from, to) {
        const next = (list || []).slice();
        if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
        next.splice(to, 0, next.splice(from, 1)[0]);
        return next;
    }

    function indexAtPosition(rects, position, vertical, skipIndex) {
        if (!rects || !rects.length) return -1;
        let target = 0;
        for (let i = 0; i < rects.length; i++) {
            if (i === skipIndex) continue;
            const rect = rects[i] || {};
            const mid = vertical ? rect.top + rect.height / 2 : rect.left + rect.width / 2;
            if (position > mid) target++;
        }
        return Math.min(target, rects.length - 1);
    }

    const NuxSortable = {
        name: 'NuxSortable',
        props: {
            modelValue: { type: Array, default: () => [] },
            itemKey: { type: String, default: 'id' },
            disabled: { type: Boolean, default: false },
            handle: { type: String, default: '' },
            direction: { type: String, default: 'vertical' }
        },
        emits: ['update:modelValue', 'change', 'sort-start', 'sort-end'],
        setup(props, ctx) {
            const containerRef = Vue.ref(null);
            const dragging = Vue.ref(false);
            const preview = Vue.ref([]);
            const dragIndex = Vue.ref(-1);
            let startIndex = -1;
            let startX = 0;
            let startY = 0;
            let pointerId = null;
            let active = false;

            const vertical = () => props.direction !== 'horizontal';

            const directionClass = Vue.computed(() => (vertical() ? 'nsk--v' : 'nsk--h'));

            const rows = Vue.computed(() => {
                const list = dragging.value ? preview.value : (props.modelValue || []);
                return list.map((item, index) => ({
                    item: item,
                    index: index,
                    key: itemKeyOf(item, props.itemKey, index)
                }));
            });

            function rowElements() {
                if (!containerRef.value || !containerRef.value.querySelectorAll) return [];
                return Array.prototype.slice.call(containerRef.value.querySelectorAll('[data-sort-index]'));
            }

            function targetIndexAt(clientX, clientY) {
                const elements = rowElements();
                if (!elements.length) return -1;
                const rects = elements.map((el) => (el.getBoundingClientRect ? el.getBoundingClientRect() : null));
                return indexAtPosition(rects, vertical() ? clientY : clientX, vertical(), dragging.value ? dragIndex.value : -1);
            }

            function commit(next, from, to) {
                ctx.emit('update:modelValue', next);
                ctx.emit('change', next, { from: from, to: to });
            }

            function moveBy(index, to) {
                const list = props.modelValue || [];
                if (to < 0 || to >= list.length || to === index) return;
                commit(moveItem(list, index, to), index, to);
            }

            function onHandleKeydown(event, index) {
                if (props.disabled) return;
                const isVertical = vertical();
                const total = (props.modelValue || []).length;
                let to = null;
                if ((event.key === 'ArrowUp' && isVertical) || (event.key === 'ArrowLeft' && !isVertical)) {
                    to = index - 1;
                } else if ((event.key === 'ArrowDown' && isVertical) || (event.key === 'ArrowRight' && !isVertical)) {
                    to = index + 1;
                } else if (event.key === 'Home') {
                    to = 0;
                } else if (event.key === 'End') {
                    to = total - 1;
                } else {
                    return;
                }
                event.preventDefault();
                moveBy(index, to);
            }

            function detach() {
                window.removeEventListener('pointermove', onPointerMove);
                window.removeEventListener('pointerup', onPointerUp);
                window.removeEventListener('pointercancel', onPointerUp);
            }

            function onPointerDown(event) {
                if (props.disabled || active || dragging.value) return;
                if (typeof event.button === 'number' && event.button !== 0) return;
                const target = event.target;
                if (!target || !target.closest || !containerRef.value || !containerRef.value.contains) return;
                const row = target.closest('[data-sort-index]');
                if (!row || !containerRef.value.contains(row)) return;
                if (props.handle) {
                    const hit = target.closest(props.handle) || target.closest('.nsk-handle');
                    if (!hit || !row.contains(hit)) return;
                }
                const index = Number(row.getAttribute('data-sort-index'));
                if (!(index >= 0)) return;
                startIndex = index;
                startX = event.clientX;
                startY = event.clientY;
                pointerId = event.pointerId;
                active = true;
                dragging.value = false;
                dragIndex.value = index;
                preview.value = [];
                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerUp);
            }

            function onPointerMove(event) {
                if (!active || event.pointerId !== pointerId) return;
                if (!dragging.value) {
                    if (Math.abs(event.clientX - startX) < DRAG_THRESHOLD && Math.abs(event.clientY - startY) < DRAG_THRESHOLD) return;
                    preview.value = (props.modelValue || []).slice();
                    dragIndex.value = startIndex;
                    dragging.value = true;
                    ctx.emit('sort-start', { index: startIndex });
                }
                event.preventDefault();
                const to = targetIndexAt(event.clientX, event.clientY);
                if (to >= 0 && to !== dragIndex.value) {
                    preview.value = moveItem(preview.value, dragIndex.value, to);
                    dragIndex.value = to;
                }
            }

            function onPointerUp(event) {
                if (!active || event.pointerId !== pointerId) return;
                detach();
                active = false;
                pointerId = null;
                if (!dragging.value) return;
                const next = preview.value.slice();
                const from = startIndex;
                const to = dragIndex.value;
                dragging.value = false;
                preview.value = [];
                commit(next, from, to);
                ctx.emit('sort-end', { from: from, to: to });
            }

            Vue.onBeforeUnmount(detach);

            return {
                containerRef, dragging, dragIndex, rows, directionClass,
                targetIndexAt, onHandleKeydown, onPointerDown, moveBy
            };
        },
        template: `
<div ref="containerRef" class="nsk" :class="[directionClass, { 'nsk--dragging': dragging }]"
    data-nux-sortable @pointerdown="onPointerDown">
    <div v-for="row in rows" :key="row.key" class="nsk-item"
        :class="{ 'nsk-dragging': dragging && row.index === dragIndex }"
        :data-sort-index="row.index">
        <button type="button" class="nsk-handle" role="button" tabindex="0" aria-label="拖拽排序"
            :disabled="disabled" @keydown="onHandleKeydown($event, row.index)">
            <svg class="nsk-icon" viewBox="0 0 10 16" aria-hidden="true" focusable="false">
                <circle cx="2.5" cy="3" r="1.3" fill="currentColor"></circle>
                <circle cx="7.5" cy="3" r="1.3" fill="currentColor"></circle>
                <circle cx="2.5" cy="8" r="1.3" fill="currentColor"></circle>
                <circle cx="7.5" cy="8" r="1.3" fill="currentColor"></circle>
                <circle cx="2.5" cy="13" r="1.3" fill="currentColor"></circle>
                <circle cx="7.5" cy="13" r="1.3" fill="currentColor"></circle>
            </svg>
        </button>
        <slot :item="row.item" :index="row.index"></slot>
    </div>
</div>
`
    };

    window.NuxSortable = NuxSortable;
})();
