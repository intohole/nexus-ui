/* ============================================================
 * nexus-subagent.js —— AI 子代理（subagent）数据层原语
 * v2.98.0 AG-UI 对齐轮：SUBAGENT_STARTED/FINISHED/ERROR 三件族
 * + 内容事件 subagentRunId 归因分流。呈现层见 nux-subagent-track。
 * 契约文档：llms.txt「AI 事件面 ↔ AG-UI 1.0 对照表」。
 * 无代际闸：迟到帧拒收依赖上游 ChatController/NexusStop seq 闸。
 * ============================================================ */
(function () {
    'use strict';

    var RUNNING_SET = { running: 1, started: 1, executing: 1, in_progress: 1, pending: 1 };
    var DONE_SET = { done: 1, finished: 1, completed: 1, success: 1 };
    var SUSPENDED_SET = { suspended: 1, waiting: 1, awaiting_input: 1 };
    var ERROR_SET = { error: 1, failed: 1, failure: 1 };

    // 子代理状态归一独立词表。suspended = 挂起等人工输入（AG-UI 语义：非失败），
    // 禁止混用 normalizeToolStatus 的 cancelled→error 映射。
    function normalizeStatus(status) {
        var s = String(status || '').toLowerCase();
        if (RUNNING_SET[s]) return 'running';
        if (SUSPENDED_SET[s]) return 'suspended';
        if (ERROR_SET[s]) return 'error';
        if (DONE_SET[s]) return 'done';
        return '';
    }

    function runId(payload) {
        return String((payload && (payload.subagentRunId || payload.subagent_run_id)) || '');
    }

    function hasSubagentRunId(payload) {
        return !!runId(payload);
    }

    // list 必须是调用方持有的数组引用（msg.subagents）；缺条目时按 running 态新建。
    // 同 id 重复 start 幂等：只补 label，不重复 push。
    function ensure(list, payload) {
        var id = runId(payload) || String((payload && payload.id) || '');
        if (!id || !list) return null;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        var entry = {
            id: id,
            label: payload.label || payload.name || payload.title || id,
            status: 'running',
            parent: payload.parentSubagentRunId || payload.parent_subagent_run_id || '',
            outcome: '',
            result: undefined,
            error: '',
            durationMs: Number(payload.duration_ms) || 0,
            startedAt: Date.now(),
            thinking: '',
            toolCalls: [],
            interrupts: Array.isArray(payload.interrupt_ids) ? payload.interrupt_ids.slice() : []
        };
        list.push(entry);
        return entry;
    }

    function start(list, payload) {
        var t = ensure(list, payload);
        if (t && (payload.label || payload.name)) t.label = payload.label || payload.name;
        return t;
    }

    // SUBAGENT_FINISHED：outcome ∈ success|suspended（AG-UI 词表），error 走 fail。
    function finish(list, payload) {
        var t = ensure(list, payload);
        if (!t) return null;
        var raw = String(payload.outcome || payload.status || 'success').toLowerCase();
        var st = normalizeStatus(raw === 'success' ? 'done' : raw);
        t.status = st || 'done';
        t.outcome = raw;
        if (payload.result !== undefined) t.result = payload.result;
        if (Array.isArray(payload.interrupt_ids) && payload.interrupt_ids.length) {
            t.interrupts = payload.interrupt_ids.slice();
        }
        if (payload.duration_ms !== undefined) t.durationMs = Number(payload.duration_ms) || t.durationMs;
        t.endedAt = Date.now();
        return t;
    }

    function fail(list, payload) {
        var t = ensure(list, payload);
        if (!t) return null;
        t.status = 'error';
        t.error = payload.message || payload.error || '子代理执行失败';
        t.endedAt = Date.now();
        return t;
    }

    // 内容事件归因分流入口：routeRichEvent 的 thinking/tool/interrupt 分支头部调用。
    // 返回匹配条目；无 id 或条目缺席返回 null（调用方走母消息原逻辑）。
    function routeAttributed(list, payload) {
        var id = runId(payload);
        if (!id || !list) return null;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) return list[i];
        }
        return null;
    }

    window.NexusSubagent = {
        normalizeStatus: normalizeStatus,
        runId: runId,
        hasSubagentRunId: hasSubagentRunId,
        ensure: ensure,
        start: start,
        finish: finish,
        fail: fail,
        routeAttributed: routeAttributed
    };
})();
