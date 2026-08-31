(function() {
    const NuxUndoToast = {
        name: 'NuxUndoToast',
        props: {
            text: { type: String, default: '' },
            undoLabel: { type: String, default: '撤销' },
            duration: { type: Number, default: 6000 },
            raised: { type: Boolean, default: false }
        },
        emits: ['undo', 'dismiss'],
        setup(props, { emit }) {
            const { ref, watch, onBeforeUnmount } = Vue;
            const visible = ref(false);
            let timer = null;
            function clearTimer() {
                if (timer) { clearTimeout(timer); timer = null; }
            }
            watch(() => props.text, (v) => {
                clearTimer();
                if (!v) { visible.value = false; return; }
                visible.value = true;
                if (props.duration > 0) {
                    timer = setTimeout(() => {
                        timer = null;
                        visible.value = false;
                        emit('dismiss');
                    }, props.duration);
                }
            });
            onBeforeUnmount(clearTimer);
            function undo() {
                clearTimer();
                visible.value = false;
                emit('undo');
            }
            return { visible, undo };
        },
        template: `
            <transition name="nux-undo">
                <div v-if="visible && text" :class="['nux-undo-toast', { raised }]">
                    <span class="nux-undo-text">{{ text }}</span>
                    <button class="nux-undo-btn" @click="undo">{{ undoLabel }}</button>
                </div>
            </transition>
        `
    };
    window.NuxUndoToast = NuxUndoToast;
})();
