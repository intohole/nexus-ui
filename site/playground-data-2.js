(function() {
  window.PG_CATS = window.PG_CATS || [];

  window.PG_CATS.push({
    id: 'feedback',
    name: '反馈弹层',
    demos: [
      {
        id: 'toast',
        tag: 'nux-toast',
        title: 'Toast 通知',
        desc: 'showToast 全局函数，四种语义类型',
        tpl: `
<div class="demo-row">
  <nux-button size="sm" @click="show('保存成功', 'success')">成功</nux-button>
  <nux-button size="sm" variant="ghost" @click="show('请注意核对', 'warning')">警告</nux-button>
  <nux-button size="sm" variant="ghost" @click="show('网络连接异常', 'error')">错误</nux-button>
  <nux-button size="sm" variant="ghost" @click="show('这是一条提示', 'info')">提示</nux-button>
</div>`,
        code: `window.showToast('保存成功', 'success');

<nux-toast></nux-toast>`,
        methods: { show(msg, type) { window.showToast(msg, type); } }
      },
      {
        id: 'modal',
        tag: 'nux-modal',
        title: '弹窗',
        desc: 'v-model 控制显隐，遮罩点击关闭，footer 插槽可覆盖',
        tpl: `
<div>
  <nux-button @click="open = true">打开弹窗</nux-button>
  <nux-modal v-model="open" title="发布确认">
    <p style="color: var(--nx-text-secondary); margin: 0">发布后将同步到所有订阅者，确认继续吗？</p>
  </nux-modal>
</div>`,
        code: `<nux-modal v-model="open" title="发布确认" @confirm="doPublish">
  <p>发布后将同步到所有订阅者，确认继续吗？</p>
</nux-modal>`,
        data() { return { open: false }; }
      },
      {
        id: 'drawer',
        tag: 'nux-drawer',
        title: '抽屉',
        desc: '左右侧滑出，移动端最大 85vw',
        tpl: `
<div>
  <nux-button variant="ghost" @click="open = true">打开抽屉</nux-button>
  <nux-drawer v-model="open" side="right" width="300px">
    <div style="padding: 20px">
      <h4 style="margin: 0 0 8px">筛选条件</h4>
      <p style="color: var(--nx-text-secondary); font-size: 13px">抽屉内容放这里。</p>
    </div>
  </nux-drawer>
</div>`,
        code: `<nux-drawer v-model="open" side="right" width="300px">
  <div style="padding: 20px">抽屉内容放这里。</div>
</nux-drawer>`,
        data() { return { open: false }; }
      },
      {
        id: 'confirm',
        tag: 'nux-confirm',
        title: '确认对话框',
        desc: 'Promise 风格全局函数，await 得到布尔结果',
        tpl: `
<div class="demo-row">
  <nux-button variant="danger" @click="del">删除记录</nux-button>
  <nux-button variant="ghost" @click="quit">退出登录</nux-button>
</div>`,
        code: `const ok = await window.nuxConfirm('确定删除这条记录吗？', '删除确认');
if (ok) showToast('已删除', 'success');`,
        methods: {
          async del() {
            const ok = await window.nuxConfirm('确定删除这条记录吗？', '删除确认');
            window.showToast(ok ? '已删除' : '已取消', ok ? 'success' : 'info');
          },
          async quit() {
            const ok = await window.nuxConfirm('确定要退出登录吗？', '退出确认');
            window.showToast(ok ? '已退出' : '已取消', 'info');
          }
        }
      },
      {
        id: 'empty-skeleton',
        tag: 'nux-empty / nux-skeleton',
        title: '空状态与骨架屏',
        desc: 'loading 期间展示骨架，数据为空展示引导',
        tpl: `
<div class="demo-col">
  <div class="demo-row">
    <nux-button size="sm" variant="ghost" @click="loading = !loading">{{ loading ? '加载完成' : '重新加载' }}</nux-button>
  </div>
  <nux-skeleton :loading="loading" :rows="3" :avatar="true">
    <div class="demo-cell" style="text-align: left">真实内容：加载完成后渲染插槽。</div>
  </nux-skeleton>
  <nux-empty icon="🗂️" title="还没有记录" description="创建第一条记录，开始你的积累"></nux-empty>
</div>`,
        code: `<nux-skeleton :loading="loading" :rows="3" :avatar="true">
  <real-content></real-content>
</nux-skeleton>
<nux-empty icon="🗂️" title="还没有记录"
  description="创建第一条记录，开始你的积累"></nux-empty>`,
        data() { return { loading: true }; },
        mounted() { setTimeout(() => { this.loading = false; }, 2600); }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'data',
    name: '数据展示',
    demos: [
      {
        id: 'stat',
        tag: 'nux-stat-card',
        title: '统计卡片',
        desc: '图标 / 数值 / 趋势，一行搭出数据看板',
        tpl: `
<div class="demo-cells" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))">
  <nux-stat-card icon="📝" value="128" label="本周笔记" :trend="12"></nux-stat-card>
  <nux-stat-card icon="👥" value="1,024" label="活跃用户" :trend="6"></nux-stat-card>
  <nux-stat-card icon="⚡" value="99.9%" label="服务可用性"></nux-stat-card>
</div>`,
        code: `<nux-stat-card icon="📝" value="128" label="本周笔记" :trend="12"></nux-stat-card>
<nux-stat-card icon="👥" value="1,024" label="活跃用户" :trend="6"></nux-stat-card>`
      },
      {
        id: 'badge-avatar',
        tag: 'nux-badge / nux-avatar',
        title: '徽标与头像',
        desc: '圆点 / 计数徽标，字母头像自动取首字符',
        tpl: `
<div class="demo-row" style="gap: 24px">
  <nux-badge :count="8"><nux-button variant="ghost" size="sm">消息</nux-button></nux-badge>
  <nux-badge :count="128"><nux-button variant="ghost" size="sm">通知</nux-button></nux-badge>
  <nux-badge dot type="danger"><nux-button variant="ghost" size="sm">实时</nux-button></nux-badge>
  <nux-avatar name="林" size="md"></nux-avatar>
  <nux-avatar name="Nexus" size="md" shape="square"></nux-avatar>
  <nux-avatar size="md"></nux-avatar>
</div>`,
        code: `<nux-badge :count="8"><nux-button>消息</nux-button></nux-badge>
<nux-badge dot type="danger"><nux-button>实时</nux-button></nux-badge>
<nux-avatar name="林" size="md"></nux-avatar>`
      },
      {
        id: 'table',
        tag: 'nux-data-table',
        title: '数据表格',
        desc: 'columns 配置、行选择、行点击事件',
        tpl: `
<nux-data-table :columns="cols" :data="rows" :selectable="true"
                :selected-keys="sel" @select="k => sel = k"
                @row-click="r => showToast('查看 ' + r.name, 'info')"></nux-data-table>`,
        code: `<nux-data-table :columns="cols" :data="rows"
  :selectable="true" :selected-keys="sel"
  @select="k => sel = k" @row-click="onRowClick"></nux-data-table>`,
        data() {
          return {
            sel: [],
            cols: [
              { key: 'name', label: '应用' },
              { key: 'owner', label: '负责人' },
              { key: 'status', label: '状态' }
            ],
            rows: [
              { id: 1, name: '思悟笔记', owner: '林一', status: '运行中' },
              { id: 2, name: '码趣星', owner: '陈二', status: '运行中' },
              { id: 3, name: '知路', owner: '张三', status: '部署中' }
            ]
          };
        }
      },
      {
        id: 'pagination',
        tag: 'nux-pagination',
        title: '分页',
        desc: '上一页 / 下一页 / 页码信息',
        tpl: `
<div class="demo-col">
  <nux-pagination :page="page" :total-pages="12" :has-prev="page > 1" :has-next="page < 12"
                  @prev="page--" @next="page++" @goto="p => page = p"></nux-pagination>
  <p class="demo-note">第 {{ page }} 页，共 12 页</p>
</div>`,
        code: `<nux-pagination :page="page" :total-pages="12"
  :has-prev="page > 1" :has-next="page < 12"
  @prev="page--" @next="page++"></nux-pagination>`,
        data() { return { page: 3 }; }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'calendar',
    name: '日历',
    demos: [
      {
        id: 'cal-month',
        tag: 'nux-calendar',
        title: '月视图',
        desc: '活跃度色阶随主题色流动，计数角标、今天描边、切月回调',
        tpl: `
<nux-calendar v-model="sel" :levels="levels" :counts="counts"
              @date-select="d => showToast('选中 ' + d, 'info')"
              @month-change="m => showToast(m.year + ' 年 ' + m.month + ' 月', 'info')"></nux-calendar>`,
        code: `<nux-calendar v-model="sel"
  :levels="{'2026-09-02': 3}" :counts="{'2026-09-02': 5}"
  @date-select="onPick" @month-change="loadMonth"></nux-calendar>`,
        data() {
          const pad = n => String(n).padStart(2, '0')
          const now = new Date()
          const y = now.getFullYear(), m = now.getMonth() + 1
          const total = new Date(y, m, 0).getDate()
          const seed = [2, 0, 3, 4, 1, 2, 0, 4, 2, 1, 3, 4, 2, 0, 1, 3, 4, 4, 2, 1, 0, 3, 2, 4, 1, 2, 3, 0, 2, 4, 1]
          const levels = {}, counts = {}
          for (let d = 1; d <= total; d++) {
            const k = y + '-' + pad(m) + '-' + pad(d)
            levels[k] = seed[(d * 7) % seed.length]
            if (levels[k] > 0) counts[k] = (d * 3) % 9 + 1
          }
          return { levels, counts, sel: '' }
        },
        methods: {
          showToast(msg, type) { window.showToast(msg, type); }
        }
      },
      {
        id: 'cal-sequence',
        tag: 'nux-calendar',
        title: '序列打卡',
        desc: '挑战期第 N 天序列，状态枚举着色，适配打卡、养成类场景',
        tpl: `
<nux-calendar mode="sequence" :start-date="start" :total-days="30" :records="records"
              @date-select="(d, c) => showToast('查看第 ' + (c.index + 1) + ' 天', 'info')"></nux-calendar>`,
        code: `<nux-calendar mode="sequence"
  :start-date="'2026-08-13'" :total-days="30"
  :records="[{'date': '2026-08-13', 'status': 'checked'}]"
  @date-select="openDay"></nux-calendar>`,
        data() {
          const pad = n => String(n).padStart(2, '0')
          const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
          const start = new Date()
          start.setDate(start.getDate() - 20)
          const records = []
          for (let i = 0; i < 30; i++) {
            const d = new Date(start)
            d.setDate(d.getDate() + i)
            if (d > new Date()) break
            const st = i % 7 === 3 ? 'frozen' : (i % 11 === 5 ? 'mended' : (i % 5 === 4 ? null : 'checked'))
            if (st) records.push({ date: key(d), status: st })
          }
          return { start: key(start), records }
        },
        methods: {
          showToast(msg, type) { window.showToast(msg, type); }
        }
      },
      {
        id: 'cal-heatmap',
        tag: 'nux-calendar',
        title: '热力图',
        desc: 'GitHub 式周列热力，月份标签自动定位，移动端横向滑动',
        tpl: `
<nux-calendar mode="heatmap" :cells="cells" @date-select="(d, c) => showToast(d + ' · ' + (c.value || 0) + ' 次', 'info')"></nux-calendar>`,
        code: `<nux-calendar mode="heatmap"
  :cells="[{'date': '2026-09-01', 'level': 3, 'value': 6, 'unit': '次'}]"
  @date-select="onPick"></nux-calendar>`,
        data() {
          const pad = n => String(n).padStart(2, '0')
          const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
          const cells = []
          const start = new Date()
          start.setDate(start.getDate() - 90)
          const today = new Date()
          for (let i = 0; i <= 90; i++) {
            const d = new Date(start)
            d.setDate(d.getDate() + i)
            if (d > today) break
            const v = (i * 13) % 7
            cells.push({ date: key(d), level: v >= 6 ? 4 : v >= 4 ? 3 : v >= 2 ? 2 : v >= 1 ? 1 : 0, value: v * 2, unit: '次' })
          }
          return { cells }
        },
        methods: {
          showToast(msg, type) { window.showToast(msg, type); }
        }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'ai',
    name: 'Markdown 与 AI',
    demos: [
      {
        id: 'markdown',
        tag: 'NexusMarkdown',
        title: 'Markdown 安全渲染',
        desc: 'marked + DOMPurify + highlight.js，AI 输出直接渲染，代码块带复制按钮',
        tpl: `
<div class="nexus-md" ref="md"></div>`,
        code: `NexusMarkdown.renderToAsync(el, mdText);
const html = NexusMarkdown.render(mdText);`,
        mounted() {
          if (window.NexusMarkdown && this.$refs.md) {
            window.NexusMarkdown.renderToAsync(this.$refs.md, this.sample);
          }
        },
        data() {
          return {
            sample: [
              '## 渲染引擎',
              '',
              'AI 输出的 **Markdown** 会被安全渲染，`inline code` 与代码块高亮：',
              '',
              '```js',
              'const api = new NexusApi({ baseUrl: "/api/v1" });',
              'await api.get("/notes");',
              '```',
              '',
              '> XSS 内容会被 DOMPurify 过滤，业务侧零负担。'
            ].join('\n')
          };
        }
      },
      {
        id: 'aichat',
        tag: 'nux-ai-chat',
        title: 'AI 对话组件',
        desc: '流式输出、停止、重试、快捷回复全部内置；本页用本地模拟流演示，接 sendHandler 即接真实模型',
        tpl: `
<div style="height: 420px">
  <nux-ai-chat :messages="msgs" :send-handler="handler"
               placeholder="问点什么，回车发送"></nux-ai-chat>
</div>`,
        code: `<nux-ai-chat :messages="msgs" :send-handler="handler"
  placeholder="问点什么，回车发送"></nux-ai-chat>

async handler(text, cb) {
  const reply = await askLLM(text);
  let i = 0;
  const timer = setInterval(() => {
    i += 2;
    cb.onChunk(reply.slice(0, i), reply.slice(0, i));
    if (i >= reply.length) { clearInterval(timer); cb.onDone(reply); }
  }, 30);
  cb.registerStop(() => clearInterval(timer));
}`,
        data() {
          return {
            msgs: [
              { role: 'assistant', content: '你好，我是 Nexus UI 的演示助手。试试问我「你能做什么」——回复是本地模拟的流式输出，不消耗任何模型调用。' }
            ]
          };
        },
        methods: {
          handler(text, cb) {
            const reply = text.includes('能做什么')
              ? '我可以流式回答问题、渲染 **Markdown**、支持**停止**与**重试**。\n\n- 接入 `sendHandler` 即可对接任意模型\n- 接入 `apiConfig` 可走统一的 NexusApi 网关'
              : '收到：「' + text + '」。\n\n这是本地模拟的流式回复。把 `sendHandler` 换成你的模型网关，这里就会输出真实回答。';
            let i = 0;
            const timer = setInterval(() => {
              i += 2;
              cb.onChunk(reply.slice(0, i), reply.slice(0, i));
              if (i >= reply.length) {
                clearInterval(timer);
                cb.onDone(reply);
              }
            }, 24);
            cb.registerStop(() => clearInterval(timer));
          }
        }
      }
    ]
  });
})();
