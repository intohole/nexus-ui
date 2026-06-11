(function() {
    const { ref, createApp, h } = Vue;

    const confirmState = ref({ visible: false, title: '', message: '', resolve: null });

    const NuxConfirm = {
        name: 'NuxConfirm',
        setup() {
            const confirm = () => {
                confirmState.value.visible = false;
                if (confirmState.value.resolve) confirmState.value.resolve(true);
            };
            const cancel = () => {
                confirmState.value.visible = false;
                if (confirmState.value.resolve) confirmState.value.resolve(false);
            };
            return { confirmState, confirm, cancel };
        },
        template: `
            <teleport to="body">
                <transition name="nux-modal">
                    <div v-if="confirmState.visible" class="nx-modal-overlay" @click="cancel">
                        <div class="nx-modal" style="max-width: 400px" @click.stop>
                            <div class="nx-modal-title" v-if="confirmState.title">{{ confirmState.title }}</div>
                            <p style="color: var(--nx-text-secondary); margin: var(--nx-space-4) 0;">{{ confirmState.message }}</p>
                            <div class="nux-modal-footer">
                                <button class="nx-btn nx-btn-ghost" @click="cancel">取消</button>
                                <button class="nx-btn nx-btn-primary" @click="confirm">确定</button>
                            </div>
                        </div>
                    </div>
                </transition>
            </teleport>
        `
    };

    const confirm = (message, title = '确认操作') => {
        return new Promise((resolve) => {
            confirmState.value = { visible: true, title, message, resolve };
        });
    };

    window.NuxConfirm = NuxConfirm;
    window.nuxConfirm = confirm;
})();
