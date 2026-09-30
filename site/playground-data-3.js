(function() {
  window.PG_CATS = window.PG_CATS || [];

  window.PG_CATS.push({
    id: 'ai2',
    name: 'AI 能力进阶',
    demos: [
      {
        id: 'ai-brand',
        tag: 'nux-ai-badge / nux-ai-indicator / nux-ai-notice',
        title: 'AI 标识三件套',
        desc: '徽标标注身份，指示器呈现 AI 工作状态，标识条满足生成内容合规要求',
        tpl: `
<div class="demo-col">
  <div class="demo-row">
    <nux-ai-badge></nux-ai-badge>
    <nux-ai-badge text="AI 摘要"></nux-ai-badge>
    <nux-ai-badge tone="slate" size="sm"></nux-ai-badge>
  </div>
  <div class="demo-cells" style="grid-template-columns: repeat(auto-fit, minmax(230px, 1fr))">
    <div class="demo-cell"><nux-ai-indicator state="awaiting"></nux-ai-indicator></div>
    <div class="demo-cell"><nux-ai-indicator state="routing"></nux-ai-indicator></div>
    <div class="demo-cell"><nux-ai-indicator state="tool"></nux-ai-indicator></div>
    <div class="demo-cell"><nux-ai-indicator state="streaming"></nux-ai-indicator></div>
  </div>
  <nux-ai-notice>
    <a href="#" @click.prevent="note">如何核实</a>
  </nux-ai-notice>
</div>`,
        code: `<nux-ai-badge text="AI 摘要"></nux-ai-badge>
<nux-ai-indicator state="tool"></nux-ai-indicator>
<nux-ai-notice>如何核实</nux-ai-notice>`,
        methods: { note() { window.showToast('演示链接，指向核实指南', 'info'); } }
      },
      {
        id: 'ai-progress',
        tag: 'nux-ai-task-progress',
        title: 'AI 任务过程态',
        desc: '阶段步骤条 + 进度条 + 取消按钮，长任务不再像卡死',
        tpl: `
<div class="demo-col">
  <nux-ai-task-progress title="正在生成周报" :stages="stages" :current="stages[idx].key"
    :message="msgs[idx]" :cancellable="true" @cancel="onCancel"></nux-ai-task-progress>
  <nux-ai-task-progress compact title="正在生成封面" :stages="stages" current="render"></nux-ai-task-progress>
</div>`,
        code: `<nux-ai-task-progress title="正在生成周报"
  :stages="[{key:'outline',label:'梳理大纲'},{key:'data',label:'汇总数据'},{key:'render',label:'成文渲染'}]"
  current="data" message="正在汇总近 30 天数据"
  :cancellable="true" @cancel="stopTask"></nux-ai-task-progress>`,
        data() {
          return {
            idx: 0,
            stages: [
              { key: 'outline', label: '梳理大纲' },
              { key: 'data', label: '汇总数据' },
              { key: 'render', label: '成文渲染' }
            ],
            msgs: ['正在梳理本周要点…', '正在汇总近 30 天数据…', '正在排版输出…']
          };
        },
        mounted() {
          this.timer = setInterval(() => { this.idx = (this.idx + 1) % 3; }, 2000);
        },
        beforeUnmount() { clearInterval(this.timer); },
        methods: { onCancel() { window.showToast('已请求取消（演示不中断轮播）', 'info'); } }
      },
      {
        id: 'clarify',
        tag: 'nux-clarify-card',
        title: '生成前澄清',
        desc: '生成前先问关键问题，单选/多选/自定义补充，减少无效生成',
        tpl: `
<div>
  <nux-clarify-card :questions="qs" message="先确认两件事，总结会写得更贴合你的场景"
    @submit="onSubmit" @skip="onSkip"></nux-clarify-card>
  <p class="demo-note" v-if="last">最近提交：{{ last }}</p>
</div>`,
        code: `<nux-clarify-card :questions="questions"
  @submit="onSubmit" @skip="onSkip"></nux-clarify-card>
// questions 元素: { key, question, type: 'single'|'multiple', options, allow_custom, max_select }`,
        data() {
          return {
            last: '',
            qs: [
              {
                key: 'audience', question: '这份周报给谁看？', type: 'single',
                options: [
                  { value: 'me', label: '自己复盘' },
                  { value: 'boss', label: '汇报给上级', recommended: true },
                  { value: 'team', label: '团队同步' }
                ]
              },
              {
                key: 'focus', question: '重点保留哪些内容？', type: 'multiple', max_select: 2,
                options: [
                  { value: 'num', label: '关键数字' },
                  { value: 'todo', label: '待办事项' },
                  { value: 'risk', label: '风险提示' }
                ]
              }
            ]
          };
        },
        methods: {
          onSubmit(answers) {
            this.last = JSON.stringify(answers);
            window.showToast('已收到澄清答案', 'success');
          },
          onSkip() { window.showToast('已跳过，直接生成', 'info'); }
        }
      },
      {
        id: 'result-view',
        tag: 'nux-result-view',
        title: '结构化结果',
        desc: 'AI 输出的表格 / 键值两种结构化展示，无需自己拼 HTML',
        tpl: `
<div class="demo-col">
  <div class="demo-row">
    <nux-button size="sm" :variant="mode === 'table' ? 'primary' : 'ghost'" @click="mode = 'table'">表格型</nux-button>
    <nux-button size="sm" :variant="mode === 'kv' ? 'primary' : 'ghost'" @click="mode = 'kv'">键值型</nux-button>
  </div>
  <nux-result-view :struct="mode === 'table' ? table : kv"></nux-result-view>
</div>`,
        code: `<nux-result-view :struct="struct"></nux-result-view>
struct = { kind: 'table', summary: {...}, columns: [...], rows: [{类别:'餐饮', 金额:'¥486'}] }
struct = { kind: 'kv', pairs: [{ k: '作品状态', v: '连载中' }] }
// rows 按列名取值（对象数组），pairs 是 {k,v} 数组；与 nexus-structured.js 产出同构`,
        data() {
          return {
            mode: 'table',
            table: {
              kind: 'table',
              summary: { '合计支出': '¥1,286', '较上月': '-8.4%' },
              columns: ['类别', '金额', '占比'],
              rows: [
                { '类别': '餐饮', '金额': '¥486', '占比': '37.8%' },
                { '类别': '交通', '金额': '¥215', '占比': '16.7%' },
                { '类别': '订阅', '金额': '¥185', '占比': '14.4%' },
                { '类别': '购物', '金额': '¥400', '占比': '31.1%' }
              ]
            },
            kv: {
              kind: 'kv',
              pairs: [
                { k: '作品状态', v: '连载中' },
                { k: '今日更新', v: '第 42 章' },
                { k: '累计字数', v: '18.6 万' },
                { k: '最近更新', v: '2 小时前' }
              ]
            }
          };
        }
      },
      {
        id: 'voice',
        tag: 'nux-voice-input',
        title: '语音输入',
        desc: '录音 → 转写 → 填入一气呵成；演示用本地 handler 模拟转写，不发送任何数据',
        tpl: `
<div class="demo-col">
  <div class="demo-row" style="align-items: center">
    <nux-voice-input :handler="fake" @result="onResult" @error="onErr"></nux-voice-input>
    <span class="demo-note">点击开始录音，松手结束并转写</span>
  </div>
  <p class="demo-note" v-if="last">识别结果：{{ last }}</p>
</div>`,
        code: `<nux-voice-input :handler="transcribe" @result="onResult"></nux-voice-input>
// handler: async (blob) => '转写文本'，不传则 POST transcribeUrl（multipart file）
// 事件: result({ text, duration }) / error / state-change`,
        data() { return { last: '' }; },
        methods: {
          async fake() {
            await new Promise(r => setTimeout(r, 900));
            return '今天完成了三公里晨跑，状态不错，明天继续。';
          },
          onResult(e) {
            this.last = e.text;
            window.showToast('转写完成，耗时 ' + Math.round(e.duration) + 's', 'success');
          },
          onErr(msg) { window.showToast(msg || '转写失败', 'error'); }
        }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'data2',
    name: '数据展示进阶',
    demos: [
      {
        id: 'tag',
        tag: 'nux-tag',
        title: '状态标签',
        desc: '六种语义色 + plain 描边款，比徽标更适合成组的状态列',
        tpl: `
<div class="demo-col">
  <div class="demo-row">
    <nux-tag>待处理</nux-tag>
    <nux-tag type="primary">进行中</nux-tag>
    <nux-tag type="success">已完成</nux-tag>
    <nux-tag type="warning">有风险</nux-tag>
    <nux-tag type="danger">已失败</nux-tag>
    <nux-tag type="info">已归档</nux-tag>
  </div>
  <div class="demo-row">
    <nux-tag type="success" :plain="true">上架中</nux-tag>
    <nux-tag type="warning" :plain="true">审核中</nux-tag>
    <nux-tag size="sm" type="info" :plain="true">小号描边</nux-tag>
  </div>
</div>`,
        code: `<nux-tag type="success">已完成</nux-tag>
<nux-tag type="warning" :plain="true">审核中</nux-tag>
<nux-tag size="sm" type="info">已归档</nux-tag>`
      },
      {
        id: 'icon',
        tag: 'nux-icon',
        title: '线性图标',
        desc: '46 个 24px 网格描边图标，替代 emoji 当图标；未知名称自动回退',
        tpl: `
<div class="demo-cells" style="grid-template-columns: repeat(auto-fill, minmax(96px, 1fr))">
  <div class="demo-cell" v-for="n in names" :key="n"
       style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 4px">
    <nux-icon :name="n" :size="20"></nux-icon>
    <span class="demo-note">{{ n }}</span>
  </div>
</div>`,
        code: `<nux-icon name="download" :size="18" label="下载"></nux-icon>
<nux-icon name="deck" :size="20" color="var(--nx-primary)"></nux-icon>`,
        data() {
          return { names: ['deck', 'doc', 'chart', 'poster', 'mindmap', 'sparkle', 'download', 'edit', 'search', 'qrcode', 'star', 'empty-box'] };
        }
      },
      {
        id: 'radar',
        tag: 'nux-radar-chart',
        title: '雷达图',
        desc: 'Canvas 绘制多数据集对比，高分屏自适应，随主题换肤',
        tpl: `
<div>
  <nux-radar-chart :labels="labels" :datasets="datasets" :max-value="100" :size="300"></nux-radar-chart>
  <p class="demo-note" style="margin-top: 8px">同一作者连续两个月的五维写作评估。</p>
</div>`,
        code: `<nux-radar-chart :labels="labels" :datasets="datasets"
  :max-value="100" :show-legend="true"></nux-radar-chart>
// datasets: [{ label, values, color }]`,
        data() {
          return {
            labels: ['选题', '结构', '文采', '节奏', '知识'],
            datasets: [
              { label: '十月', values: [86, 74, 68, 80, 62], color: '#0ea5e9' },
              { label: '九月', values: [70, 66, 60, 58, 55], color: '#94a3b8' }
            ]
          };
        }
      },
      {
        id: 'qrcode',
        tag: 'nux-qrcode',
        title: '二维码',
        desc: 'qrcodejs 按需自动加载，失败降级文案，支持 label 与 alt',
        tpl: `
<div class="demo-row" style="gap: 24px; align-items: flex-end">
  <nux-qrcode value="https://songguokr.com/nexus-ui" :size="168" label="扫码打开组件库" @ready="onReady"></nux-qrcode>
  <nux-qrcode value="NEXUS-UI-DEMO" :size="120" level="L"></nux-qrcode>
</div>`,
        code: `<nux-qrcode value="https://songguokr.com/x"
  :size="180" level="M" label="扫码打开" @ready="onReady"></nux-qrcode>`,
        methods: { onReady() { window.showToast('二维码已生成', 'success'); } }
      },
      {
        id: 'pickers',
        tag: 'nux-slider / nux-date-picker',
        title: '滑块与日期选择',
        desc: '原生 range / date 兜底，移动端调起系统面板，键盘可用',
        tpl: `
<div class="demo-col">
  <nux-slider v-model="score" :min="0" :max="100" :step="5" label="本周目标完成度" unit="%"></nux-slider>
  <nux-date-picker v-model="day" type="date" label="复习日期" :min="minD" :max="maxD" clearable></nux-date-picker>
  <p class="demo-note">滑块 {{ score }}% · 日期 {{ day || '未选择' }}</p>
</div>`,
        code: `<nux-slider v-model="score" :min="0" :max="100" :step="5" unit="%"></nux-slider>
<nux-date-picker v-model="day" type="date" :min="min" :max="max" clearable></nux-date-picker>`,
        data() {
          const pad = n => String(n).padStart(2, '0');
          const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
          const min = new Date(); min.setDate(min.getDate() - 30);
          const max = new Date(); max.setDate(max.getDate() + 90);
          return { score: 80, day: '', minD: iso(min), maxD: iso(max) };
        }
      },
      {
        id: 'breadcrumb',
        tag: 'nux-breadcrumb',
        title: '面包屑',
        desc: '末项自动高亮不可点，层级路径一行收口',
        tpl: `
<div class="demo-col">
  <nux-breadcrumb :items="crumbs"></nux-breadcrumb>
  <p class="demo-note">当前位于「{{ crumbs[crumbs.length - 1].label }}」，前两级可点击返回。</p>
</div>`,
        code: `<nux-breadcrumb :items="[
  { label: '首页', path: '/' },
  { label: '数据展示', path: '/data' },
  { label: '面包屑' }
]"></nux-breadcrumb>`,
        data() {
          return {
            crumbs: [
              { label: '首页', path: '#' },
              { label: '数据展示', path: '#' },
              { label: '面包屑' }
            ]
          };
        },
        methods: {}
      }
    ]
  });

  window.PG_CATS.push({
    id: 'auto',
    name: '自动化',
    demos: [
      {
        id: 'automation',
        tag: 'nux-automation',
        title: '自动化规则',
        desc: '规则列表 + 模板化新建/编辑弹窗，支持启停、立即执行、删除；演示数据全部在本地闭环',
        tpl: `
<div>
  <nux-automation :rules="rules" :templates="templates" :trigger-presets="presets"
    @create="onCreate" @update="onUpdate" @toggle="onToggle" @run="onRun" @remove="onRemove"></nux-automation>
</div>`,
        code: `<nux-automation :rules="rules" :templates="templates" :trigger-presets="presets"
  @create="createRule" @update="updateRule" @toggle="toggleRule"
  @run="runRule" @remove="removeRule"></nux-automation>
// rules 元素: { id, name, icon, enabled, action_type, action_config, trigger_type, trigger_config, last_run_at, last_status, last_message }`,
        data() {
          return {
            seq: 3,
            templates: [
              {
                type: 'digest', label: '定时摘要', icon: '📬', description: '到点汇总一条通知',
                fields: [{ key: 'title', label: '摘要标题', placeholder: '如：今日待办' }],
                default_config: { title: '今日待办' },
                default_trigger: { value: 1, every: 'days', at: '09:00' }
              },
              {
                type: 'reminder', label: '定时提醒', icon: '⏰', description: '到点推送一条提醒',
                fields: [{ key: 'message', label: '提醒内容', placeholder: '写点提醒的话' }],
                default_config: { message: '该起来走走了' }
              }
            ],
            presets: [
              { label: '每天 09:00', config: { value: 1, every: 'days', at: '09:00' } },
              { label: '每小时', config: { value: 1, every: 'hours' } },
              { label: '每周一 08:30', config: { cron: { day_of_week: 'mon', hour: 8, minute: 30 } } },
              { label: '每月 1 日 09:00', config: { cron: { day: 1, hour: 9, minute: 0 } } }
            ],
            rules: [
              {
                id: 1, name: '早间摘要', icon: '📬', enabled: true,
                action_type: 'digest', action_config: { title: '今日待办' },
                trigger_type: 'schedule', trigger_config: { value: 1, every: 'days', at: '09:00' },
                last_run_at: '今天 09:00', last_status: 'done', last_message: '已生成 5 条待办'
              },
              {
                id: 2, name: '下午起身提醒', icon: '⏰', enabled: false,
                action_type: 'reminder', action_config: { message: '该起来走走了' },
                trigger_type: 'schedule', trigger_config: { cron: { day_of_week: 'mon', hour: 15, minute: 0 } }
              }
            ]
          };
        },
        methods: {
          now() {
            const d = new Date();
            return '今天 ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
          },
          onCreate(p) {
            this.rules.push(Object.assign({ id: this.seq++, enabled: true }, p));
            window.showToast('规则已创建（演示存于内存）', 'success');
          },
          onUpdate(id, p) {
            const r = this.rules.find(x => x.id === id);
            if (r) Object.assign(r, p);
            window.showToast('规则已保存', 'success');
          },
          onToggle(rule, enabled) {
            rule.enabled = enabled;
            window.showToast(rule.name + (enabled ? ' 已启用' : ' 已停用'), enabled ? 'success' : 'info');
          },
          onRun(rule) {
            rule.last_run_at = this.now();
            rule.last_status = 'done';
            rule.last_message = '演示执行完成';
            window.showToast('「' + rule.name + '」已立即执行', 'success');
          },
          onRemove(rule) {
            this.rules = this.rules.filter(x => x.id !== rule.id);
            window.showToast('「' + rule.name + '」已删除', 'info');
          }
        }
      }
    ]
  });
})();
