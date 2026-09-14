(function () {
    'use strict';
    const { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } = Vue;

    const NuxSettingsDrawer = {
        name: 'NuxSettingsDrawer',
        props: {
            modelValue: { type: Boolean, default: false },
            sections: { type: Array, default: () => [] },
            activeKey: { type: String, default: '' },
            title: { type: String, default: '设置' },
            appName: { type: String, default: '' },
            appIcon: { type: String, default: '⚙️' },
            hashPrefix: { type: String, default: 'settings' }
        },
        emits: ['update:modelValue', 'update:activeKey', 'navigate', 'close'],
        setup(props, { emit }) {
            const open = ref(props.modelValue);
            const current = ref(props.activeKey || (props.sections[0] || {}).key || '');
            let lastFocus = null;

            const first = computed(() => (props.sections[0] || {}).key || '');
            const currentSection = computed(() => props.sections.find((s) => s.key === current.value) || {});

            function applyHash() {
                const m = location.hash.match(new RegExp('#/?' + props.hashPrefix + '/([^/]+)'));
                if (!m) return;
                const key = m[1];
                if (props.sections.some((s) => s.key === key) && key !== current.value) {
                    current.value = key;
                }
                if (!open.value) setOpen(true);
            }

            function syncHash() {
                const prefix = props.hashPrefix;
                const desired = '#/' + prefix + '/' + current.value;
                if (location.hash !== desired) {
                    history.replaceState(null, '', desired);
                }
            }

            function setOpen(v) {
                open.value = v;
                emit('update:modelValue', v);
                if (v) {
                    syncHash();
                    document.body.style.overflow = 'hidden';
                    lastFocus = document.activeElement;
                    nextTick(() => {
                        const el = document.querySelector('.nx-settings-drawer-panel');
                        if (el) el.focus();
                    });
                } else {
                    document.body.style.overflow = '';
                    try {
                        if (lastFocus && lastFocus.focus) lastFocus.focus();
                    } catch (e) { }
                }
            }

            function pick(key) {
                if (key === current.value) return;
                current.value = key;
                emit('update:activeKey', key);
                syncHash();
                emit('navigate', key);
            }

            function close() {
                setOpen(false);
                emit('close');
                const prefix = props.hashPrefix;
                if (location.hash.indexOf('#' + prefix) === 1 || location.hash.indexOf('#/' + prefix) === 1) {
                    history.replaceState(null, '', location.pathname + location.search);
                }
            }

            function onKeydown(e) {
                if (e.key === 'Escape') close();
            }

            const onHashChange = () => {
                if (!location.hash) { if (open.value) setOpen(false); return; }
                applyHash();
            };

            watch(() => props.modelValue, (v) => { if (v !== open.value) setOpen(v); });
            watch(() => props.activeKey, (k) => { if (k && k !== current.value) current.value = k; });
            watch(() => props.sections.length, () => {
                if (!current.value && props.sections.length) current.value = props.sections[0].key;
            });

            onMounted(() => {
                if (props.sections.length && !current.value) current.value = props.sections[0].key;
                window.addEventListener('hashchange', onHashChange);
                window.addEventListener('keydown', onKeydown);
                applyHash();
            });
            onBeforeUnmount(() => {
                window.removeEventListener('hashchange', onHashChange);
                window.removeEventListener('keydown', onKeydown);
                document.body.style.overflow = '';
            });

            return {
                open, current, currentSection, first,
                setOpen, pick, close, onKeydown
            };
        },
        template: `
            <teleport to="body">
                <transition name="nx-settings-fade">
                    <div v-if="open" class="nx-settings-overlay" @click.self="close"></div>
                </transition>
                <transition name="nx-settings-pop">
                    <div v-if="open" class="nx-settings-drawer" role="dialog" aria-modal="true"
                         tabindex="-1" @keydown.esc="close">
                        <div class="nx-settings-wrap">
                            <aside class="nx-settings-rail">
                                <div class="nx-settings-brand" @click="pick(first)">
                                    <span class="nx-settings-brand-icon">{{ appIcon }}</span>
                                    <div class="nx-settings-brand-text">
                                        <strong>{{ appName || title }}</strong>
                                        <em>{{ title }}</em>
                                    </div>
                                    <button class="nx-settings-close" aria-label="关闭设置" @click="close">✕</button>
                                </div>
                                <nav class="nx-settings-nav" aria-label="设置栏目">
                                    <button v-for="s in sections" :key="s.key"
                                        :class="['nx-settings-nav-item', { active: s.key === current }]"
                                        @click="pick(s.key)">
                                        <span class="nx-settings-nav-ico">{{ s.icon }}</span>
                                        <span class="nx-settings-nav-main">
                                            <span class="nx-settings-nav-label">{{ s.label }}</span>
                                            <span v-if="s.desc" class="nx-settings-nav-desc">{{ s.desc }}</span>
                                        </span>
                                    </button>
                                </nav>
                                <div class="nx-settings-rail-foot">设置即存即生效</div>
                            </aside>
                            <section class="nx-settings-body">
                                <div class="nx-settings-page-head">
                                    <h2 class="nx-settings-page-title">{{ currentSection.icon }} {{ currentSection.label }}</h2>
                                    <p v-if="currentSection.desc" class="nx-settings-page-desc">{{ currentSection.desc }}</p>
                                </div>
                                <div class="nx-settings-page">
                                    <slot name="page" :key="current" :section="currentSection"></slot>
                                </div>
                            </section>
                        </div>
                    </div>
                </transition>
            </teleport>
        `
    };

    window.NuxSettingsDrawer = NuxSettingsDrawer;
})();