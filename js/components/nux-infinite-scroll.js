(function () {
    const STYLE_ID = 'nux-infinite-scroll-style';
    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
.nis{display:block}
.nis-sentinel{height:1px;width:100%}
.nis-status{display:flex;align-items:center;justify-content:center;gap:var(--nx-space-2,8px);padding:var(--nx-space-4,16px);font-size:var(--nx-text-sm,14px);color:var(--nx-text-muted,#94a3b8)}
.nis-status--error{color:var(--nx-danger,#ef4444)}
.nis-spinner{width:16px;height:16px;flex-shrink:0;border-radius:var(--nx-radius-full,9999px);border:2px solid rgba(var(--app-accent-rgb,99,102,241),.25);border-top-color:var(--app-accent,#6366f1);animation:nis-spin .8s linear infinite}
@keyframes nis-spin{to{transform:rotate(360deg)}}
@media(hover:none) and (pointer:coarse){.nis-status{padding:var(--nx-space-5,20px) var(--nx-space-4,16px);min-height:44px}}
@media(prefers-reduced-motion:reduce){.nis-spinner{animation-duration:1.6s}}
`;
        document.head.appendChild(style);
    }
    ensureStyle();

    const NuxInfiniteScroll = {
        name: 'NuxInfiniteScroll',
        props: {
            loading: { type: Boolean, default: false },
            finished: { type: Boolean, default: false },
            offset: { type: Number, default: 200 },
            immediate: { type: Boolean, default: true },
            loadingText: { type: String, default: '加载中…' },
            finishedText: { type: String, default: '没有更多了' },
            errorText: { type: String, default: '' }
        },
        emits: ['load'],
        setup(props, ctx) {
            const sentinel = Vue.ref(null);
            const visible = Vue.ref(false);
            let observer = null;
            let started = false;

            function blocked() {
                return props.loading || props.finished || !!props.errorText;
            }

            function trigger() {
                if (blocked()) return;
                ctx.emit('load');
            }

            function onIntersect(entries) {
                entries.forEach((entry) => {
                    visible.value = entry.isIntersecting;
                    if (!entry.isIntersecting) return;
                    if (!started && !props.immediate) {
                        started = true;
                        return;
                    }
                    started = true;
                    trigger();
                });
            }

            function scrollParent(el) {
                let node = el ? el.parentElement : null;
                while (node && node !== document.body && node !== document.documentElement) {
                    const style = window.getComputedStyle(node);
                    const overflowY = style.overflowY;
                    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
                        return node;
                    }
                    node = node.parentElement;
                }
                return null;
            }

            function connect() {
                if (typeof IntersectionObserver === 'undefined' || !sentinel.value) return;
                if (observer) observer.disconnect();
                observer = new IntersectionObserver(onIntersect, {
                    root: scrollParent(sentinel.value),
                    rootMargin: '0px 0px ' + props.offset + 'px 0px',
                    threshold: 0
                });
                observer.observe(sentinel.value);
            }

            Vue.onMounted(connect);
            Vue.onBeforeUnmount(() => {
                if (observer) observer.disconnect();
                observer = null;
            });
            Vue.watch(() => props.loading, (value, old) => {
                if (old && !value && visible.value) trigger();
            });
            Vue.watch(() => props.finished, (value) => {
                if (value && observer) observer.disconnect();
            });
            Vue.watch(() => props.offset, connect);

            return { sentinel };
        },
        template: `
<div class="nis">
    <slot></slot>
    <div ref="sentinel" class="nis-sentinel" aria-hidden="true"></div>
    <div v-if="loading" class="nis-status" role="status" aria-live="polite">
        <span class="nis-spinner" aria-hidden="true"></span>
        <span>{{ loadingText }}</span>
    </div>
    <div v-else-if="errorText" class="nis-status nis-status--error" role="alert">{{ errorText }}</div>
    <div v-else-if="finished" class="nis-status nis-status--finished">{{ finishedText }}</div>
</div>
`
    };

    window.NuxInfiniteScroll = NuxInfiniteScroll;
})();
