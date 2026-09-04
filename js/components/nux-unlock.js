(function () {
    const { ref } = Vue;

    const unlocks = ref([]);

    const NuxUnlock = {
        name: 'NuxUnlock',
        setup() {
            return { unlocks };
        },
        template: `
            <div class="nux-unlock-container" v-if="unlocks.length">
                <transition-group name="nux-unlock">
                    <div v-for="u in unlocks" :key="u.id" class="nux-unlock-card" @click="dismiss(u.id)">
                        <span class="nux-unlock-burst" aria-hidden="true"></span>
                        <span class="nux-unlock-icon">{{ u.icon }}</span>
                        <div class="nux-unlock-body">
                            <p class="nux-unlock-label">成就解锁</p>
                            <p class="nux-unlock-title">{{ u.title }}</p>
                            <p v-if="u.desc" class="nux-unlock-desc">{{ u.desc }}</p>
                        </div>
                    </div>
                </transition-group>
            </div>
        `,
        methods: {
            dismiss(id) {
                unlocks.value = unlocks.value.filter(u => u.id !== id);
            }
        }
    };

    const showUnlock = (options = {}) => {
        const { icon = '🏆', title = '新成就' } = options;
        const id = Date.now() + Math.random();
        const duration = (options.duration || 4000);
        unlocks.value.push({ id, icon, title, desc: options.desc || '' });
        setTimeout(() => {
            unlocks.value = unlocks.value.filter(u => u.id !== id);
        }, duration);
    };

    window.NuxUnlock = NuxUnlock;
    window.showUnlock = showUnlock;
})();