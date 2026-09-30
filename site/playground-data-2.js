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
        code: `window.showToast('保存成功', 'success');`,
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
        id: 'prompt',
        tag: 'nux-prompt',
        title: '输入对话框',
        desc: 'Promise 风格全局函数，await 得到输入文本（取消为 null），必填校验错误驻留',
        tpl: `
<div class="demo-row">
  <nux-button @click="rename">重命名</nux-button>
  <nux-button variant="danger" @click="reject">驳回申请</nux-button>
</div>`,
        code: `const name = await window.nuxPrompt({
  title: '重命名', value: '当前名称', placeholder: '输入新名称'
});
if (name !== null) showToast('已改名：' + name, 'success');

const reason = await window.nuxPrompt({
  title: '驳回申请', required: true, requiredMessage: '请填写驳回原因',
  confirmText: '驳回', confirmType: 'danger'
});
if (reason !== null) showToast('已驳回', 'success');`,
        methods: {
          async rename() {
            const name = await window.nuxPrompt({
              title: '重命名', value: '季度报表', placeholder: '输入新名称'
            });
            if (name) window.showToast('已改名：' + name, 'success');
          },
          async reject() {
            const reason = await window.nuxPrompt({
              title: '驳回申请', message: '将通知申请人', required: true,
              requiredMessage: '请填写驳回原因', confirmText: '驳回', confirmType: 'danger'
            });
            if (reason !== null) window.showToast('已驳回：' + reason, 'success');
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
  <nux-empty-state icon="🗂️" title="还没有记录" description="创建第一条记录，开始你的积累"></nux-empty-state>
</div>`,
        code: `<nux-skeleton :loading="loading" :rows="3" :avatar="true">
  <real-content></real-content>
</nux-skeleton>
<nux-empty-state icon="🗂️" title="还没有记录"
  description="创建第一条记录，开始你的积累"></nux-empty-state>`,
        data() { return { loading: true }; },
        mounted() { setTimeout(() => { this.loading = false; }, 2600); }
      },
      {
        id: 'error-state',
        tag: 'nux-error-state',
        title: '错误态',
        desc: '加载失败的兜底视图：图标 + 标题 + 描述 + 错误码，内置重试按钮',
        tpl: `
<nux-error-state icon="🛰️" title="服务暂时不可用"
  message="请求超时，请检查网络后重试" code="ERR-504"
  retry-text="重新加载" @retry="onRetry"></nux-error-state>`,
        code: `<nux-error-state icon="🛰️" title="服务暂时不可用"
  message="请求超时，请检查网络后重试" code="ERR-504"
  retry-text="重新加载" @retry="reload"></nux-error-state>`,
        data() { return { tries: 0 }; },
        methods: {
          onRetry() {
            this.tries++;
            window.showToast('第 ' + this.tries + ' 次重试请求…（演示）', 'info');
          }
        }
      },
      {
        id: 'undo-toast',
        tag: 'nux-undo-toast',
        title: '可撤销提示',
        desc: 'text 变化即弹出，倒计时结束自动消失；与删除操作搭配防误触',
        tpl: `
<div>
  <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
    <div v-for="t in topics" :key="t"
         style="padding:10px 14px;border:1px solid var(--nx-border);border-radius:10px;font-size:14px">{{ t }}</div>
    <div v-if="deleted"
         style="padding:10px 14px;border:1px dashed var(--nx-border);border-radius:10px;color:var(--nx-text-muted);font-size:13px">「晨间随笔」已删除</div>
  </div>
  <nux-button variant="danger" :disabled="deleted" @click="doDelete">删除「晨间随笔」</nux-button>
  <nux-undo-toast :text="undoText" :duration="5000"
    @undo="onUndo" @dismiss="onDismiss"></nux-undo-toast>
</div>`,
        code: `<nux-button variant="danger" @click="doDelete">删除</nux-button>
<nux-undo-toast :text="undoText" :duration="6000"
  @undo="onUndo" @dismiss="onDismiss"></nux-undo-toast>
// doDelete: undoText = '已删除「晨间随笔」'；onUndo: 恢复数据并清空 text`,
        data() { return { deleted: false, undoText: '', topics: ['晨间随笔', '读书摘抄', '周末骑行路线'] }; },
        methods: {
          doDelete() {
            this.deleted = true;
            this.undoText = '已删除「晨间随笔」';
          },
          onUndo() {
            this.deleted = false;
            this.undoText = '';
            window.showToast('已恢复「晨间随笔」', 'success');
          },
          onDismiss() { this.undoText = ''; }
        }
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
      },
      {
        id: 'checkin',
        tag: 'nux-checkin',
        title: '打卡挑战卡',
        desc: '连续天数 + 里程碑 + 打卡日历一体；binary/counter/timer/text 四种任务形态与补签冻结',
        tpl: `
<nux-checkin title="每日写作打卡" icon="✍️" task-type="binary"
  :streak="streak" :prev-streak="prevStreak"
  :completed-days="completedDays" :total-days="30"
  :start-date="start" :records="records" :missed-dates="missedDates"
  :mend-left="1" :freeze-left="1" :checked-in="checkedIn"
  @checkin="onCheckin"
  @open-day="d => showToast('查看 ' + d + ' 的打卡详情', 'info')"
  @mend="showToast('补签申请已提交（演示）', 'info')"
  @freeze="showToast('已使用冻结卡（演示）', 'info')"
  @repair="showToast('已发起修复（演示）', 'info')"></nux-checkin>`,
        code: `<nux-checkin title="每日写作打卡" icon="✍️" task-type="binary"
  :streak="12" :prev-streak="11" :completed-days="12" :total-days="30"
  :start-date="start" :records="records" :checked-in="false"
  @checkin="onCheckin" @open-day="openDay"></nux-checkin>
// task-type: binary | counter | timer | text；@checkin({ value }) 上报打卡`,
        data() {
          const pad = n => String(n).padStart(2, '0')
          const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
          const start = new Date()
          start.setDate(start.getDate() - 22)
          const records = []
          const missedDates = []
          for (let i = 0; i <= 22; i++) {
            const d = new Date(start)
            d.setDate(d.getDate() + i)
            const k = key(d)
            if (i === 6 || i === 13) { missedDates.push(k); continue }
            const st = i === 9 ? 'frozen' : (i === 17 ? 'mended' : 'checked')
            records.push({ date: k, status: st })
          }
          const checkedDays = records.filter(r => r.status !== 'frozen').length
          return {
            start: key(start), records, missedDates,
            streak: 9, prevStreak: 9, checkedIn: false,
            completedDays: checkedDays
          }
        },
        methods: {
          showToast(msg, type) { window.showToast(msg, type); },
          onCheckin() {
            if (this.checkedIn) return;
            this.checkedIn = true;
            this.prevStreak = this.streak;
            this.streak += 1;
            this.completedDays += 1;
            window.showToast('打卡成功，已连续 ' + this.streak + ' 天', 'success');
          }
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
        desc: '流式输出、停止、重试、快捷回复、语音输入全部内置；本页用本地模拟流演示，接 sendHandler 即接真实模型',
        tpl: `
<div style="height: 420px">
  <nux-ai-chat :messages="msgs" :send-handler="handler"
               :features="{ voice: true }" :input-config="{ voiceUrl: '/mock/transcribe' }"
               placeholder="问点什么，回车发送"></nux-ai-chat>
</div>`,
        code: `<nux-ai-chat :messages="msgs" :send-handler="handler"
  :features="{ voice: true }" :input-config="{ voiceUrl: '/api/transcribe' }"
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
      },
      {
        id: 'camera-recognize',
        tag: 'nux-camera-recognize',
        title: '拍照识别',
        desc: '拍照/相册 → AI 识别 → 结果展示一条龙；这里用本地假识别函数演示，接 nexus-backend /api/vision/recognize 即为真实识别',
        tpl: `
<div>
  <nux-camera-recognize
    prompt="识别图片中的主体并简要描述"
    :auto-recognize="true"
    hint="演示用本地假识别；支持拍照或相册选图"
    @success="onSuccess" @error="onError" @cancel="onCancel"></nux-camera-recognize>
</div>`,
        code: `<!-- 真实场景：对接 nexus-backend 通用识别路由 -->
<nux-camera-recognize upload-url="/api/vision/recognize"
  prompt="识别图片中的物品并列出名称与数量"
  @success="onSave" @error="onErr"></nux-camera-recognize>

<!-- 私有接口：handler 自定义识别函数 -->
<nux-camera-recognize :handler="recognize"></nux-camera-recognize>`,
        methods: {
          recognize(file, { signal }) {
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => {
                resolve('**识别结果（本地模拟）**\n\n- 主体：一只橘色的猫\n- 场景：室内沙发\n- 置信度：92%\n\n> 把 `upload-url` 指向 `/api/vision/recognize` 即为真实识别。');
              }, 1600);
              if (signal) {
                signal.addEventListener('abort', () => {
                  clearTimeout(timer);
                  const err = new Error('已取消');
                  err.name = 'AbortError';
                  reject(err);
                });
              }
            });
          },
          onSuccess(payload) { window.showToast('识别完成：' + String(payload).slice(0, 20) + '…', 'success'); },
          onError(err) { if (err && err.name !== 'AbortError') window.showToast(err.message || '识别失败', 'error'); },
          onCancel() { window.showToast('已取消识别', 'info'); }
        }
      },
      {
        id: 'conversation-list',
        tag: 'nux-conversation-list',
        title: '会话列表',
        desc: '搜索 / 新建 / 归档 / 删除全内置，挂载即拉取列表；本页用 mockApi 假数据演示，传 api 即接真实接口',
        tpl: `
<div style="height: 430px; max-width: 360px; border: 1px solid var(--nx-border); border-radius: 12px; overflow: hidden">
  <nux-conversation-list :api="mockApi" :active-id="activeId"
    @select="onSelect" @created="onCreated" @deleted="onDeleted"
    @archive="onArchive" @error="onError"></nux-conversation-list>
</div>`,
        code: `<nux-conversation-list :api="api" :active-id="activeId"
  new-title="新对话" @select="onSelect" @created="onCreated"
  @deleted="onDeleted" @archive="onArchive" @error="onError"></nux-conversation-list>
// api 需实现 get/post/patch/delete；listAdapter / itemAdapter 可适配返回结构`,
        data() {
          const wait = (ms) => new Promise(r => setTimeout(r, ms));
          const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
          const store = [
            { id: 'c1', title: '九月的旅行路书', status: 'active', updated_at: ago(0.5) },
            { id: 'c2', title: '产品命名头脑风暴', status: 'active', updated_at: ago(5) },
            { id: 'c3', title: '周报草稿润色', status: 'active', updated_at: ago(26) },
            { id: 'c4', title: '上季度的复盘讨论', status: 'archived', updated_at: ago(72) },
            { id: 'c5', title: '给新人的上手指南', status: 'active', updated_at: ago(120) }
          ];
          let seq = 100;
          return {
            activeId: 'c1',
            mockApi: {
              async get(url, params) {
                await wait(420);
                if (url.indexOf('/search') >= 0) {
                  const kw = ((params && params.q) || '').toLowerCase();
                  const hit = store.filter(c => c.title.toLowerCase().indexOf(kw) >= 0);
                  return { data: { items: hit, total: hit.length } };
                }
                return { data: { items: store.slice(), total: store.length } };
              },
              async post(url, body) {
                await wait(460);
                const conv = { id: 'c' + (++seq), title: (body && body.title) || '新对话', status: 'active', updated_at: new Date().toISOString() };
                store.unshift(conv);
                return { data: conv };
              },
              async patch(url, body) {
                await wait(360);
                const conv = store.find(c => url.indexOf('/' + c.id) >= 0);
                if (conv && body && body.status) conv.status = body.status;
                return conv ? { data: { id: conv.id, status: conv.status } } : null;
              },
              async delete(url) {
                await wait(360);
                const idx = store.findIndex(c => url.indexOf('/' + c.id) >= 0);
                if (idx >= 0) store.splice(idx, 1);
              }
            }
          };
        },
        methods: {
          onSelect(c) { this.activeId = c.id; window.showToast('已切换到「' + (c.title || '新对话') + '」', 'info'); },
          onCreated(c) { this.activeId = c.id; window.showToast('已创建「' + c.title + '」', 'success'); },
          onDeleted(id) {
            if (this.activeId === id) this.activeId = '';
            window.showToast('会话已删除', 'success');
          },
          onArchive(c, toArchive) { window.showToast('已' + (toArchive ? '归档' : '恢复') + '「' + (c.title || '会话') + '」', 'info'); },
          onError() { window.showToast('接口异常（演示为本地 mock，不应出现）', 'error'); }
        }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'utils',
    name: '工具函数',
    demos: [
      {
        id: 'compress-image',
        tag: 'nux-file-upload',
        title: '图片压缩 compressImage',
        desc: 'NexusUtils.compressImage：上传前本地压缩，支持 file/blob/dataurl 三种输出',
        tpl: `
<div>
  <nux-file-upload accept="image/*" :multiple="false" :auto-upload="false" hint="选择图片后立即压缩" @change="onPick"></nux-file-upload>
  <p v-if="result" style="margin: 12px 0 0; color: var(--nx-text-secondary); font-size: 13px">
    原始 {{ result.before }} → 压缩后 {{ result.after }}（{{ result.ratio }}）
  </p>
</div>`,
        code: `const out = await NexusUtils.compressImage(file, {
  maxDim: 1600,
  quality: 0.85,
  output: 'file'
});
// output: 'file' | 'blob' | 'dataurl'`,
        data() { return { result: null }; },
        methods: {
          async onPick(files) {
            const file = files && files[0];
            if (!file) return;
            const out = await window.NexusUtils.compressImage(file, { maxDim: 1280, quality: 0.82 });
            const fmt = (b) => b > 1048576 ? (b / 1048576).toFixed(2) + ' MB' : Math.round(b / 1024) + ' KB';
            this.result = {
              before: fmt(file.size),
              after: fmt(out.size),
              ratio: Math.max(1, Math.round(file.size / Math.max(out.size, 1))) + ' 倍'
            };
            window.showToast('压缩完成', 'success');
          }
        }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'layouts',
    name: '布局骨架',
    demos: [
      {
        id: 'layout-sidebar',
        tag: 'nux-layout-sidebar',
        title: '侧边栏布局',
        desc: '分组菜单/折叠/徽标，头部操作插槽；窗口缩到 ≤768px 自动变汉堡按钮 + 抽屉（useMobile 驱动）',
        tpl: `
<div class="pgls-scope" style="position: relative; height: 460px; border: 1px solid var(--nx-border); border-radius: 12px; overflow: hidden;">
  <nux-layout-sidebar app-name="松果氪运营台" app-icon="🌰"
    :menu-groups="groups" :current-path="current" collapsible
    @navigate="onNav">
    <template #header-actions>
      <nux-button size="sm" variant="ghost" @click="note('新建作品已加入草稿箱')">＋ 新建</nux-button>
    </template>
    <div style="padding: 20px 24px">
      <p style="margin: 0 0 6px; font-weight: 600; font-size: 15px">当前栏目：{{ activeLabel }}</p>
      <p class="demo-note" style="margin: 0">这里是主内容区。桌面端可折叠侧栏，窄屏请用左上角汉堡按钮开合抽屉。</p>
    </div>
  </nux-layout-sidebar>
</div>`,
        code: `<nux-layout-sidebar app-name="运营台" app-icon="🌰"
  :menu-groups="groups" :current-path="current" collapsible
  @navigate="onNav">
  <template #header-actions>…</template>
  <main>内容</main>
</nux-layout-sidebar>
// 依赖 js/composables/use-mobile.js（汉堡/抽屉联动）`,
        data() {
          return {
            current: '/works',
            groups: [
              { title: '创作', items: [
                { path: '/works', label: '作品库', icon: '<i class="fa-regular fa-file-lines"></i>', badge: '12' },
                { path: '/storm', label: '头脑风暴', icon: '<i class="fa-solid fa-wand-magic-sparkles"></i>' },
                { path: '/combiner', label: '创意组合', icon: '<i class="fa-solid fa-shuffle"></i>' }
              ] },
              { title: '数据', items: [
                { path: '/dashboard', label: '数据看板', icon: '<i class="fa-solid fa-chart-column"></i>' },
                { path: '/explorer', label: '题材探索', icon: '<i class="fa-regular fa-compass"></i>' }
              ] },
              { title: '设置', items: [
                { path: '/settings', label: '偏好设置', icon: '<i class="fa-solid fa-gear"></i>' }
              ] }
            ]
          };
        },
        computed: {
          activeLabel() {
            const all = this.groups.flatMap(g => g.items);
            const hit = all.find(i => i.path === this.current);
            return hit ? hit.label : '—';
          }
        },
        methods: {
          onNav(path) {
            this.current = path;
            window.showToast('切换到「' + this.activeLabel + '」', 'info');
          },
          note(msg) { window.showToast(msg, 'success'); }
        }
      },
      {
        id: 'bottom-nav',
        tag: 'nux-bottom-nav',
        title: '底部导航',
        desc: '移动端（≤768px 视口）fixed 底栏，超出 bottomNavLimit 自动收纳，支持徽标与 aria-current',
        tpl: `
<div>
  <div class="pg-bottomnav-preview">
    <nux-bottom-nav :items="items" :current-key="current" @navigate="onNav"></nux-bottom-nav>
  </div>
  <p class="demo-note" style="margin-top: 12px">线上行为：仅 ≤768px 视口显示为 fixed 底栏（safe-area 已内置）。此处用预览样式平铺展示交互。</p>
</div>`,
        code: `<nux-bottom-nav :items="items" :current-key="current"
  :bottom-nav-limit="4" @navigate="onNav"></nux-bottom-nav>
// items: [{ key, label, icon(html), badge }]`,
        data() {
          return {
            current: 'home',
            items: [
              { key: 'home', label: '首页', icon: '🏠' },
              { key: 'works', label: '作品', icon: '📚' },
              { key: 'create', label: '创作', icon: '✍️' },
              { key: 'inbox', label: '消息', icon: '💬', badge: '3' },
              { key: 'me', label: '我的', icon: '👤' }
            ]
          };
        },
        mounted() {
          window.NexusUtils.injectStyle('pg-bottomnav-style',
            '.pg-bottomnav-preview .nux-bottom-nav{display:flex;position:static;border-radius:12px;overflow:hidden}');
        },
        methods: {
          onNav(key) {
            this.current = key;
            const hit = this.items.find(i => i.key === key);
            window.showToast('切换到「' + (hit ? hit.label : key) + '」', 'info');
          }
        }
      },
      {
        id: 'app-switcher',
        tag: 'nux-app-switcher',
        title: '应用切换器',
        desc: '页面左下角悬浮触发器（脚本加载即自动挂载），点开是多应用面板：搜索/分组/最近使用/回到门户。演示用 registryData 注入静态清单',
        tpl: `
<div>
  <p class="demo-note" style="margin: 0">触发器已挂在页面左下角（fixed，脚本加载即自动挂载）。点击打开面板体验搜索与分组。</p>
</div>`,
        code: `// 引入 js/components/nux-app-switcher.js 后自动挂载；数据可静态注入：
NuxAppSwitcher.configure({
  brandName: '松果氪',
  registryData: [{ name: 'prompt-genius', display_name: '提示词天才',
    description: '管理与优化提示词', url: '#', is_public: true, app_group: '效率工具' }]
});
NuxAppSwitcher.refresh();
// 也支持 window.nuxAppSwitcherConfig = { registryUrl: '/api/portal/apps' } 远程清单`,
        mounted() {
          if (!window.NuxAppSwitcher) return;
          NuxAppSwitcher.configure({
            brandName: '松果氪',
            brandTagline: '把想做的事，交给 AI',
            portalAction: '回到松果氪 · 全部应用',
            searchPlaceholder: '搜索应用与工具',
            registryData: [
              { name: 'prompt-genius', display_name: '提示词天才', description: '管理与优化 AI 提示词', url: '#', is_public: true, app_group: '效率工具' },
              { name: 'one-note', display_name: '拾光笔记', description: '多端同步的 markdown 笔记', url: '#', is_public: true, app_group: '效率工具' },
              { name: 'verse-craft', display_name: '造梦工坊', description: 'AI 辅助的长篇创作台', url: '#', is_public: true, app_group: '创作' },
              { name: 'golden-fish', display_name: '金鱼记账', description: '语音记账与账单分析', url: '#', is_public: true, app_group: '生活' },
              { name: 'travel-mate', display_name: '行伴', description: '一句话生成旅行路书', url: '#', is_public: true, app_group: '生活' },
              { name: 'resume-ai', display_name: '跃职', description: 'AI 简历优化与模拟面试', url: '#', is_public: true, app_group: '职场' }
            ]
          });
          NuxAppSwitcher.refresh().then(() => window.showToast('切换器已就绪，看左下角', 'info'));
        }
      },
      {
        id: 'layout-topnav',
        tag: 'nux-layout-topnav',
        title: '顶部导航布局',
        desc: '品牌 + 横向导航 + 头部操作插槽；窗口缩到 ≤768px 自动收进汉堡抽屉（useMobile 驱动）',
        tpl: `
<div class="pgls-scope" style="position: relative; height: 420px; border: 1px solid var(--nx-border); border-radius: 12px; overflow: hidden;">
  <nux-layout-topnav app-name="星光工作台" app-icon="🧭"
    :nav-items="navItems" :current-path="current" @navigate="onNav">
    <template #header-actions>
      <nux-button size="sm" variant="ghost" @click="note('新公告已发布')">发布公告</nux-button>
    </template>
    <div style="padding: 22px 26px">
      <p style="margin: 0 0 6px; font-weight: 600; font-size: 15px">当前栏目：{{ labelOf(current) }}</p>
      <p class="demo-note" style="margin: 0">这里是主内容区。窄屏下导航收进右上角汉堡按钮。</p>
    </div>
  </nux-layout-topnav>
</div>`,
        code: `<nux-layout-topnav app-name="工作台" app-icon="🧭"
  :nav-items="navItems" :current-path="current" @navigate="onNav">
  <template #header-actions>…</template>
  <main>内容</main>
</nux-layout-topnav>
// 依赖 js/composables/use-mobile.js（汉堡/抽屉联动）`,
        data() {
          return {
            current: '/home',
            navItems: [
              { path: '/home', label: '首页', icon: '🏠' },
              { path: '/works', label: '作品', icon: '📚' },
              { path: '/data', label: '数据', icon: '📊' },
              { path: '/team', label: '协作', icon: '🤝' }
            ]
          };
        },
        methods: {
          labelOf(path) {
            const hit = this.navItems.find(i => i.path === path);
            return hit ? hit.label : '—';
          },
          onNav(path) {
            this.current = path;
            window.showToast('切换到「' + this.labelOf(path) + '」', 'info');
          },
          note(msg) { window.showToast(msg, 'success'); }
        }
      },
      {
        id: 'section',
        tag: 'nux-section',
        title: '内容分区',
        desc: '标题 + 描述 + actions 插槽的标准分区壳，flat 模式去内边距便于嵌套',
        tpl: `
<div class="demo-col">
  <nux-section title="创作概览" description="最近 30 天的产出与节奏">
    <template #actions>
      <nux-button size="sm" variant="ghost" @click="note('数据已刷新')">刷新</nux-button>
    </template>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
      <nux-stat-card icon="📝" value="26" label="发布作品"></nux-stat-card>
      <nux-stat-card icon="💬" value="1,208" label="收到评论"></nux-stat-card>
      <nux-stat-card icon="⭐" value="96" label="收到收藏"></nux-stat-card>
    </div>
  </nux-section>
  <nux-section title="嵌套分区" description="flat 模式：无内边距，适合放进卡片或弹层">
    <p class="demo-note" style="margin:0">这里是 flat 分区的内容，留白由外层容器控制。</p>
  </nux-section>
</div>`,
        code: `<nux-section title="创作概览" description="最近 30 天的产出与节奏">
  <template #actions>
    <nux-button size="sm" @click="refresh">刷新</nux-button>
  </template>
  <any-content></any-content>
</nux-section>
<nux-section title="嵌套分区" flat>…</nux-section>`,
        methods: { note(msg) { window.showToast(msg, 'success'); } }
      },
      {
        id: 'side-panel',
        tag: 'nux-side-panel',
        title: '会话侧栏',
        desc: '品牌区 + 新建按钮 + tab + 可搜索列表 + 日期分组，桌面平铺、窄屏自动变抽屉',
        tpl: `
<div style="display:flex; height: 460px; border: 1px solid var(--nx-border); border-radius: 12px; overflow: hidden">
  <nux-side-panel layout="fill" brand-icon="✳️" brand-name="会话工作台"
    action-label="新建会话" :tabs="tabs" v-model:active-tab="tab"
    :items="items" :active-key="activeKey" :search-min="3" :group-by-date="true"
    @select="onPick" @action="onNew" @remove="onRemove" @brand="onBrand"></nux-side-panel>
  <div style="flex:1; display:flex; align-items:center; justify-content:center; padding: 16px; text-align:center">
    <div>
      <p class="demo-note" style="margin:0 0 4px">当前 tab：{{ tab }}（列表不打假数据过滤，仅演示切换）</p>
      <p style="margin:0; font-weight:600; font-size:15px">选中：{{ activeTitle() }}</p>
    </div>
  </div>
</div>`,
        code: `<nux-side-panel layout="fill" brand-icon="✳️" brand-name="工作台"
  action-label="新建会话" :tabs="tabs" v-model:active-tab="tab"
  :items="items" :active-key="activeKey" :group-by-date="true"
  @select="onPick" @action="onNew" @remove="onRemove"></nux-side-panel>
// items: [{ id, title, meta, icon, status, updated_at }]
// status: generating 显示进行中转圈，failed 显示失败角标`,
        data() {
          const pad = n => String(n).padStart(2, '0');
          const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00';
          const ago = h => { const d = new Date(); d.setHours(d.getHours() - h); return iso(d); };
          return {
            tab: 'all',
            activeKey: 's1',
            tabs: [
              { key: 'all', label: '全部' },
              { key: 'doc', label: '文档' },
              { key: 'chat', label: '会话' }
            ],
            items: [
              { id: 's1', title: '产品发布会开场稿', meta: '刚更新', icon: '📝', status: 'done', updated_at: ago(1) },
              { id: 's2', title: '用户访谈纪要整理', meta: '生成中', icon: '🎧', status: 'generating', updated_at: ago(3) },
              { id: 's3', title: '季度路标讨论', meta: '12 条消息', icon: '💬', status: 'done', updated_at: ago(26) },
              { id: 's4', title: '官网文案重写', meta: '生成失败', icon: '🖥️', status: 'failed', updated_at: ago(50) },
              { id: 's5', title: '新人上手指南', meta: '8 条消息', icon: '📘', status: 'done', updated_at: ago(96) }
            ]
          };
        },
        methods: {
          activeTitle() {
            const hit = this.items.find(i => i.id === this.activeKey);
            return hit ? hit.title : '（未选择）';
          },
          onPick(item) {
            this.activeKey = item.id;
            window.showToast('已打开「' + item.title + '」', 'info');
          },
          onNew() { window.showToast('新建会话（演示）', 'success'); },
          onRemove(item) {
            this.items = this.items.filter(i => i.id !== item.id);
            if (this.activeKey === item.id) this.activeKey = '';
            window.showToast('已删除「' + item.title + '」', 'success');
          },
          onBrand() { window.showToast('点击了品牌区（演示）', 'info'); }
        }
      },
      {
        id: 'settings-drawer',
        tag: 'nux-settings-drawer',
        title: '设置抽屉',
        desc: '左侧栏目导航 + 右侧自定义内容页，hash 路由 #/settings/xxx 可直达，Esc 关闭',
        tpl: `
<div>
  <nux-button @click="showSettings = true">打开设置抽屉</nux-button>
  <nux-settings-drawer v-model="showSettings" app-name="星光工作台" app-icon="🧭" title="偏好设置"
    :sections="sections" @navigate="onNav" @close="onClose">
    <template #page="{ key, section }">
      <div v-if="key === 'general'" class="demo-col">
        <nux-switch v-model="optNotify" label="桌面通知" description="重要事件第一时间提醒"></nux-switch>
        <nux-switch v-model="optAutosave" label="自动保存" description="编辑内容实时写入本地"></nux-switch>
      </div>
      <div v-else class="demo-col">
        <nux-radio-group v-model="density" :options="densities" label="界面密度"></nux-radio-group>
        <p class="demo-note" style="margin:0">当前栏目：{{ section.label }} —— 这是插槽自定义的页面内容。</p>
      </div>
    </template>
  </nux-settings-drawer>
</div>`,
        code: `<nux-settings-drawer v-model="open" app-name="工作台" title="偏好设置"
  :sections="[{ key:'general', icon:'⚙️', label:'通用', desc:'基础偏好' }]">
  <template #page="{ key, section }">
    <my-settings-page :name="key"></my-settings-page>
  </template>
</nux-settings-drawer>
// hash 路由：打开后写入 #/settings/general，可从任意页面直达指定栏目`,
        data() {
          return {
            showSettings: false,
            optNotify: true,
            optAutosave: true,
            density: 'cozy',
            densities: [
              { label: '宽松', value: 'cozy' },
              { label: '紧凑', value: 'compact' }
            ],
            sections: [
              { key: 'general', icon: '⚙️', label: '通用', desc: '通知与保存' },
              { key: 'appearance', icon: '🎨', label: '外观', desc: '密度与主题' }
            ]
          };
        },
        methods: {
          onNav(key) { window.showToast('切换到「' + key + '」栏目', 'info'); },
          onClose() { window.showToast('设置已关闭（即存即生效）', 'info'); }
        }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'site',
    name: '站点级',
    demos: [
      {
        id: 'login-page',
        tag: 'nux-login-page',
        title: '登录注册页',
        desc: '双栏布局（表单+品牌区）。加载顺序：nux-login-page-helpers.js → nux-login-page-template.js → nux-login-page.js；提交/验证码/第三方登录事件全部透传',
        tpl: `
<nux-login-page
  app-name="松果氪" app-icon="🌰"
  slogan="把想做的事，交给 AI"
  description="一个账号，畅用全部效率工具"
  :features="features"
  :show-register="true"
  :show-sms-login="true"
  :show-remember-me="true"
  :show-forgot="false"
  :third-party-login="thirds"
  :loading="loading"
  :error="error"
  @login="onLogin"
  @register="onRegister"
  @sms-login="onSmsLogin"
  @send-sms="onSendSms"
  @third-party-login="onThird">
</nux-login-page>`,
        code: `<nux-login-page app-name="松果氪" app-icon="🌰"
  slogan="把想做的事，交给 AI" :features="features"
  :show-sms-login="true" :loading="loading" :error="error"
  @login="onLogin" @send-sms="onSendSms"
  @third-party-login="onThird"></nux-login-page>
// 演示关闭了忘记密码（showForgot）：真实接入时由 SDK 动态加载 nux-forgot-password.js`,
        data() {
          return {
            loading: false,
            error: '',
            features: [
              { title: '极致体验', desc: '丝滑操作，零学习成本', icon: '⚡' },
              { title: '多端同步', desc: '进度实时云端备份', icon: '☁️' },
              { title: '安全可靠', desc: '令牌加密存储', icon: '🔒' }
            ],
            thirds: [
              { key: 'wechat', name: '微信', icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 5h16v11H8l-4 4z"/><circle cx="9" cy="10" r=".8"/><circle cx="15" cy="10" r=".8"/></svg>' },
              { key: 'phone', name: '手机一键', icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="7" y="3" width="10" height="18" rx="2"/><line x1="11" y1="18" x2="13" y2="18"/></svg>' }
            ]
          };
        },
        methods: {
          fakeRequest(done) {
            this.loading = true;
            setTimeout(() => { this.loading = false; done(); }, 900);
          },
          onLogin(payload) {
            this.fakeRequest(() => window.showToast('登录成功（演示）：' + payload.username, 'success'));
          },
          onRegister(payload) {
            this.fakeRequest(() => window.showToast('注册成功（演示）：' + payload.username, 'success'));
          },
          onSmsLogin(payload) {
            this.fakeRequest(() => window.showToast('验证码登录成功（演示）：' + payload.phone, 'success'));
          },
          onSendSms(payload) {
            window.showToast('验证码已发送至 ' + payload.phone + '（演示）', 'info');
          },
          onThird(key) {
            window.showToast('第三方登录：' + key + '（演示不跳转）', 'info');
          }
        }
      },
      {
        id: 'menu-user',
        tag: 'nux-menu-user',
        title: '用户中心菜单入口',
        desc: '顶栏用户入口：未登录渲染登录按钮并派发 uc:login-required；已登录按需懒加载 nux-avatar → nux-drawer → nux-user-center，加载期间显示骨架',
        tpl: `
<div style="display: flex; align-items: center; gap: 16px; border: 1px solid var(--nx-border); border-radius: 12px; padding: 8px 14px; min-height: 56px">
  <nux-menu-user app-name="松果氪" label="用户中心" @logout="onLogout"></nux-menu-user>
  <span class="demo-note" style="margin: 0">演示环境未接入用户中心 → 显示登录按钮；点击后 uc:login-required 事件在此转成 Toast。</span>
</div>`,
        code: `<nux-menu-user app-name="松果氪" label="用户中心"
  login-url="/login.html" @logout="onLogout"></nux-menu-user>
// 已登录时自动懒加载依赖链：nux-avatar / nux-drawer / nux-user-center / nexus-overlay-host`,
        mounted() {
          this._onLoginRequired = (e) => window.showToast('uc:login-required 已派发（演示不跳转）', 'info');
          window.addEventListener('uc:login-required', this._onLoginRequired);
        },
        beforeUnmount() {
          window.removeEventListener('uc:login-required', this._onLoginRequired);
        },
        methods: {
          onLogout() { window.showToast('已退出登录（演示）', 'info'); }
        }
      },
      {
        id: 'menu-about',
        tag: 'nux-menu-about',
        title: '关于入口',
        desc: '顶栏「关于」入口，两种形态：纯图标 / 图标+文字。自动按脚本路径拼出 about.html 链接并携带 ?app= 前缀',
        tpl: `
<div style="display: flex; align-items: center; gap: 16px; border: 1px solid var(--nx-border); border-radius: 12px; padding: 8px 14px; min-height: 56px">
  <nux-menu-about label="关于"></nux-menu-about>
  <nux-menu-about></nux-menu-about>
  <span class="demo-note" style="margin: 0">第一个带 label，第二个纯图标。点击跳转 /nexus-ui/about.html（本页顶栏也有一个真实入口）。</span>
</div>`,
        code: `<nux-menu-about label="关于"></nux-menu-about>
<nux-menu-about></nux-menu-about>`,
        data() { return {}; }
      },
      {
        id: 'footer-demo',
        tag: 'nux-footer',
        title: '站点页脚',
        desc: '备案号/免责声明/AI 标识/协议链接一行收口，支持 app-name 品牌前缀与公网安备',
        tpl: `
<div style="border: 1px solid var(--nx-border); border-radius: 12px; overflow: hidden">
  <div style="padding: 24px; color: var(--nx-text-muted); text-align: center; font-size: 12px">↑ 页面内容区占位 ↓</div>
  <nux-footer app-name="松果氪" :show-ai-badge="true"></nux-footer>
</div>`,
        code: `<nux-footer app-name="松果氪" :show-ai-badge="true"></nux-footer>
<nux-footer :show-gongan="true" gongan-number="33010802012345"></nux-footer>`,
        data() { return {}; }
      },
      {
        id: 'portal-combo',
        tag: 'nux-app-card / nux-pagination / nux-portal-footer',
        title: '门户组合页',
        desc: '应用卡片（收藏/徽标/主题色）+ 极简分页 + 门户页脚，一个页面串起门户站的三个标准件',
        tpl: `
<div class="demo-col">
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px">
    <nux-app-card v-for="a in apps" :key="a.name"
      :app="a" :accent="a.accent" :badge="a.badge"
      :show-fav="true" :faved="!!favs[a.name]"
      @fav="toggleFav(a)" @open="onOpen(a)"></nux-app-card>
  </div>
  <div style="display: flex; justify-content: center; margin-top: 16px">
    <nux-pagination :page="page" :total-pages="4" @prev="page--" @next="page++"></nux-pagination>
  </div>
  <nux-portal-footer name="松果氪" slogan="把想做的事，交给 AI"></nux-portal-footer>
</div>`,
        code: `<nux-app-card :app="app" accent="#0ea5e9" :badge="{label:'新上线'}"
  :show-fav="true" :faved="faved" @fav="toggleFav" @open="open"></nux-app-card>
<nux-pagination :page="page" :total-pages="4" @prev="page--" @next="page++"></nux-pagination>
<nux-portal-footer name="松果氪" slogan="把想做的事，交给 AI"></nux-portal-footer>`,
        data() {
          return {
            page: 2,
            favs: { 'travel-mate': true },
            apps: [
              { name: 'travel-mate', display_name: '行伴', description: '一句话生成旅行路书', url: '', accent: '#0ea5e9', badge: { label: '新上线', icon: 'fa-solid fa-bolt' } },
              { name: 'golden-fish', display_name: '金鱼记账', description: '语音记账与账单分析', url: '', accent: '#f59e0b' },
              { name: 'verse-craft', display_name: '造梦工坊', description: 'AI 辅助的长篇创作台', url: '', accent: '#8b5cf6' },
              { name: 'resume-ai', display_name: '跃职', description: 'AI 简历优化与模拟面试', url: '', accent: '#6366f1' }
            ]
          };
        },
        methods: {
          toggleFav(a) {
            this.favs[a.name] = !this.favs[a.name];
            window.showToast(this.favs[a.name] ? '已收藏「' + a.display_name + '」' : '已取消收藏', 'success');
          },
          onOpen(a) { window.showToast('打开「' + a.display_name + '」（演示不跳转）', 'info'); }
        }
      },
      {
        id: 'about-page',
        tag: 'nux-about-page',
        title: '关于页',
        desc: '整页组件（100dvh）：品牌 hero + 故事 / 能力 / 承诺 / 生态分区；此处 420px 容器缩览，生态接口失败自动回退内置数据',
        tpl: `
<div style="position: relative; height: 420px; border: 1px solid var(--nx-border); border-radius: 12px; overflow: hidden">
  <nux-about-page app-name="拾光笔记" app-icon="📒"
    slogan="记录，是最温柔的自我对话"
    description="多端同步的轻量笔记应用"
    :story="story" :features="features" :promises="promises"
    :ecosystem="ecos" version="v2.3.0"
    back-url="#" contact-email="feedback@example.com"></nux-about-page>
</div>
<p class="demo-note" style="margin-top: 10px">整页组件实际占满 100dvh，这里限制容器高度做缩览，页面内可滚动。</p>`,
        code: `<nux-about-page app-name="拾光笔记" app-icon="📒"
  slogan="记录，是最温柔的自我对话"
  :story="story" :features="features" :promises="promises"
  :ecosystem="ecos" version="v2.3.0"></nux-about-page>
// mounted 会请求 /api/portal/apps 拉取生态；失败或非 200 时回退 ecosystem 内置数据`,
        data() {
          return {
            story: [
              '最开始只是为了给自己记点东西，后来发现身边的朋友也想要一个干净不吵的笔记工具，于是有了它。',
              '我们相信记录应该像呼吸一样自然：打开就能写，写完就走，其余的交给同步。'
            ],
            features: [
              { title: '极速记录', desc: '三秒内进入编辑状态，灵感不用等', icon: 'fas fa-bolt' },
              { title: '多端同步', desc: '手机、平板、电脑无缝衔接', icon: 'fas fa-cloud' },
              { title: '全文检索', desc: '忘记标题也能一秒找回', icon: 'fas fa-magnifying-glass' }
            ],
            promises: [
              { title: '无广告', desc: '永不在内容里插入任何推广', icon: 'fas fa-ban' },
              { title: '可导出', desc: '数据随时带走，不做绑架', icon: 'fas fa-file-export' },
              { title: '本地加密', desc: '敏感内容端侧加密存储', icon: 'fas fa-lock' }
            ],
            ecos: [
              { name: '时光手账', desc: '日记手账', color: '#0ea5e9' },
              { name: '简白板', desc: '思维白板', color: '#8b5cf6' },
              { name: '轻日历', desc: '日程管理', color: '#f59e0b' }
            ]
          };
        }
      },
      {
        id: 'onboarding',
        tag: 'nux-onboarding',
        title: '新手引导蒙层',
        desc: 'doneKey 未写入 localStorage 时挂载即弹出；分步前进、可跳过，完成后不再打扰',
        tpl: `
<div class="demo-col">
  <nux-button @click="replay">清除记忆并重播引导</nux-button>
  <p class="demo-note" style="margin:0">真实场景：doneKey 不存在时组件挂载即自动弹出；本页为避免打扰改为手动触发。</p>
  <nux-onboarding v-if="showGuide" done-key="pg_onboarding_demo"
    :steps="steps" @done="onDone" @skip="onSkip"></nux-onboarding>
</div>`,
        code: `<nux-onboarding done-key="my_app_onboarding" :steps="steps"
  @done="onDone" @skip="onSkip"></nux-onboarding>
// steps: [{ title, desc, icon }]，icon 为 FontAwesome 类名
// 重新触发：localStorage.removeItem(doneKey) 后重新挂载组件`,
        data() {
          return {
            showGuide: false,
            steps: [
              { title: '欢迎来到工作台', desc: '接下来用三步完成初始化，全程不到一分钟。', icon: 'fas fa-rocket', step: 0 },
              { title: '创建第一个作品', desc: '从空白画布或模板开始，模板可以随时更换。', icon: 'fas fa-pen-nib', step: 1 },
              { title: '邀请协作者', desc: '把链接发给伙伴，实时协作从这里开始。', icon: 'fas fa-user-plus', step: 2 }
            ]
          };
        },
        methods: {
          replay() {
            try { window.localStorage.removeItem('pg_onboarding_demo'); } catch (e) {}
            this.showGuide = false;
            this.$nextTick(() => { this.showGuide = true; });
          },
          onDone() { window.showToast('引导完成，开始使用吧', 'success'); },
          onSkip() { window.showToast('已跳过引导（doneKey 已写入，不再弹出）', 'info'); }
        }
      },
      {
        id: 'onboarding-strip',
        tag: 'nux-onboarding-strip',
        title: '引导横幅条',
        desc: '按 done 数组依次展示未完成步骤，完成一条自动切下一条；✕ 暂时忽略',
        tpl: `
<div class="demo-col">
  <nux-onboarding-strip :steps="steps" :done="done"
    dismiss-key="pg_ob_strip_dismiss" @action="onAction" @dismiss="onDismiss"></nux-onboarding-strip>
  <p class="demo-note" style="margin:0">点击「去完成」推进步骤，全部完成后横幅自动消失。</p>
</div>`,
        code: `<nux-onboarding-strip :steps="steps" :done="doneSteps"
  dismiss-key="ob_strip" @action="onAction" @dismiss="onDismiss"></nux-onboarding-strip>
// steps: [{ key, title, desc, icon, btn }]；done 为已完成的 key 数组`,
        data() {
          return {
            done: [],
            steps: [
              { key: 'profile', icon: '🧑', title: '完善个人资料', desc: '上传头像并填写昵称，让伙伴认识你', btn: '去完善' },
              { key: 'first-work', icon: '✍️', title: '创建第一个作品', desc: '从模板开始，两分钟出稿', btn: '去创建' },
              { key: 'invite', icon: '🤝', title: '邀请一位协作者', desc: '把邀请链接发给伙伴即可', btn: '去邀请' }
            ]
          };
        },
        methods: {
          onAction(step) {
            if (this.done.indexOf(step.key) < 0) this.done.push(step.key);
            const tail = this.done.length < this.steps.length ? '，看下一条' : '，全部搞定';
            window.showToast('已完成「' + step.title + '」' + tail, 'success');
          },
          onDismiss() { window.showToast('已暂时忽略，刷新页面可恢复', 'info'); }
        }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'notify',
    name: '通知中心',
    demos: [
      {
        id: 'bell-panel',
        tag: 'nux-notification-bell / NuxNotificationPanel',
        title: '通知铃铛 + 面板',
        desc: '铃铛是 Vue 组件（未登录空态/红点/全部已读）；面板是命令式类 new NuxNotificationPanel().mount(el)，需 notifyCenter 接口，未接入时显示真实错误态',
        tpl: `
<div class="demo-col">
  <div style="display: flex; align-items: center; gap: 16px; border: 1px solid var(--nx-border); border-radius: 12px; padding: 10px 14px">
    <span class="demo-note" style="margin: 0">顶栏铃铛（未登录 → 空态，不轮询）：</span>
    <nux-notification-bell base-url="/notifycenter" title="消息中心"></nux-notification-bell>
  </div>
  <div>
    <p class="demo-note" style="margin: 0 0 6px">命令式面板（演示环境无接口 → 展示加载失败态）：</p>
    <div ref="panelHost" style="border: 1px solid var(--nx-border); border-radius: 12px; max-width: 380px; overflow: hidden"></div>
  </div>
</div>`,
        code: `// 铃铛（Vue 组件，登录后自动轮询未读数）
<nux-notification-bell base-url="/notifycenter" title="消息中心"></nux-notification-bell>

// 面板（命令式，任意容器一挂就用）
const panel = new NuxNotificationPanel({ baseUrl: '/api/notify' });
panel.mount(document.querySelector('#panel-host'));`,
        mounted() {
          this._panel = new NuxNotificationPanel({ baseUrl: '/notifycenter' });
          this._panel.mount(this.$refs.panelHost);
        },
        beforeUnmount() { this._panel = null; }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'ai-widgets',
    name: 'AI 消息内组件',
    demos: [
      {
        id: 'widgets',
        tag: 'nux-ai-widgets (+rich)',
        title: 'Widget 类型矩阵',
        desc: '后端 SSE widget 事件驱动的消息内组件：基础 6 类 table/cards/steps/related/choice/feedback，rich 追加 form/chart/confirm；交互统一经 @action 透传',
        tpl: `
<div class="demo-col">
  <nux-ai-widgets :widgets="widgets" @action="onAction"></nux-ai-widgets>
  <p class="demo-note" style="margin: 4px 0 0">最近一次交互：{{ lastAction || '（点击上方组件试试）' }}</p>
</div>`,
        code: `// nux-ai-chat 收到 SSE {type:'widget'} 后自动路由到 msg.widgets 并渲染
<nux-ai-widgets :widgets="msg.widgets" @action="onAction"></nux-ai-widgets>

widgets: [
  { id: 't1', type: 'table', title: '近 7 天记录',
    data: { columns: ['日期','金额'], rows: [['06/24','¥42']], summary: { '合计': '¥296' } } },
  { id: 'c1', type: 'choice', data: { message: '选一个方向', options: [{label:'续写', recommended:true}] } },
  { id: 'f1', type: 'form', data: { fields: [{key:'title', label:'标题', required:true}] } }
]
// rich 扩展（nux-ai-widgets-rich.js）：form / chart(echarts 按需加载) / confirm`,
        data() {
          return {
            lastAction: '',
            widgets: [
              { id: 'w-table', type: 'table', title: '近 3 天支出',
                data: { columns: ['日期', '类别', '金额'], rows: [['06/24', '餐饮', '¥42.0'], ['06/25', '交通', '¥8.5'], ['06/26', '订阅', '¥18.0']], summary: { '合计': '¥68.5', '环比': '-12%' } } },
              { id: 'w-cards', type: 'cards', title: '为你整理了 3 个灵感',
                data: { cards: [
                  { title: '周更连载挑战', desc: '以「时间旅行」为主题连续 7 天更新', meta: '热度 2.1k' },
                  { title: '人设互换', desc: '让主角和反派交换身体 24 小时', meta: '热度 1.4k' },
                  { title: '多视角叙事', desc: '同一事件从三个角色视角重写', meta: '热度 986' }
                ] } },
              { id: 'w-steps', type: 'steps', title: '生成《星轨旅记》第三章',
                data: { status: 'running', percent: 62, steps: [
                  { title: '梳理前情', status: 'done' },
                  { title: '生成草稿', status: 'active', desc: '正在写第二场戏…' },
                  { title: '风格校对', status: 'pending' }
                ] } },
              { id: 'w-related', type: 'related', title: '相关话题',
                data: { items: ['时间旅行的代价', '星轨世界观', '配角群像'] } },
              { id: 'w-choice', type: 'choice', title: '剧情走向',
                data: { message: '第三章结尾主角该做什么决定？', options: [
                  { label: '登上传送船', description: '推进主线，进入星港篇', recommended: true },
                  { label: '留在基地', description: '先补完支线人物' }
                ] } },
              { id: 'w-feedback', type: 'feedback', title: '回答反馈', data: { message: '这章的节奏可以吗？' } },
              { id: 'w-form', type: 'form', title: '发布前收集',
                data: { message: '补全作品信息后即可发布', submit_text: '确认发布', allow_cancel: true,
                  fields: [
                    { key: 'category', label: '分类', type: 'select', required: true, options: [{ label: '科幻', value: 'scifi' }, { label: '都市', value: 'urban' }] },
                    { key: 'summary', label: '一句话简介', type: 'textarea', required: true, placeholder: '50 字以内' },
                    { key: 'comment', label: '允许评论', type: 'switch', default: true }
                  ] } },
              { id: 'w-chart', type: 'chart', title: '本周写作字数',
                data: { chart: 'bar', categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                  series: [{ name: '字数', data: [820, 1240, 960, 1580, 2100, 1750, 2320] }] } },
              { id: 'w-confirm', type: 'confirm', title: '危险操作',
                data: { message: '确认删除《星轨旅记》第三章草稿？', detail: '删除后 7 天内可在回收站恢复',
                  items: ['字数：4,218', '最后编辑：10 分钟前'], warning: '此操作会通知所有协作成员', confirm_text: '确认删除' } }
            ]
          };
        },
        methods: {
          onAction(a) {
            this.lastAction = '#' + a.id + ' · ' + a.type + ' · ' + a.action + (a.payload !== undefined && a.payload !== null ? ' · ' + JSON.stringify(a.payload) : '');
          }
        }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'global-controls',
    name: '全局控件',
    demos: [
      {
        id: 'theme-toggle',
        tag: 'nux-theme-toggle',
        title: '主题切换',
        desc: '明暗两态圆形按钮，持久化 localStorage nx-theme，未选择时跟随系统；移动端 44px 命中区',
        tpl: `
<div class="demo-row" style="align-items:center;gap:12px;">
  <nux-theme-toggle @change="d = $event"></nux-theme-toggle>
  <span style="font-size:13px;color:var(--nx-text-secondary,#6b7280);">当前：{{ d ? '深色' : '浅色' }}</span>
</div>
`,
        data() { return { d: document.documentElement.getAttribute('data-theme') === 'dark' }; }
      }
    ]
  });
})();
