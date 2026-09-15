(function () {
    'use strict';
    if (typeof Vue === 'undefined') return;

    const { ref, computed, watch, onMounted, onUnmounted, nextTick } = Vue;

    const NuxSidePanel = {
        name: 'NuxSidePanel',
        props: {
            brandIcon: { type: String, default: '' },
            brandImg: { type: String, default: '' },
            brandName: { type: String, default: '' },
            actionLabel: { type: String, default: '' },
            actionIcon: { type: String, default: '+' },
            actionDisabled: { type: Boolean, default: false },
            tabs: { type: Array, default: () => [] },
            activeTab: { type: String, default: '' },
            items: { type: Array, default: () => [] },
            itemKey: { type: String, default: 'id' },
            titleField: { type: String, default: 'title' },
            itemMeta: { type: Function, default: null },
            activeKey: { type: [String, Number], default: '' },
            statusField: { type: String, default: 'status' },
            removable: { type: Boolean, default: true },
            loading: { type: Boolean, default: false },
            skeleton: { type: Number, default: 5 },
            groupByDate: { type: Boolean, default: false },
            dateField: { type: String, default: 'updated_at' },
            groupToday: { type: String, default: '今天' },
            groupYesterday: { type: String, default: '昨天' },
            groupEarlier: { type: String, default: '更早' },
            searchable: { type: Boolean, default: true },
            searchPlaceholder: { type: String, default: '搜索' },
            searchMin: { type: Number, default: 6 },
            emptyIcon: { type: String, default: '✦' },
            emptyTitle: { type: String, default: '' },
            emptyText: { type: String, default: '' },
            personalTitle: { type: String, default: '个性化' },
            personalItems: { type: Array, default: () => [] },
            userName: { type: String, default: '' },
            width: { type: String, default: '264px' },
            drawerWidth: { type: String, default: '288px' },
            breakpoint: { type: Number, default: 1024 },
            layout: { type: String, default: 'sticky' },
            open: { type: Boolean, default: undefined },
            ariaLabel: { type: String, default: '侧栏导航' }
        },
        emits: ['action', 'brand', 'select', 'remove', 'personal', 'update:open', 'update:activeTab'],
        setup(props, { emit, slots }) {
            const root = ref(null);
            const keyword = ref('');
            const innerOpen = ref(false);
            const mql = window.matchMedia ? window.matchMedia('(max-width: ' + props.breakpoint + 'px)') : null;
            const compact = ref(!!(mql && mql.matches));

            const controlled = computed(() => props.open !== undefined);
            const drawerOpen = computed(() => controlled.value ? !!props.open : innerOpen.value);

            function setOpen(v) {
                if (controlled.value) emit('update:open', v);
                else innerOpen.value = v;
            }
            const close = () => setOpen(false);

            function applyMedia() {
                const next = mql ? mql.matches : window.innerWidth < props.breakpoint;
                if (next === compact.value) return;
                compact.value = next;
                if (!next) {
                    keyword.value = '';
                    setOpen(false);
                }
            }

            function syncViewport() {
                if (!root.value) return;
                const vv = window.visualViewport;
                const h = Math.round((vv && vv.height) || window.innerHeight);
                root.value.style.setProperty('--nxsp-h', h + 'px');
            }

            function onKeydown(e) {
                if (e.key === 'Escape') close();
            }

            let locked = false;
            function syncListeners() {
                const need = compact.value && drawerOpen.value;
                if (need === locked) {
                    if (need) syncViewport();
                    return;
                }
                locked = need;
                const vv = window.visualViewport;
                if (need) {
                    document.body.classList.add('nxsp-lock');
                    window.addEventListener('keydown', onKeydown);
                    window.addEventListener('resize', syncViewport);
                    if (vv) { vv.addEventListener('resize', syncViewport); vv.addEventListener('scroll', syncViewport); }
                    nextTick(syncViewport);
                } else {
                    document.body.classList.remove('nxsp-lock');
                    window.removeEventListener('keydown', onKeydown);
                    window.removeEventListener('resize', syncViewport);
                    if (vv) { vv.removeEventListener('resize', syncViewport); vv.removeEventListener('scroll', syncViewport); }
                }
            }

            const styleVars = computed(() => ({
                '--nxsp-w': props.width,
                '--nxsp-dw': props.drawerWidth
            }));

            const titleOf = (item) => String(item[props.titleField] || '未命名');
            const metaOf = (item) => props.itemMeta ? props.itemMeta(item) : (item.meta || '');
            const keyOf = (item) => item[props.itemKey];
            const statusOf = (item) => item[props.statusField];
            const isActive = (item) => props.activeKey !== '' && props.activeKey === keyOf(item);
            const busyOf = (item) => ['generating', 'running', 'pending'].indexOf(statusOf(item)) >= 0;

            const showSearch = computed(() => props.searchable && props.items.length >= props.searchMin);
            const filtered = computed(() => {
                const kw = keyword.value.trim().toLowerCase();
                if (!kw) return props.items;
                return props.items.filter((i) => String(i[props.titleField] || '').toLowerCase().indexOf(kw) >= 0);
            });
            const searching = computed(() => !!keyword.value.trim());

            const groups = computed(() => {
                if (!props.groupByDate) return [{ name: '', items: filtered.value }];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const yesterday = new Date(today.getTime() - 86400000);
                const bucket = { today: [], yesterday: [], earlier: [] };
                filtered.value.forEach((i) => {
                    const t = new Date(i[props.dateField] || 0).getTime();
                    if (!isNaN(t) && t >= today.getTime()) bucket.today.push(i);
                    else if (!isNaN(t) && t >= yesterday.getTime()) bucket.yesterday.push(i);
                    else bucket.earlier.push(i);
                });
                const out = [];
                [[props.groupToday, bucket.today], [props.groupYesterday, bucket.yesterday], [props.groupEarlier, bucket.earlier]]
                    .forEach((pair) => { if (pair[1].length) out.push({ name: pair[0], items: pair[1] }); });
                return out;
            });

            const hasPersonal = computed(() => props.personalItems.length > 0 || !!slots.personal);
            const hasFoot = computed(() => !!props.userName || !!slots.user || !!slots['user-actions']);

            function pick(item) {
                emit('select', item);
                if (compact.value) close();
            }
            function remove(item) {
                emit('remove', item);
            }
            function pickTab(key) {
                emit('update:activeTab', key);
            }
            function pickPersonal(key) {
                emit('personal', key);
                if (compact.value) close();
            }
            function onAction() {
                emit('action');
                if (compact.value) close();
            }

            watch([compact, drawerOpen], syncListeners);

            onMounted(() => {
                if (mql) {
                    if (mql.addEventListener) mql.addEventListener('change', applyMedia);
                    else mql.addListener(applyMedia);
                }
                syncViewport();
            });

            onUnmounted(() => {
                if (mql) {
                    if (mql.removeEventListener) mql.removeEventListener('change', applyMedia);
                    else mql.removeListener(applyMedia);
                }
                if (locked) {
                    document.body.classList.remove('nxsp-lock');
                    window.removeEventListener('keydown', onKeydown);
                    window.removeEventListener('resize', syncViewport);
                    const vv = window.visualViewport;
                    if (vv) { vv.removeEventListener('resize', syncViewport); vv.removeEventListener('scroll', syncViewport); }
                }
            });

            return {
                root, keyword, compact, drawerOpen, close, styleVars,
                titleOf, metaOf, keyOf, statusOf, busyOf, isActive, searching,
                showSearch, filtered, groups, hasPersonal, hasFoot,
                pick, remove, pickTab, pickPersonal, onAction
            };
        },
        template: `
            <div ref="root" class="nxsp" :class="{ 'is-compact': compact }" :data-layout="layout" :style="styleVars">
                <div v-if="compact" class="nxsp-mask" :class="{ open: drawerOpen }" @click="close"></div>
                <aside class="nxsp-aside" :class="{ open: drawerOpen }" :aria-label="ariaLabel"
                       :aria-hidden="compact && !drawerOpen ? 'true' : undefined"
                       :inert="compact && !drawerOpen ? true : undefined">
                    <div v-if="brandImg || brandIcon || brandName || $slots.brand || compact" class="nxsp-head">
                        <slot name="brand">
                            <button v-if="brandImg || brandIcon || brandName" type="button" class="nxsp-brand" @click="$emit('brand')">
                                <img v-if="brandImg" :src="brandImg" alt="" class="nxsp-brand-img">
                                <span v-else-if="brandIcon" class="nxsp-brand-ico" v-html="brandIcon"></span>
                                <span class="nxsp-brand-name">{{ brandName }}</span>
                            </button>
                        </slot>
                        <button v-if="compact" type="button" class="nxsp-close" @click="close" aria-label="关闭侧栏">✕</button>
                    </div>

                    <div v-if="actionLabel || $slots.action" class="nxsp-action">
                        <slot name="action">
                            <button type="button" class="nxsp-action-btn" :disabled="actionDisabled" @click="onAction">
                                <span class="nxsp-action-ico" v-html="actionIcon"></span><span>{{ actionLabel }}</span>
                            </button>
                        </slot>
                    </div>

                    <div v-if="tabs.length || $slots['tabs-extra']" class="nxsp-tabs">
                        <button v-for="t in tabs" :key="t.key" type="button" class="nxsp-tab"
                                :class="{ active: t.key === activeTab }" @click="pickTab(t.key)">{{ t.label }}</button>
                        <slot name="tabs-extra"></slot>
                    </div>

                    <div v-if="showSearch" class="nxsp-tools">
                        <div class="nxsp-search">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                            <input v-model="keyword" class="nxsp-search-input" type="search" :placeholder="searchPlaceholder" :aria-label="searchPlaceholder">
                            <button v-if="keyword" type="button" class="nxsp-search-clear" @click="keyword = ''" aria-label="清空搜索">✕</button>
                        </div>
                    </div>

                    <div v-if="$slots['list-header']" class="nxsp-tools nxsp-tools-actions">
                        <slot name="list-header"></slot>
                    </div>

                    <div class="nxsp-list">
                        <div v-if="loading" class="nxsp-skeleton">
                            <div v-for="i in skeleton" :key="i" class="nxsp-skeleton-line" :style="{ animationDelay: (i * 0.12) + 's' }"></div>
                        </div>
                        <template v-else-if="filtered.length">
                            <div v-for="g in groups" :key="g.name" class="nxsp-group">
                                <div v-if="g.name" class="nxsp-group-label">{{ g.name }}</div>
                                <button v-for="item in g.items" :key="keyOf(item)" type="button"
                                        class="nxsp-item" :class="{ active: isActive(item) }" @click="pick(item)">
                                    <span v-if="item.grad" class="nxsp-item-ico is-grad" :style="{ background: item.grad }">{{ item.icon }}</span>
                                    <span v-else-if="item.icon" class="nxsp-item-ico">{{ item.icon }}</span>
                                    <span class="nxsp-item-main">
                                        <span class="nxsp-item-title">{{ titleOf(item) }}</span>
                                        <span v-if="metaOf(item)" class="nxsp-item-meta">{{ metaOf(item) }}</span>
                                    </span>
                                    <span v-if="busyOf(item)" class="nxsp-spin" aria-label="进行中"></span>
                                    <template v-else>
                                        <span v-if="statusOf(item) === 'failed'" class="nxsp-badge">失败</span>
                                        <span v-if="removable" class="nxsp-del" role="button" tabindex="0" aria-label="删除"
                                              @click.stop="remove(item)" @keydown.enter.stop="remove(item)">✕</span>
                                    </template>
                                    <slot name="item-after" :item="item"></slot>
                                </button>
                                <slot name="group-after" :group="g"></slot>
                            </div>
                        </template>
                        <div v-else class="nxsp-empty">
                            <span class="nxsp-empty-ico">{{ emptyIcon }}</span>
                            <span class="nxsp-empty-title">{{ searching ? '没有匹配的结果' : (emptyTitle || '暂无内容') }}</span>
                            <span v-if="!searching && emptyText" class="nxsp-empty-text">{{ emptyText }}</span>
                        </div>
                    </div>

                    <div v-if="hasPersonal" class="nxsp-personal">
                        <div class="nxsp-personal-head">
                            <span class="nxsp-personal-dot"></span>
                            <span class="nxsp-personal-title">{{ personalTitle }}</span>
                        </div>
                        <slot name="personal">
                            <button v-for="p in personalItems" :key="p.key" type="button"
                                    class="nxsp-personal-item" @click="pickPersonal(p.key)">
                                <span class="nxsp-personal-ico">{{ p.icon }}</span>
                                <span class="nxsp-personal-main">
                                    <span class="nxsp-personal-name">{{ p.name }}<em v-if="p.badge" class="nxsp-personal-badge">{{ p.badge }}</em></span>
                                    <span v-if="p.desc" class="nxsp-personal-desc">{{ p.desc }}</span>
                                </span>
                                <span class="nxsp-personal-arrow" aria-hidden="true">›</span>
                            </button>
                        </slot>
                    </div>

                    <div v-if="hasFoot" class="nxsp-foot">
                        <slot name="user">
                            <span class="nxsp-user-name">{{ userName }}</span>
                        </slot>
                        <div class="nxsp-foot-actions"><slot name="user-actions"></slot></div>
                    </div>
                </aside>
            </div>
        `
    };

    window.NuxSidePanel = NuxSidePanel;
})();