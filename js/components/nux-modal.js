(function() {
    const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
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
            let restoreFocusEl = null;

            function focusables() {
                return refs.value ? Array.from(refs.value.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null) : [];
            }

            function onKeydown(e) {
                if (e.key === 'Escape') {
                    if (props.escClose) close();
                    return;
                }
                if (e.key !== 'Tab') return;
                const list = focusables();
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
                        if (document.activeElement && document.activeElement !== document.body) {
                            restoreFocusEl = document.activeElement;
                        }
                        document.addEventListener('keydown', onKeydown);
                        Vue.nextTick(() => {
                            const list = focusables();
                            if (list.length) list[0].focus();
                        });
                    } else {
                        document.removeEventListener('keydown', onKeydown);
                        if (restoreFocusEl && restoreFocusEl.focus) {
                            restoreFocusEl.focus();
                        }
                        restoreFocusEl = null;
                    }
                });
            });

            const close = () => emit('update:modelValue', false);
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
                            <div v-if="title" class="nx-modal-title">{{ title }}</div>
                            <slot></slot>
                            <div v-if="showFooter" class="nux-modal-footer">
                                <slot name="footer">
                                    <button class="nx-btn nx-btn-ghost" type="button" @click="cancel">取消</button>
                                    <button class="nx-btn nx-btn-primary" type="button" @click="confirm">确定</button>
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