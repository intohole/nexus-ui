(function() {
    'use strict';

    /* NexusPager —— 分页状态机原语（v2.86.0），收编 6 仓手写 page/hasMore/loadMore 状态机。
     * 与 createNexusCrud().listPaged 组合即得全量分页（crud 管请求塑形，本原语管响应式状态）。
     * fetch 约定：(page, pageSize) => Promise，返回 {items, total?}（裸数组/{data}/{results,count} 均可 coerce）；
     * offset 型 API 由消费方在 fetch 内换算：fetch: (p, s) => api.get(url, {offset:(p-1)*s, limit:s})。
     * 状态字段与 nux-pagination props 对齐（page/totalPages/@prev/@next）。
     */

    function coerce(res) {
        if (Array.isArray(res)) return { items: res, total: null };
        if (!res || typeof res !== 'object') return { items: [], total: null };
        var items = null, total = null;
        if (Array.isArray(res.items)) { items = res.items; total = res.total; }
        else if (Array.isArray(res.data)) { items = res.data; total = res.total; }
        else if (res.data && Array.isArray(res.data.items)) { items = res.data.items; total = res.data.total; }
        else if (Array.isArray(res.results)) { items = res.results; total = res.count; }
        else if (Array.isArray(res.list)) { items = res.list; total = res.total; }
        return { items: items || [], total: (total === undefined || total === null) ? null : Number(total) };
    }

    function create(config) {
        if (!config || typeof config.fetch !== 'function') {
            throw new Error('NexusPager.create: config.fetch is required');
        }
        var V = window.Vue;
        if (!V || typeof V.reactive !== 'function') {
            throw new Error('NexusPager.create: 需要全局 Vue 3（请先加载 vue.global.prod.js）');
        }
        var pageSize = config.pageSize || 20;
        var onChange = typeof config.onChange === 'function' ? config.onChange : null;

        var state = V.reactive({
            items: [],
            page: 1,
            pageSize: pageSize,
            totalPages: 1,
            hasMore: false,
            loading: false,
            error: null,
            loaded: false
        });

        function apply(res, append) {
            var d = coerce(res);
            state.items = append ? state.items.concat(d.items) : d.items;
            if (d.total !== null) {
                state.totalPages = Math.max(1, Math.ceil(d.total / pageSize));
                state.hasMore = d.items.length > 0 && state.items.length < d.total;
            } else {
                state.totalPages = Math.max(1, state.page);
                state.hasMore = d.items.length >= pageSize;
            }
        }

        function load(page, append) {
            if (state.loading) return Promise.resolve();
            var target = Math.max(1, page || 1);
            state.loading = true;
            state.error = null;
            return Promise.resolve()
                .then(function() { return config.fetch(target, pageSize); })
                .then(function(res) {
                    state.page = target;
                    apply(res, append);
                    state.loaded = true;
                    if (onChange) onChange(state);
                })
                .catch(function(err) {
                    state.error = err || new Error('NexusPager: fetch failed');
                })
                .finally(function() {
                    state.loading = false;
                });
        }

        return {
            state: state,
            goto: function(p) { return load(p, false); },
            loadMore: function() { return load(state.page + 1, true); },
            refresh: function() { return load(state.page, false); },
            reload: function() { return load(1, false); }
        };
    }

    window.NexusPager = { create: create, coerce: coerce };
})();
