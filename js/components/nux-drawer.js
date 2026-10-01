(function() {
    const NuxDrawer = {
        name: 'NuxDrawer',
        props: {
            modelValue: { type: Boolean, default: false },
            side: { type: String, default: 'left' },
            width: { type: String, default: '280px' },
            escClose: { type: Boolean, default: true },
            closeOnOverlay: { type: Boolean, default: true }
        },
        emits: ['update:modelValue'],
        setup(props, { emit }) {
            const refs = Vue.ref(null);
            const close = () => emit('update:modelValue', false);
            const overlay = NexusUtils.overlayBehavior({
                panel: () => refs.value,
                escEnabled: () => props.escClose && props.modelValue,
                requestClose: close
            });

            Vue.watch(() => props.modelValue, (open) => {
                Vue.nextTick(() => {
                    if (open) overlay.acquire();
                    else overlay.release();
                });
            });
            Vue.onBeforeUnmount(() => overlay.release());

            const onOverlayClick = () => { if (props.closeOnOverlay) close(); };

            return { refs, close, onOverlayClick };
        },
        template: `
            <teleport to="body">
                <transition name="nux-drawer-overlay">
                    <div v-if="modelValue" class="nx-drawer-overlay" :class="{'open': modelValue}" @click="onOverlayClick"></div>
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
