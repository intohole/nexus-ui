(function() {
    const modalStack = NexusUtils.overlayStack();
    let modalUid = 0;
    const NuxModal = {
        name: 'NuxModal',
        props: {
            modelValue: { type: Boolean, default: false },
            title: { type: String, default: '' },
            width: { type: String, default: '520px' },
            showFooter: { type: Boolean, default: true },
            closeOnOverlay: { type: Boolean, default: true },
            escClose: { type: Boolean, default: true }
        },
        emits: ['update:modelValue', 'confirm', 'cancel'],
        setup(props, { emit }) {
            const refs = Vue.ref(null);
            const uid = ++modalUid;
            const close = () => emit('update:modelValue', false);
            const overlay = NexusUtils.overlayBehavior({
                panel: () => refs.value,
                stack: modalStack,
                uid: uid,
                canInteract: () => modalStack.isTop(uid),
                escEnabled: () => props.escClose,
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
            const confirm = () => { emit('confirm'); close(); };
            const cancel = () => { emit('cancel'); close(); };
            return { refs, close, onOverlayClick, confirm, cancel };
        },
        template: `
            <teleport to="body">
                <transition name="nux-modal">
                    <div v-if="modelValue" class="nx-modal-overlay" @click="onOverlayClick">
                        <div ref="refs" class="nx-modal" :style="{ maxWidth: width }" role="dialog" aria-modal="true" :aria-label="title || '弹窗'" @click.stop>
                            <button type="button" class="nx-modal-close" aria-label="关闭" @click="close">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
                            </button>
                            <div v-if="title" class="nx-modal-title">{{ title }}</div>
                            <slot></slot>
                            <div v-if="showFooter" class="nux-modal-footer">
                                <slot name="footer">
                                    <button class="nux-btn nux-btn--ghost" type="button" @click="cancel">取消</button>
                                    <button class="nux-btn nux-btn--primary" type="button" @click="confirm">确定</button>
                                </slot>
                            </div>
                        </div>
                    </div>
                </transition>
            </teleport>
        `
    };

    window.NuxModal = NuxModal;
})();
