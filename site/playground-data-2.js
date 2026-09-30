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
