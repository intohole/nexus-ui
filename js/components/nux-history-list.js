(function () {
    'use strict';

    const { ref, computed, reactive, watch, nextTick } = Vue;

    const LABELS = { all: '全部', ready: '已完成', generating: '生成中', failed: '失败' };
    const DATE_GROUPS = { today: '今天', yesterday: '昨天', earlier: '更早' };

    const NuxHistoryList = {
        name: 'NuxHistoryList',
        props: {
            items: { type: Array, default: () => [] },
            itemKey: { type: String, default: 'id' },
            itemTitle: { type: String, default: 'title' },
            itemStatus: { type: String, default: 'status' },
            itemDate: { type: String, default: 'updated_at' },
            loading: { type: Boolean, default: false },
            emptyIcon: { type: String, default: '📋' },
            emptyTitle: { type: String, default: '还没有作品' },
            emptyText: { type: String, default: '' },
            emptyAction: { type: String, default: '' },
            statusLabels: { type: Object, default: () => ({}) },
            filterOptions: { type: Array, default: () => ['all', 'ready', 'generating', 'failed'] },
            showThemeFilter: { type: Boolean, default: false },
            themeField: { type: String, default: 'theme' },
            themeMap: { type: Object, default: () => ({}) },
            pageSizeField: { type: String, default: 'pages_total' },
            dateGroupLabels: { type: Object, default: () => DATE_GROUPS },
        },
        emits: ['open', 'delete', 'batch-delete', 'empty-action'],
        setup(props, ctx) {
            const filter = ref('all');
            const query = ref('');
            const sort = ref('newest');
            const view = ref('grid');
            const themeFilter = ref('all');
            const selected = ref([]);

            const labels = { ...LABELS, ...props.statusLabels };
            const dateLabels = { ...DATE_GROUPS, ...props.dateGroupLabels };

            const filtered = computed(() => {
                let list = props.items;

                // status filter
                if (filter.value !== 'all') {
                    list = list.filter((d) => d[props.itemStatus] === filter.value);
                }

                // theme filter
                if (props.showThemeFilter && themeFilter.value !== 'all') {
                    list = list.filter((d) => d[props.themeField] === themeFilter.value);
                }

                // search
                const q = query.value.trim().toLowerCase();
                if (q) {
                    list = list.filter((d) => {
                        const title = d[props.itemTitle] || '';
                        return String(title).toLowerCase().includes(q);
                    });
                }

                // sort
                list = list.slice().sort((a, b) => {
                    const ta = new Date(a[props.itemDate] || a.created_at || 0).getTime();
                    const tb = new Date(b[props.itemDate] || b.created_at || 0).getTime();
                    return sort.value === 'newest' ? tb - ta : ta - tb;
                });

                return list;
            });

            const groups = computed(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                const bucket = { today: [], yesterday: [], earlier: [] };

                filtered.value.forEach((d) => {
                    const t = new Date(d[props.itemDate] || d.created_at || 0).getTime();
                    if (!isNaN(t) && t >= today.getTime()) bucket.today.push(d);
                    else if (!isNaN(t) && t >= yesterday.getTime()) bucket.yesterday.push(d);
                    else bucket.earlier.push(d);
                });

                const out = [];
                ['today', 'yesterday', 'earlier'].forEach((key) => {
                    if (bucket[key].length) {
                        out.push({ name: dateLabels[key], items: bucket[key] });
                    }
                });
                return out;
            });

            const stats = computed(() => {
                const stat = {
                    total: props.items.length,
                    ready: 0, generating: 0, failed: 0,
                };
                props.items.forEach((d) => {
                    const s = d[props.itemStatus];
                    if (s === 'ready') stat.ready++;
                    else if (s === 'generating') stat.generating++;
                    else if (s === 'failed') stat.failed++;
                });
                return stat;
            });

            const themes = computed(() => {
                if (!props.showThemeFilter) return [];
                const used = {};
                props.items.forEach((d) => {
                    const key = d[props.themeField];
                    if (key) used[key] = (used[key] || 0) + 1;
                });
                return Object.keys(used).map((k) => ({
                    key: k,
                    name: (props.themeMap[k] && props.themeMap[k].name) || k,
                    count: used[k],
                }));
            });

            const allSelected = computed(() => {
                return filtered.value.length > 0 && filtered.value.every((d) => selected.value.includes(d[props.itemKey]));
            });

            const count = computed(() => props.items.length);

            function toggleSelectAll() {
                if (allSelected.value) {
                    selected.value = [];
                } else {
                    selected.value = filtered.value.map((d) => d[props.itemKey]);
                }
            }

            function toggleSelect(id) {
                const i = selected.value.indexOf(id);
                if (i >= 0) selected.value.splice(i, 1);
                else selected.value.push(id);
            }

            function isSelected(item) {
                return selected.value.includes(item[props.itemKey]);
            }

            function getItemKey(item) {
                return item[props.itemKey];
            }

            function getItemTitle(item) {
                return item[props.itemTitle] || '未命名';
            }

            function getItemStatus(item) {
                return item[props.itemStatus];
            }

            function getItemDate(item) {
                return item[props.itemDate] || item.created_at || '';
            }

            function statusLabel(item) {
                const s = getItemStatus(item);
                return labels[s] || s;
            }

            function relTime(iso) {
                if (!iso) return '';
                const t = new Date(iso).getTime();
                if (isNaN(t)) return '';
                const diff = Date.now() - t;
                const RANGES = [[60000, '刚刚'], [3600000, '分钟前'], [86400000, '小时前'], [2592000000, '天前'], [31536000000, '个月前'], [Infinity, '年前']];
                for (let i = 1; i < RANGES.length; i++) {
                    if (diff < RANGES[i][0]) {
                        const val = Math.max(1, Math.round(diff / RANGES[i - 1][0]));
                        return val + RANGES[i][1];
                    }
                }
                return '';
            }

            function fmtDate(iso) {
                if (!iso) return '';
                const d = new Date(iso);
                if (isNaN(d.getTime())) return '';
                const p = (n) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
            }

            async function batchDelete() {
                const ids = selected.value.slice();
                if (!ids.length) return;
                ctx.emit('batch-delete', ids);
            }

            function handleOpen(item) {
                ctx.emit('open', item);
            }

            function handleDelete(item) {
                ctx.emit('delete', item);
            }

            watch(() => props.items, () => {
                // clear selection when items change
                selected.value = [];
            });

            return {
                filter, query, sort, view, themeFilter, selected,
                labels, filtered, groups, stats, themes, allSelected, count,
                toggleSelectAll, toggleSelect, isSelected,
                getItemKey, getItemTitle, getItemStatus, getItemDate,
                statusLabel, relTime, fmtDate, batchDelete,
                handleOpen, handleDelete,
            };
        },
        template: `
        <div class="nx-hl-root">
            <!-- Stats bar -->
            <div class="nx-hl-stats" v-if="items.length">
                <div class="nx-hs-stat"><b>{{ stats.total }}</b><span>全部</span></div>
                <div class="nx-hs-stat is-ok" v-if="filterOptions.includes('ready')"><b>{{ stats.ready }}</b><span>已完成</span></div>
                <div class="nx-hs-stat is-gen" v-if="filterOptions.includes('generating')"><b>{{ stats.generating }}</b><span>生成中</span></div>
                <div class="nx-hs-stat is-fail" v-if="filterOptions.includes('failed')"><b>{{ stats.failed }}</b><span>失败</span></div>
            </div>

            <!-- Toolbar -->
            <div class="nx-hl-toolbar" v-if="items.length">
                <div class="nx-hl-filters">
                    <button v-for="opt in filterOptions" :key="opt"
                        class="nx-hf-chip" :class="{active: filter===opt}"
                        @click="filter=opt">{{ labels[opt] || opt }}</button>
                </div>
                <div class="nx-hl-search">
                    <input v-model="query" class="nx-hs-input" placeholder="搜索…">
                </div>
                <div class="nx-hl-view">
                    <button class="nx-hv-btn" :class="{on: view==='grid'}" @click="view='grid'" title="网格视图">▦</button>
                    <button class="nx-hv-btn" :class="{on: view==='list'}" @click="view='list'" title="列表视图">≡</button>
                </div>
                <select v-model="sort" class="nx-hl-sort">
                    <option value="newest">最近更新</option>
                    <option value="oldest">最早创建</option>
                </select>
                <label class="nx-hl-select-all">
                    <input type="checkbox" :checked="allSelected" @change="toggleSelectAll">
                    <span>全选</span>
                </label>
                <button class="nx-hl-batch-del" :class="{on: selected.length}" :disabled="!selected.length" @click="batchDelete">
                    删除{{ selected.length ? ' (' + selected.length + ')' : '' }}
                </button>
                <slot name="toolbar-after"></slot>
                <span class="nx-hl-count">{{ count }} 份</span>
            </div>

            <!-- Theme filter chips -->
            <div class="nx-hl-themes" v-if="showThemeFilter && themes.length">
                <button class="nx-ht-chip" :class="{active: themeFilter==='all'}" @click="themeFilter='all'">全部风格</button>
                <button class="nx-ht-chip" :class="{active: themeFilter===t.key}" v-for="t in themes" :key="t.key" @click="themeFilter=t.key">
                    {{ t.name }}<em>{{ t.count }}</em>
                </button>
            </div>

            <!-- Loading skeleton -->
            <nux-skeleton v-if="loading" variant="grid" :cards="8" class="nx-hl-skeleton"></nux-skeleton>

            <!-- Items list -->
            <template v-else-if="filtered.length">
                <div class="nx-hl-group" v-for="g in groups" :key="g.name">
                    <div class="nx-hl-group-label">{{ g.name }}<span>{{ g.items.length }}</span></div>

                    <!-- Grid view -->
                    <div class="nx-hl-grid" v-if="view==='grid'">
                        <div v-for="item in g.items" :key="getItemKey(item)"
                            class="nx-hl-card" :class="{ 'is-selected': isSelected(item) }"
                            @click="handleOpen(item)">

                            <slot name="grid-card" :item="item" :selected="isSelected(item)" :statusLabel="statusLabel(item)" :relTime="relTime(getItemDate(item))" :fmtDate="fmtDate(getItemDate(item))" :getItemTitle="getItemTitle(item)" :toggleSelect="toggleSelect" :getItemKey="getItemKey">
                                <div class="nx-hl-card-default">
                                    <div class="nx-hl-card-title">{{ getItemTitle(item) }}</div>
                                    <div class="nx-hl-card-meta">
                                        <span class="nx-hl-status" :class="'is-'+getItemStatus(item)">{{ statusLabel(item) }}</span>
                                        <span class="nx-hl-time">{{ relTime(getItemDate(item)) }}</span>
                                    </div>
                                </div>
                            </slot>

                            <label class="nx-hl-card-select" @click.stop>
                                <input type="checkbox" :checked="isSelected(item)" @change="toggleSelect(getItemKey(item))">
                                <span></span>
                            </label>
                        </div>
                    </div>

                    <!-- List view -->
                    <div class="nx-hl-rows" v-else>
                        <div v-for="item in g.items" :key="getItemKey(item)"
                            class="nx-hl-row" :class="{ 'is-selected': isSelected(item) }"
                            @click="handleOpen(item)">

                            <slot name="list-row" :item="item" :selected="isSelected(item)" :statusLabel="statusLabel(item)" :relTime="relTime(getItemDate(item))" :fmtDate="fmtDate(getItemDate(item))" :getItemTitle="getItemTitle(item)" :toggleSelect="toggleSelect" :getItemKey="getItemKey">
                                <label class="nx-hl-row-select" @click.stop>
                                    <input type="checkbox" :checked="isSelected(item)" @change="toggleSelect(getItemKey(item))">
                                    <span></span>
                                </label>
                                <div class="nx-hl-row-title">{{ getItemTitle(item) }}</div>
                                <span class="nx-hl-status" :class="'is-'+getItemStatus(item)">{{ statusLabel(item) }}</span>
                                <span class="nx-hl-time">{{ relTime(getItemDate(item)) }}</span>
                                <div class="nx-hl-row-actions" @click.stop>
                                    <button class="nx-hl-btn primary" @click="handleOpen(item)">打开</button>
                                    <button class="nx-hl-btn" @click="handleDelete(item)">删除</button>
                                </div>
                            </slot>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Empty state -->
            <div v-else class="nx-hl-empty">
                <slot name="empty">
                    <div class="nx-hl-empty-icon">{{ emptyIcon }}</div>
                    <p class="nx-hl-empty-title">{{ items.length ? '没有匹配的' : emptyTitle }}</p>
                    <p class="nx-hl-empty-text">{{ items.length ? '换个关键词或筛选条件试试' : emptyText }}</p>
                    <button v-if="emptyAction && !items.length" class="nx-hl-empty-btn" @click="$emit('empty-action')">{{ emptyAction }}</button>
                </slot>
            </div>
        </div>
        `
    };

    window.NuxHistoryList = NuxHistoryList;
})();