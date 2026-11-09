(function() {
  window.PG_CATS = window.PG_CATS || [];

  window.PG_CATS.push({
    id: 'insight',
    name: '洞察与诚信',
    demos: [
      {
        id: 'confidence',
        tag: 'nux-confidence',
        title: '置信度四档',
        desc: 'AI 给结论必带可验证锚点：定性档位优于裸百分比，无锚点自动降级为「待确认」',
        tpl: `
<div class="demo-col">
  <div class="demo-row">
    <nux-confidence level="good"></nux-confidence>
    <nux-confidence level="fair"></nux-confidence>
    <nux-confidence level="shaky"></nux-confidence>
    <nux-confidence level="fail"></nux-confidence>
  </div>
  <div class="demo-row">
    <nux-confidence level="fair" :pct="72" label="命中把握"></nux-confidence>
    <nux-confidence :level="2"></nux-confidence>
    <nux-confidence></nux-confidence>
  </div>
  <nux-confidence variant="band" level="fair" :pct="72" note="近 20 次同题推演 14 次兑现" label="可打"></nux-confidence>
  <nux-confidence variant="band" level="shaky" :pct="41" note="关键前提「收入稳定」未验证" label="勉强"></nux-confidence>
</div>`,
        code: `<nux-confidence level="good"></nux-confidence>
<nux-confidence level="fair" :pct="72" label="命中把握"></nux-confidence>
<nux-confidence variant="band" level="shaky" :pct="41"
  note="关键前提「收入稳定」未验证" label="勉强"></nux-confidence>
<nux-confidence></nux-confidence>`
      },
      {
        id: 'citations',
        tag: 'nux-citations',
        title: '引用来源核验',
        desc: 'AI 回答的来源列表：编号可核验，逐条判定支撑度，超出 3 条折叠可展开',
        tpl: `
<div class="demo-col">
  <nux-citations :items="cites" title="本回答引用了 5 处来源"></nux-citations>
  <nux-citations :items="cites.slice(0, 2)" title="简洁形态" :collapsible="false"></nux-citations>
</div>`,
        code: `<nux-citations title="本回答引用了 5 处来源"
  :items="[
    { n: 1, title: '2026 年个人养老金领取规则', url: 'https://example.gov.cn/pension', verdict: 'supported' },
    { n: 2, title: '某研报：三季度 A 股展望', url: 'https://research.example.com/q3', verdict: 'partial', note: '仅支撑「震荡」半句' },
    { n: 3, title: '内部知识库：续保口径', verdict: 'unsupported' }
  ]"></nux-citations>`,
        data() {
          return {
            cites: [
              { n: 1, title: '2026 年个人养老金领取规则解读', url: 'https://example.gov.cn/pension-2026', verdict: 'supported' },
              { n: 2, title: '三季度 A 股策略展望（研报摘要）', url: 'https://research.example.com/q3-outlook', verdict: 'partial', note: '仅支撑「震荡市」半句结论' },
              { n: 3, title: '内部知识库：续保口径说明', verdict: 'unsupported' },
              { n: 4, title: '国家统计局：10 月 CPI 数据', url: 'https://stats.example.cn/cpi-10', verdict: 'supported' },
              { n: 5, title: '行业白皮书：智能客服成熟度', url: 'https://whitepaper.example.com/2026', verdict: 'partial' }
            ]
          };
        }
      },
      {
        id: 'copy-button',
        tag: 'nux-copy-button',
        title: '复制按钮',
        desc: '带「已复制」回弹反馈的复制钮：内联自反馈不弹 toast，动态取值支持运行时生成的内容',
        tpl: `
<div class="demo-col">
  <div class="demo-row">
    <nux-copy-button text="nexus-ui 设计系统"></nux-copy-button>
    <nux-copy-button text="nexus-ui 设计系统" label="复制口令"></nux-copy-button>
    <nux-copy-button :get-text="liveText" variant="text"></nux-copy-button>
  </div>
  <div class="demo-cell" style="position:relative; padding: 14px 16px; background: var(--nx-bg-muted, #f1f5f9); border-radius: 8px; font-family: var(--nx-font-mono, monospace); font-size: 13px; text-align: left;">
    <nux-copy-button :get-text="codeText" style="position:absolute; top:8px; right:8px;"></nux-copy-button>
    curl -s https://songguokr.com/api/health | jq .status</div>
</div>`,
        code: `<nux-copy-button text="要复制的文本"></nux-copy-button>
<nux-copy-button :get-text="() => currentToken" variant="text"></nux-copy-button>`,
        methods: {
          liveText() { return '实时取值 ' + new Date().toLocaleTimeString(); },
          codeText() { return 'curl -s https://songguokr.com/api/health | jq .status'; }
        }
      },
      {
        id: 'timeline',
        tag: 'nux-timeline',
        title: '时间线',
        desc: '竖排历程：点色表达事件性质，时间戳用等宽字体，支持插槽定制内容',
        tpl: `
<div class="demo-col">
  <nux-timeline :items="items">
    <template #item="{ item }">
      <div v-if="item.extra" class="demo-row" style="margin-top:6px">
        <nux-confidence level="fair" :pct="68" label="复诊把握"></nux-confidence>
      </div>
    </template>
  </nux-timeline>
</div>`,
        code: `<nux-timeline :items="[
  { time: '10-24 09:00', title: '完成疫苗接种', tag: '免疫', tone: 'success' },
  { time: '10-20 15:30', title: '体重较上月 +0.4kg', desc: '在正常增长带内', tone: 'accent' },
  { time: '10-18 08:00', title: '食欲下降，建议复诊', tag: '健康', tone: 'warning' }
]"></nux-timeline>`,
        data() {
          return {
            items: [
              { time: '10-24 09:00', title: '完成疫苗接种', tag: '免疫', tone: 'success' },
              { time: '10-20 15:30', title: '体重较上月 +0.4kg', desc: '在正常增长带内', tone: 'accent', extra: true },
              { time: '10-18 08:00', title: '食欲下降，建议复诊', tag: '健康', tone: 'warning' },
              { time: '10-12 19:00', title: '建档完成', tag: '档案' }
            ]
          };
        }
      },
      {
        id: 'descriptions',
        tag: 'nux-descriptions',
        title: '描述列表',
        desc: '键值对详情：语义 dl 结构，空值诚实显示「—」，支持跨列与插槽定制',
        tpl: `
<div class="demo-col">
  <nux-descriptions title="档案详情" :items="profile"></nux-descriptions>
  <nux-descriptions :items="profile" :columns="3" title="三列形态"></nux-descriptions>
</div>`,
        code: `<nux-descriptions title="档案详情" :columns="2" :items="[
  { label: '品种', value: '橘猫' },
  { label: '年龄', value: '2 岁 3 个月' },
  { label: '绝育', value: '已完成' },
  { label: '既往病史', value: '', span: 2 }
]">
  <template #value="{ item }">
    <nux-tag v-if="item.label === '绝育'">已完成</nux-tag>
  </template>
</nux-descriptions>`,
        data() {
          return {
            profile: [
              { label: '品种', value: '橘猫' },
              { label: '年龄', value: '2 岁 3 个月' },
              { label: '绝育', value: '已完成' },
              { label: '微芯片号', value: '—' },
              { label: '既往病史', value: '2026-03 呼吸道感染，已痊愈', span: 2 }
            ]
          };
        }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'carryover',
    name: '承接与分页',
    demos: [
      {
        id: 'reveal-strip',
        tag: 'nux-reveal-strip',
        title: '承接条',
        desc: '承诺动词落点原语：唤回/资格承接/风险提示一条横幅说完，CTA 真实接线，可关闭记忆 7 天（资格求交由消费方 computed 负责）',
        tpl: `
<div class="demo-col">
  <nux-reveal-strip variant="accent" title="3 天前你记了一件事"
    desc="点开确认后，下一个唤回名额才会前进" cta-text="点开确认"
    @cta="ping('唤回确认已承接')"></nux-reveal-strip>
  <nux-reveal-strip variant="success" title="领取成功，已到账 200 积分"
    desc="今日签到 +50，注册礼 +150" cta-text="去花掉"
    @cta="ping('打开钱包动线')"></nux-reveal-strip>
  <nux-reveal-strip variant="warn" title="有 1 条断更风险"
    desc="「每日散步」已中断 1 天，今晚 24 点前补卡可续" cta-text="立即补卡"
    dismissible dismiss-key="pg-risk"
    @cta="ping('补卡动线')" @dismiss="ping('已记 7 天不再提示')"></nux-reveal-strip>
</div>`,
        code: `<nux-reveal-strip variant="warn" title="有 1 条断更风险"
  desc="「每日散步」已中断 1 天，今晚 24 点前补卡可续"
  cta-text="立即补卡" dismissible dismiss-key="risk-1019"
  @cta="revive()" @dismiss="onDismiss()"></nux-reveal-strip>`,
        methods: {
          ping(msg) { showToast(msg, 'success'); }
        }
      },
      {
        id: 'nexus-pager',
        tag: 'NexusPager',
        title: '分页状态机',
        desc: 'fetch 进去、响应式状态出来：page/totalPages/hasMore/loadMore 全自动，与 nux-pagination 直接对齐，offset 型 API 在 fetch 内换算',
        tpl: `
<div class="demo-col">
  <div class="demo-row" style="flex-wrap:wrap">
    <nux-tag v-for="it in pager.items" :key="it.id">{{ it.name }}</nux-tag>
  </div>
  <div class="demo-row">
    <button class="nux-btn nux-btn--ghost" :disabled="!pager.hasMore || pager.loading" @click="more">
      {{ pager.loading ? '加载中…' : 'loadMore（已加载 ' + pager.items.length + ' / 25）' }}
    </button>
    <nux-pagination :page="pager.page" :total-pages="pager.totalPages"
      @prev="pgPrev" @next="pgNext"></nux-pagination>
  </div>
</div>`,
        code: `const pager = NexusPager.create({
  pageSize: 6,
  fetch: (page, pageSize) => crud.listPaged(page, pageSize)
});
pager.reload();
// pager.state.items / totalPages / hasMore / loading；pager.loadMore() 追加、goto(p) 跳页`,
        data() { return { pager: { items: [], page: 1, totalPages: 1, hasMore: false, loading: false } }; },
        mounted() {
          const self = this;
          this.$pg = NexusPager.create({
            pageSize: 6,
            fetch: (page, size) => new Promise((res) => setTimeout(() => {
              const total = 25, start = (page - 1) * size, items = [];
              for (let i = start; i < Math.min(start + size, total); i++) items.push({ id: i + 1, name: '条目 ' + (i + 1) });
              res({ items: items, total: total });
            }, 350))
          });
          this.pager = this.$pg.state;
          this.$pg.reload();
        },
        methods: {
          more() { this.$pg.loadMore(); },
          pgPrev() { if (this.pager.page > 1) this.$pg.goto(this.pager.page - 1); },
          pgNext() { if (this.pager.page < this.pager.totalPages) this.$pg.goto(this.pager.page + 1); }
        }
      }
    ]
  });
})();
