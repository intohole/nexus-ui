(function () {
    'use strict';

    const { ref, reactive, computed, onMounted, watch } = Vue;

    function pickList(res) {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        if (res && Array.isArray(res.items)) return res.items;
        return [];
    }

    const NuxConversationList = {
        name: 'NuxConversationList',
        props: {
            api: { type: Object, default: null },
            conversationUrl: { type: String, default: '/api/chat/conversations' },
            newTitle: { type: String, default: '新对话' },
            activeId: { type: String, default: '' },
            showSearch: { type: Boolean, default: true },
            showArchive: { type: Boolean, default: true },
            pageSize: { type: Number, default: 100 },
            listAdapter: { type: Function, default: pickList }
        },
        emits: ['select', 'created', 'deleted', 'archive', 'error'],
        setup(props, ctx) {
            const api = props.api || (window.NexusApi ? new NexusApi() : null);
            const list = ref([]);
            const total = ref(0);
            const loading = ref(false);
            const searching = ref(false);
            const keyword = ref('');
            const error = ref('');
            const creating = ref(false);
            let searchTimer = null;

            const canSearch = computed(() => props.conversationUrl && props.showSearch);

            async function load() {
                if (!api) return;
                loading.value = true;
                error.value = '';
                try {
                    const res = await api.get(props.conversationUrl, { page: 1, page_size: props.pageSize });
                    const items = props.listAdapter(res);
                    list.value = items;
                    total.value = (res && res.pagination && res.pagination.total) || (res && res.total) || items.length;
                } catch (e) {
                    error.value = e && e.message ? e.message : '会话列表加载失败';
                    ctx.emit('error', e);
                } finally {
                    loading.value = false;
                }
            }

            async function search(q) {
                if (!api || !q) { list.value = []; await load(); return; }
                searching.value = true;
                error.value = '';
                try {
                    const res = await api.get(`${props.conversationUrl}/search`, { q, limit: props.pageSize });
                    list.value = props.listAdapter(res);
                } catch (e) {
                    error.value = e && e.message ? e.message : '搜索失败';
                    ctx.emit('error', e);
                } finally {
                    searching.value = false;
                }
            }

            function onSearchInput() {
                if (searchTimer) { clearTimeout(searchTimer); }
                const kw = keyword.value;
                searchTimer = setTimeout(() => { search(kw.trim()); }, 320);
            }

            async function create(customTitle) {
                if (!api || creating.value) return null;
                creating.value = true;
                error.value = '';
                try {
                    const res = await api.post(props.conversationUrl, { title: customTitle || props.newTitle });
                    const conv = (res && (res.data || res)) || res;
                    await load();
                    ctx.emit('created', conv);
                    return conv;
                } catch (e) {
                    error.value = e && e.message ? e.message : '新建会话失败';
                    ctx.emit('error', e);
                    return null;
                } finally {
                    creating.value = false;
                }
            }

            async function remove(conv) {
                if (!api || !conv) return;
                try {
                    await api.delete(`${props.conversationUrl}/${conv.id}`);
                    list.value = list.value.filter((c) => c.id !== conv.id);
                    ctx.emit('deleted', conv.id);
                } catch (e) {
                    error.value = e && e.message ? e.message : '删除失败';
                    ctx.emit('error', e);
                }
            }

            async function toggleArchive(conv) {
                if (!api || !conv) return;
                const archived = conv.status === 'active';
                try {
                    const res = await api.patch(`${props.conversationUrl}/${conv.id}`, { status: archived ? 'archived' : 'active' });
                    const updated = (res && (res.data || res)) || res;
                    if (updated && updated.id) conv.status = updated.status;
                    ctx.emit('archive', conv, archived);
                } catch (e) {
                    error.value = e && e.message ? e.message : '归档失败';
                    ctx.emit('error', e);
                }
            }

            function select(conv) {
                if (conv.status === 'archived' && props.showArchive) return;
                ctx.emit('select', conv);
            }

            function fmtTime(iso) {
                if (!iso) return '';
                if (window.NexusUtils && NexusUtils.formatDate) return NexusUtils.formatDate(iso);
                try {
                    const d = new Date(iso);
                    const now = new Date();
                    const sameDay = d.toDateString() === now.toDateString();
                    const pad = (n) => String(n).padStart(2, '0');
                    if (sameDay) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
                    return `${d.getMonth() + 1}月${d.getDate()}日`;
                } catch (e) { return ''; }
            }

            watch(() => props.activeId, () => {
                if (keyword.value) { keyword.value = ''; load(); }
            });

            watch(() => props.conversationUrl, () => { load(); });

            onMounted(() => { load(); });

            return {
                list, total, loading, searching, keyword, error, creating,
                canSearch, load, search, onSearchInput, create, remove, toggleArchive, select, fmtTime
            };
        },
        template: `
            <div class="nx-conv-list">
                <div class="nx-conv-list-header">
                    <div v-if="canSearch" class="nx-conv-list-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input v-model="keyword" class="nx-conv-list-search-input" placeholder="搜索会话" @input="onSearchInput" />
                    </div>
                    <button type="button" class="nx-conv-list-new" :disabled="creating" @click="create()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span>{{ creating ? '…' : '新对话' }}</span>
                    </button>
                </div>

                <div v-if="error" class="nx-conv-list-error">
                    <span>{{ error }}</span>
                    <button type="button" @click="load()">重试</button>
                </div>

                <div v-if="loading && !list.length" class="nx-conv-list-skeleton">
                    <div v-for="i in 5" :key="i" class="nx-conv-list-skeleton-item shimmer"></div>
                </div>

                <div v-else-if="!list.length" class="nx-conv-list-empty">
                    <span>{{ searching || keyword ? '未找到相关会话' : '暂无会话，点击上方「新对话」开始' }}</span>
                </div>

                <ul v-else class="nx-conv-list-items">
                    <li v-for="c in list" :key="c.id" class="nx-conv-list-item"
                        :class="{ 'is-active': c.id === activeId, 'is-archived': c.status === 'archived' }"
                        @click="select(c)">
                        <div class="nx-conv-list-item-main">
                            <span class="nx-conv-list-item-title">{{ c.title || '新对话' }}</span>
                            <span v-if="c.status === 'archived'" class="nx-conv-list-item-badge">已归档</span>
                        </div>
                        <div class="nx-conv-list-item-sub">
                            <span class="nx-conv-list-item-time">{{ fmtTime(c.updated_at || c.created_at) }}</span>
                            <span class="nx-conv-list-item-actions" @click.stop>
                                <button v-if="showArchive" type="button" class="nx-conv-list-item-btn" :title="c.status === 'archived' ? '恢复' : '归档'" @click="toggleArchive(c)">
                                    {{ c.status === 'archived' ? '恢复' : '归档' }}
                                </button>
                                <button type="button" class="nx-conv-list-item-btn is-danger" title="删除" @click="remove(c)">删除</button>
                            </span>
                        </div>
                    </li>
                </ul>
            </div>
        `
    };

    window.NuxConversationList = NuxConversationList;
})();