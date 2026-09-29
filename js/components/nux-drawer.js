(function() {
    const NuxDrawer = {
        name: 'NuxDrawer',
        props: {
            modelValue: { type: Boolean, default: false },
            side: { type: String, default: 'left' },
            width: { type: String, default: '280px' }
        },
        emits: ['update:modelValue'],
        setup(props, { emit }) {
            const refs = Vue.ref(null);
            let restoreFocusEl = null;

            const close = () => emit('update:modelValue', false);

            function onKeydown(e) {
                if (e.key === 'Escape') {
                    if (props.modelValue) close();
                    return;
                }
                if (e.key !== 'Tab') return;
                const list = NexusUtils.focusables(refs.value);
                if (!list.length) return;
                const first = list[0];
                const last = list[list.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }

            Vue.watch(() => props.modelValue, (open) => {
                Vue.nextTick(() => {
                    if (open) {
                        if (window.NexusUtils) NexusUtils.scrollLock.lock();
                        if (document.activeElement && document.activeElement !== document.body) {
                            restoreFocusEl = document.activeElement;
                        }
                        document.addEventListener('keydown', onKeydown);
                        Vue.nextTick(() => {
                            const list = NexusUtils.focusables(refs.value);
                            if (list.length) list[0].focus();
                        });
                    } else {
                        document.removeEventListener('keydown', onKeydown);
                        if (window.NexusUtils) NexusUtils.scrollLock.unlock();
                        if (restoreFocusEl && restoreFocusEl.focus) {
                            restoreFocusEl.focus();
                        }
                        restoreFocusEl = null;
                    }
                });
            });
            Vue.onBeforeUnmount(() => {
                document.removeEventListener('keydown', onKeydown);
                if (props.modelValue && window.NexusUtils) NexusUtils.scrollLock.unlock();
            });

            return { refs, close };
        },
        template: `
            <teleport to="body">
                <transition name="nux-drawer-overlay">
                    <div v-if="modelValue" class="nx-drawer-overlay" :class="{'open': modelValue}" @click="close"></div>
                </transition>
                <transition :name="side === 'right' ? 'nux-drawer-right' : 'nux-drawer-left'">
                    <div v-if="modelValue" ref="refs"
                         :class="['nx-drawer', side === 'right' ? 'nx-drawer-right' : '']"
                         :style="{ width: width, maxWidth: '85vw', transform: modelValue ? 'translateX(0)' : '' }">
                        <slot></slot>
                    </div>
                </transition>
            </teleport>
        `
    };

    window.NuxDrawer = NuxDrawer;
})();
