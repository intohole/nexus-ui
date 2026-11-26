(function() {
  window.PG_CATS = window.PG_CATS || [];

  window.PG_CATS.push({
    id: 'ai-agui',
    name: 'AG-UI 对齐原语 · v2.99.0',
    demos: [
      {
        id: 'subagent-track',
        tag: 'NexusSubagent',
        title: '子代理进度卡组（四态+ACTIVITY 进度行）',
        desc: 'AG-UI SUBAGENT_*/ACTIVITY_* 对应物：running/done/suspended/error 四态卡组，内容事件带 subagentRunId 归因分流，activity_snapshot/delta 进度行实时上 summary 位',
        tpl: `
<div class="demo-col">
  <div class="demo-row" style="align-items:center">
    <button type="button" class="nux-btn" style="min-height:38px;padding:0 16px" @click="run" :disabled="streaming">{{ streaming ? '序列播放中…' : '播放模拟 SSE 序列' }}</button>
    <button type="button" class="nux-btn" style="min-height:38px;padding:0 16px" @click="reset">重置</button>
  </div>
  <nux-subagent-track :items="subagents" :activities="activities" style="max-width:36em"></nux-subagent-track>
  <p class="demo-note">检索席 done（带思考+工具+进度行摘要）· 写作席 suspended（挂起等输入，非失败）· 评审席 error。详见 llms.txt「AI 事件面 ↔ AG-UI 1.0 对照表」。</p>
</div>`,
        code: `const msg = {};
NexusChat.routeRichEvent(msg, 'subagent_started', { subagentRunId: 'sa-1', label: '检索席' });
NexusChat.routeRichEvent(msg, 'activity_snapshot', { messageId: 'act1', activityType: 'search_step',
  content: { q: '时间线', hit: 3 }, subagentRunId: 'sa-1' });   // 进度行上 summary 位
NexusChat.routeRichEvent(msg, 'subagent_finished', { subagentRunId: 'sa-1', outcome: 'success' });
// suspended：outcome:'suspended' + interrupt_ids；error：subagent_failed{message}`,
        data() {
          return { streaming: false, subagents: [], activities: [], timer: null, i: 0 };
        },
        methods: {
          run() {
            this.reset();
            this.streaming = true;
            const seq = [
              ['subagent_started', { subagentRunId: 'sa-research', label: '检索席' }],
              ['thinking', { subagentRunId: 'sa-research', content: '先查时间线，再交叉验证两路来源。' }],
              ['tool', { subagentRunId: 'sa-research', id: 't1', name: 'web_search', args: { q: '时间线' } }],
              ['activity_snapshot', { messageId: 'act1', activityType: 'search_step', content: { q: '时间线', hit: 12 }, subagentRunId: 'sa-research' }],
              ['activity_delta', { messageId: 'act1', activityType: 'search_step', patch: [{ op: 'replace', path: '/hit', value: 30 }] }],
              ['tool_result', { subagentRunId: 'sa-research', id: 't1', result: '30 条命中', duration_ms: 820 }],
              ['subagent_finished', { subagentRunId: 'sa-research', outcome: 'success', result: '时间线 30 条', duration_ms: 1500 }],
              ['subagent_started', { subagentRunId: 'sa-writer', label: '写作席' }],
              ['subagent_finished', { subagentRunId: 'sa-writer', outcome: 'suspended', interrupt_ids: ['it-9'] }],
              ['subagent_started', { subagentRunId: 'sa-critic', label: '评审席' }],
              ['subagent_failed', { subagentRunId: 'sa-critic', message: '上游 429 限流，建议稍后重试' }]
            ];
            const msg = { subagents: this.subagents, activities: this.activities };
            this.timer = setInterval(() => {
              if (this.i >= seq.length) { clearInterval(this.timer); this.streaming = false; return; }
              const ev = seq[this.i++];
              NexusChat.routeRichEvent(msg, ev[0], JSON.parse(JSON.stringify(ev[1])));
            }, 550);
          },
          reset() {
            clearInterval(this.timer);
            this.streaming = false; this.i = 0;
            this.subagents = []; this.activities = [];
          }
        },
        teardown() { clearInterval(this.timer); }
      }
    ]
  });
})();
