(function() {
  const cats = window.PG_CATS || [];
  const byId = {};
  cats.forEach(c => { byId[c.id] = c; });

  function push(catId, demo) {
    const cat = byId[catId];
    if (!cat) { console.error('playground-data-4: 分类不存在', catId); return; }
    cat.demos.push(demo);
  }

  push('forms', {
    id: 'form-group',
    tag: 'nux-form-group',
    title: '表单字段容器',
    desc: '标签/必填星标/提示与错误三态统一，横向布局一行收口；错误态自动标红字段',
    tpl: `
<div class="demo-col" style="max-width: 460px">
  <nux-form-group label="作品名" required hint="读者将在书架看到这个名字">
    <nux-input v-model="name" placeholder="如：星轨旅记"></nux-input>
  </nux-form-group>
  <nux-form-group label="简介" error="简介不能超过 100 字，当前已超出">
    <nux-textarea v-model="intro" :rows="2"></nux-textarea>
  </nux-form-group>
  <nux-form-group label="城市" hint="横向布局，标签与控件同行" :horizontal="true">
    <nux-select v-model="city" :options="[{label:'上海',value:'sh'},{label:'杭州',value:'hz'}]"></nux-select>
  </nux-form-group>
</div>`,
    code: `<nux-form-group label="作品名" required hint="提示文字">
  <nux-input v-model="name"></nux-input>
</nux-form-group>
<nux-form-group label="简介" error="错误文案" :horizontal="true">
  <nux-textarea v-model="intro"></nux-textarea>
</nux-form-group>`,
    data() { return { name: '', intro: '', city: 'sh' }; }
  });

  push('controls', {
    id: 'sortable',
    tag: 'nux-sortable',
    title: '拖拽排序',
    desc: 'Pointer Events 统一鼠标/触摸拖拽，手柄也可用键盘方向键/Home/End 排序',
    tpl: `
<div>
  <div style="max-width: 360px">
    <nux-sortable v-model="list" item-key="id" @change="onChange" @sort-end="onEnd">
      <template #default="{ item }">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--nx-border);border-radius:10px;background:var(--nx-bg-surface);font-size:14px">
          <span style="font-size:12px;color:var(--nx-text-muted);width:18px;text-align:center">{{ item.id }}</span>
          <span>{{ item.title }}</span>
        </div>
      </template>
    </nux-sortable>
  </div>
  <p class="demo-note">当前顺序：{{ list.map(i => i.title).join(' → ') }}</p>
</div>`,
    code: `<nux-sortable v-model="list" item-key="id" @change="onSave">
  <template #default="{ item }"><div>{{ item.title }}</div></template>
</nux-sortable>
// 键盘：聚焦手柄后方向键移动，Home/End 移到头`,
    data() {
      return {
        list: [
          { id: 1, title: '梳理大纲' },
          { id: 2, title: '汇总素材' },
          { id: 3, title: '成文渲染' }
        ]
      };
    },
    methods: {
      onChange(next, info) {
        window.showToast('已从第 ' + (info.from + 1) + ' 项移到第 ' + (info.to + 1) + ' 项', 'success');
      },
      onEnd() { window.showToast('顺序已保存（演示存于内存）', 'info'); }
    }
  });

  push('controls', {
    id: 'infinite-scroll',
    tag: 'nux-infinite-scroll',
    title: '无限滚动',
    desc: 'IntersectionObserver 哨兵触发，自动识别最近的可滚动容器；加载三页后 finished 收口',
    tpl: `
<div style="max-height: 280px; overflow-y: auto; border: 1px solid var(--nx-border); border-radius: 12px; padding: 4px 14px" class="nis-demo-box">
  <nux-infinite-scroll :loading="loading" :finished="finished" :offset="80" @load="loadMore">
    <div v-for="i in items" :key="i" style="padding:10px 2px;border-bottom:1px dashed var(--nx-border);font-size:14px">第 {{ i }} 条记录</div>
  </nux-infinite-scroll>
</div>
<p class="demo-note">在上方容器里滚到底，自动加载下一页；共 3 页。</p>`,
    code: `<nux-infinite-scroll :loading="loading" :finished="finished"
  :offset="200" finished-text="没有更多了" @load="loadMore">列表内容</nux-infinite-scroll>`,
    data() { return { items: 8, loading: false, finished: false }; },
    methods: {
      loadMore() {
        if (this.loading || this.finished) return;
        this.loading = true;
        setTimeout(() => {
          this.items += 6;
          this.loading = false;
          if (this.items >= 26) this.finished = true;
        }, 600);
      }
    }
  });

  push('feedback', {
    id: 'error-state',
    tag: 'nux-error-state',
    title: '错误状态',
    desc: '加载失败的统一话术与重试出口，role=alert 读屏可感知；code 展示技术细节',
    tpl: `
<div class="demo-col" style="max-width: 520px">
  <nux-error-state icon="📡" title="网络开小差了" message="请求超时，请检查网络后重试"
    code="ERR_TIMEOUT · 504" @retry="onRetry"></nux-error-state>
  <nux-error-state icon="🔒" title="没有访问权限" message="这条内容仅对管理员可见" :retry-text="''"></nux-error-state>
</div>`,
    code: `<nux-error-state icon="📡" title="网络开小差了"
  message="请求超时，请检查网络后重试" code="ERR_TIMEOUT · 504"
  @retry="reload"></nux-error-state>`,
    methods: { onRetry() { window.showToast('已发起重试（演示）', 'info'); } }
  });

  push('feedback', {
    id: 'undo-toast',
    tag: 'nux-undo-toast',
    title: '可撤销操作',
    desc: '删除类操作的后悔药：toast 内直接撤销，超时自动消失并落定',
    tpl: `
<div style="position: relative; min-height: 132px">
  <div class="demo-row">
    <span v-for="t in topics" :key="t" class="nux-tag">{{ t }}</span>
    <nux-button size="sm" variant="danger" @click="removeLast" :disabled="!topics.length">删除最后一个</nux-button>
  </div>
  <nux-undo-toast :text="undoText" :duration="5000" @undo="onUndo" @dismiss="onDismiss"
    style="position:absolute;left:0;right:0;bottom:0"></nux-undo-toast>
</div>`,
    code: `<nux-undo-toast :text="undoText" :duration="6000"
  @undo="restore" @dismiss="finalize"></nux-undo-toast>
// text 置非空即弹出并开始计时；undo 恢复，dismiss 为超时落定`,
    data() { return { topics: ['旅行随笔', '深夜食堂', '城市夜航'], last: '', undoText: '' }; },
    methods: {
      removeLast() {
        this.last = this.topics[this.topics.length - 1];
        this.topics = this.topics.slice(0, -1);
        this.undoText = '';
        requestAnimationFrame(() => { this.undoText = '已删除「' + this.last + '」'; });
      },
      onUndo() {
        this.topics = [...this.topics, this.last];
        this.undoText = '';
        window.showToast('已撤销删除', 'success');
      },
      onDismiss() { window.showToast('删除已落定', 'info'); }
    }
  });

  push('data', {
    id: 'selection-bar',
    tag: 'nux-selection-bar',
    title: '批量选择条',
    desc: '列表进入多选态时底部浮出的操作条，计数 + 自定义动作 + 取消',
    tpl: `
<div style="position: relative; max-width: 420px">
  <div class="demo-col" style="max-width: none">
    <label v-for="f in files" :key="f" class="demo-row" style="gap:8px;cursor:pointer;font-size:14px">
      <input type="checkbox" :value="f" v-model="picked"> {{ f }}
    </label>
  </div>
  <nux-selection-bar :count="picked.length" @clear="picked = []"
    style="position:absolute;left:0;right:0;bottom:-8px">
    <nux-button size="sm" variant="ghost" @click="download">下载</nux-button>
  </nux-selection-bar>
</div>`,
    code: `<nux-selection-bar :count="picked.length" @clear="picked = []">
  <nux-button size="sm" @click="download">下载</nux-button>
</nux-selection-bar>
// count>0 才浮出，countLabel 默认「已选 {n} 项」`,
    data() { return { files: ['周报-0929.docx', '海报终稿.png', '素材包.zip', '访谈记录.md'], picked: [] }; },
    methods: {
      download() { window.showToast('已加入下载队列 ' + this.picked.length + ' 个文件', 'success'); }
    }
  });

  push('data', {
    id: 'checkin',
    tag: 'nux-checkin',
    title: '打卡卡片',
    desc: '连胜里程碑 + 今日任务 + 打卡日历 + 补签/冻结，习惯闭环一站式',
    tpl: `
<div style="max-width: 420px">
  <nux-checkin title="每日写作" icon="✍️" :streak="streak" :checked-in="checkedIn"
    :completed-days="46" :total-days="60" :start-date="start"
    :records="records" :missed-dates="missed" :mend-left="1" :freeze-left="1"
    @checkin="onCheckin" @mend="note('已消耗 1 次补签卡')" @freeze="note('已冻结今日目标')"
    @open-day="note"></nux-checkin>
</div>`,
    code: `<nux-checkin title="每日写作" icon="✍️"
  :streak="12" :checked-in="false" :records="records"
  :start-date="start" :total-days="60" :missed-dates="missed"
  :mend-left="1" :freeze-left="1"
  @checkin="onCheckin" @mend="onMend"></nux-checkin>
// records 元素: { date: 'YYYY-MM-DD', status: 'checked'|'frozen'|'mended' }`,
    data() {
      const pad = n => String(n).padStart(2, '0');
      const key = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      const start = new Date(); start.setDate(start.getDate() - 44);
      const records = [];
      const missed = [];
      for (let i = 0; i < 44; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        const k = key(d);
        if (i === 12) { records.push({ date: k, status: 'mended' }); continue; }
        if (i === 30) { records.push({ date: k, status: 'frozen' }); continue; }
        if (i === 40 || i === 41) { missed.push(k); continue; }
        records.push({ date: k, status: 'checked' });
      }
      return { streak: 8, checkedIn: false, start: key(start), records, missed };
    },
    methods: {
      onCheckin() {
        this.checkedIn = true;
        this.streak += 1;
        const pad = n => String(n).padStart(2, '0');
        const d = new Date();
        this.records.push({ date: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()), status: 'checked' });
        window.showToast('连续 ' + this.streak + ' 天，火苗更旺了 🔥', 'success');
      },
      note(msg) { window.showToast(msg, 'info'); }
    }
  });

  push('data', {
    id: 'conversation-list',
    tag: 'nux-conversation-list',
    title: '会话列表',
    desc: '搜索 + 新建 + 归档 + 删除一条龙；演示用内存 api 模拟接口，删除走真实 nuxConfirm',
    tpl: `
<div style="display:flex; gap:14px; align-items:flex-start; flex-wrap:wrap">
  <div style="width: 280px; border:1px solid var(--nx-border); border-radius: 12px; overflow:hidden">
    <nux-conversation-list :api="mockApi" :active-id="activeId" conversation-url="/demo/conversations"
      @select="onSelect" @created="c => activeId = c.id"></nux-conversation-list>
  </div>
  <p class="demo-note" style="max-width:180px">当前选中：{{ activeId || '（无）' }}。试试搜索、新建、归档与删除。</p>
</div>`,
    code: `<nux-conversation-list :api="api" :active-id="activeId"
  conversation-url="/api/chat/conversations"
  @select="onSelect" @created="onCreated"></nux-conversation-list>
// 不传 api 时自动用 window.NexusApi；列表/搜索/新建/删除即开即用`,
    data() {
      const now = Date.now();
      const iso = minAgo => new Date(now - minAgo * 60000).toISOString();
      let seq = 6;
      const convs = [
        { id: 'c1', title: '周报怎么写出重点', updated_at: iso(5), status: 'active' },
        { id: 'c2', title: '把访谈整理成要点', updated_at: iso(60 * 26), status: 'active' },
        { id: 'c3', title: '九月支出分析', updated_at: iso(60 * 50), status: 'active' },
        { id: 'c4', title: '旧版迁移清单', updated_at: iso(60 * 24 * 9), status: 'archived' },
        { id: 'c5', title: '起十个备选书名', updated_at: iso(60 * 24 * 20), status: 'active' }
      ];
      const find = id => convs.find(c => c.id === id);
      return {
        activeId: 'c1',
        mockApi: {
          get(url, params) {
            if (url.endsWith('/search')) {
              const q = (params.q || '').trim();
              return Promise.resolve({ data: { list: convs.filter(c => c.title.includes(q)) } });
            }
            return Promise.resolve({ data: { list: convs.filter(c => c.status !== 'archived' || params.with_archived), total: convs.length } });
          },
          post(url, body) {
            if (url.endsWith('/archive') || url.endsWith('/restore')) {
              const id = url.split('/')[3];
              const c = find(id);
              if (c) c.status = url.endsWith('/archive') ? 'archived' : 'active';
              return Promise.resolve({ data: { ...c } });
            }
            const c = { id: 'c' + (seq++), title: (body && body.title) || '新对话', updated_at: new Date().toISOString(), status: 'active' };
            convs.unshift(c);
            return Promise.resolve({ data: { ...c } });
          },
          delete(url) {
            const id = url.split('/').pop();
            const i = convs.findIndex(c => c.id === id);
            if (i > -1) convs.splice(i, 1);
            return Promise.resolve({ code: 200 });
          }
        }
      };
    },
    methods: {
      onSelect(c) { this.activeId = c.id; }
    }
  });

  push('data', {
    id: 'poster',
    tag: 'nux-poster',
    title: '分享海报',
    desc: 'blueprint 驱动的画布渲染：渐变底 + 纹样 + 光斑，元素按 1080 设计稿百分比定位，高分屏自适应',
    tpl: `
<div class="demo-row" style="align-items:flex-start;gap:24px">
  <nux-poster :blueprint="bp" :max-width="280"></nux-poster>
  <p class="demo-note" style="max-width:200px">同一份 blueprint 也经 PosterRender 引擎离屏截图导出 PNG，业务里用于生成分享图。</p>
</div>`,
    code: `<nux-poster :blueprint="bp" :max-width="320"></nux-poster>
// canvas 1080 设计稿；elements 按 x/y 百分比定位，style 数值自动缩放
// 离屏导出：PosterRender.download(bp, 'poster.png')`,
    data() {
      return {
        bp: {
          canvas: { width: 1080, height: 720 },
          background: {
            type: 'grad', from: '#0f1b2d', to: '#1e3a5f', direction: '160deg',
            pattern: 'dots',
            glow: [
              { color: '#38bdf8', x: 24, y: 22, size: 46, opacity: 0.4 },
              { color: '#a855f7', x: 82, y: 78, size: 52, opacity: 0.32 }
            ]
          },
          elements: [
            { element_type: 'text', content: '星轨旅记', position: { x: 8, y: 22 }, style: { fontSize: 88, fontWeight: 700, color: '#ffffff', letterSpacing: 6 } },
            { element_type: 'text', content: '把每一段路，写成可以回访的星图', position: { x: 8.2, y: 42 }, style: { fontSize: 30, color: 'rgba(255,255,255,.78)' } },
            { element_type: 'text', content: 'NEXUS UI · 组件演示', position: { x: 8.2, y: 82 }, style: { fontSize: 24, color: 'rgba(255,255,255,.55)', letterSpacing: 3 } }
          ]
        }
      };
    }
  });

  push('layouts', {
    id: 'layout-topnav',
    tag: 'nux-layout-topnav',
    title: '顶部导航布局',
    desc: '品牌位 + 顶栏导航 + 头部操作插槽；≤768px 自动收成汉堡抽屉（useMobile 驱动）',
    tpl: `
<div class="pgls-scope" style="position: relative; height: 400px; border: 1px solid var(--nx-border); border-radius: 12px; overflow: hidden;">
  <nux-layout-topnav app-name="松果氪" app-icon="🌰" header-height="52px"
    :nav-items="nav" :current-path="current" @navigate="onNav">
    <template #header-actions>
      <nux-button size="sm" variant="ghost" @click="note('新建')">＋ 新建</nux-button>
    </template>
    <div style="padding: 20px 24px">
      <p style="margin: 0 0 6px; font-weight: 600; font-size: 15px">当前栏目：{{ current }}</p>
      <p class="demo-note" style="margin: 0">顶栏布局适合栏目少的工具型应用。窄屏下右上角出现汉堡按钮。</p>
    </div>
  </nux-layout-topnav>
</div>`,
    code: `<nux-layout-topnav app-name="松果氪" app-icon="🌰"
  :nav-items="nav" :current-path="current" @navigate="go">
  <template #header-actions>…</template>
  <main>内容</main>
</nux-layout-topnav>
// 依赖 js/composables/use-mobile.js`,
    data() {
      return {
        current: '/home',
        nav: [
          { path: '/home', label: '总览', icon: '<i class="fa-solid fa-chart-column"></i>' },
          { path: '/works', label: '作品库', icon: '<i class="fa-regular fa-file-lines"></i>' },
          { path: '/data', label: '数据', icon: '<i class="fa-solid fa-chart-pie"></i>' },
          { path: '/settings', label: '设置', icon: '<i class="fa-solid fa-gear"></i>' }
        ]
      };
    },
    methods: {
      onNav(p) { this.current = p; },
      note(msg) { window.showToast(msg + '（演示）', 'info'); }
    }
  });

  push('layouts', {
    id: 'side-panel',
    tag: 'nux-side-panel',
    title: '会话侧栏',
    desc: 'AI 应用的侧栏外壳：品牌/新建动作/分组列表/个性化区，窄屏自动变抽屉并锁定滚动',
    tpl: `
<div style="display:flex; height: 400px; border:1px solid var(--nx-border); border-radius: 12px; overflow:hidden; max-width: 520px">
  <nux-side-panel brand-icon="🌰" brand-name="松果氪" action-label="新对话"
    layout="fill"
    :tabs="tabs" :items="items" active-key="c1"
    :personal-items="personal" user-name="林一"
    @select="onSelect" @remove="onRemove" @action="note('新建对话')" @personal="onPersonal">
    <div style="flex:1;padding:18px;display:flex;align-items:center;justify-content:center;color:var(--nx-text-muted);font-size:14px">主内容区</div>
  </nux-side-panel>
</div>`,
    code: `<nux-side-panel brand-icon="🌰" brand-name="松果氪" action-label="新对话"
  layout="fill" :tabs="tabs" :items="items" active-key="c1"
  :personal-items="personal" user-name="林一"
  @select="onSelect" @remove="onRemove" @action="onNew"></nux-side-panel>
// layout: sticky(默认，随窗滚动) / fill(撑满父容器)；meta 展示传 :item-meta="i => i.meta"`,
    data() {
      return {
        tabs: [{ key: 'all', label: '全部' }, { key: 'fav', label: '收藏' }],
        items: [
          { id: 'c1', title: '周报怎么写出重点', meta: '5 分钟前', status: 'done' },
          { id: 'c2', title: '把访谈整理成要点', meta: '昨天', status: 'done' },
          { id: 'c3', title: '起十个备选书名', meta: '3 天前', status: 'generating' }
        ],
        personal: [
          { key: 'style', name: '写作偏好', icon: '🎨', desc: '语气与排版习惯' },
          { key: 'memory', name: '长期记忆', icon: '🧠', desc: '记住 12 条偏好' }
        ]
      };
    },
    methods: {
      onSelect(item) { window.showToast('选中「' + item.title + '」', 'info'); },
      onRemove(item) { window.showToast('已删除「' + item.title + '」（演示不真删）', 'info'); },
      onPersonal(p) { window.showToast('打开「' + ((p && (p.name || p.label)) || '个性化') + '」（演示）', 'info'); },
      note(msg) { window.showToast(msg + '（演示）', 'info'); }
    }
  });

  push('layouts', {
    id: 'section',
    tag: 'nux-section',
    title: '内容分节',
    desc: '标题 + 描述 + 操作插槽的标准分节；flat 去卡片用于嵌套在已有卡片内',
    tpl: `
<div class="demo-col" style="max-width: 480px; gap: 14px">
  <nux-section title="创作数据" description="近 30 天的产出概览">
    <template #actions>
      <nux-button size="sm" variant="text" @click="note">查看报表</nux-button>
    </template>
    <div class="demo-row" style="gap:24px">
      <div><b style="font-size:20px">18</b><span class="demo-note" style="margin:0 0 0 4px">篇</span></div>
      <div><b style="font-size:20px">3.2 万</b><span class="demo-note" style="margin:0 0 0 4px">字</span></div>
      <div><b style="font-size:20px">92%</b><span class="demo-note" style="margin:0 0 0 4px">按期率</span></div>
    </div>
  </nux-section>
  <nux-section title="平铺款" description="flat 去掉卡片边框，适合嵌进已有卡片" :flat="true">
    <p class="demo-note" style="margin:0">这里是 flat 分节的内容。</p>
  </nux-section>
</div>`,
    code: `<nux-section title="创作数据" description="近 30 天的产出概览">
  <template #actions><nux-button size="sm" variant="text">查看报表</nux-button></template>
  内容
</nux-section>
<nux-section title="平铺款" :flat="true">内容</nux-section>`,
    methods: { note() { window.showToast('报表页（演示）', 'info'); } }
  });

  push('layouts', {
    id: 'backtop',
    tag: 'nux-backtop',
    title: '回到顶部',
    desc: '页面滚动超过阈值后右下角浮出，点击平滑回顶；已在本页生效，往上滚即可看到',
    tpl: `
<div>
  <nux-backtop :threshold="300"></nux-backtop>
  <p class="demo-note">向下滚动本页超过 300px，右下角出现返回顶部按钮。</p>
</div>`,
    code: `<nux-backtop :threshold="300"></nux-backtop>
// 窗口级组件，一页放一个即可`,
    methods: {}
  });

  push('site', {
    id: 'about-page',
    tag: 'nux-about-page',
    title: '关于页',
    desc: '产品「关于」整页：品牌 hero / 故事 / 特性 / 承诺 / 生态矩阵 / 联系入口，props 全驱动',
    tpl: `
<div style="height: 460px; overflow-y: auto; border: 1px solid var(--nx-border); border-radius: 12px">
  <nux-about-page app-name="星轨旅记" app-icon="🛰️"
    slogan="把每一段路，写成可以回访的星图"
    description="为旅行写作者打造的轻笔记，一页就是一个目的地。"
    :story="story" :features="features" :promises="promises"
    :ecosystem="eco" version="v2.4.1" back-url="/playground.html"
    @back="note"></nux-about-page>
</div>`,
    code: `<nux-about-page app-name="星轨旅记" app-icon="🛰️"
  slogan="把每一段路，写成可以回访的星图"
  :story="story" :features="features" :promises="promises"
  :ecosystem="eco" version="v2.4.1" back-url="/"></nux-about-page>
// ecosystem 不传时默认展示松果氪产品矩阵（线上从 /api/portal/apps 拉取）`,
    data() {
      return {
        story: [
          '星轨旅记诞生于一次青甘环线：照片散在相册，感触散在备忘录，回来后谁也想不起哪张图配哪段路。',
          '我们相信旅行写作不该是负担——每天一分钟，把位置、照片和一句话感受串起来，行程结束就有一本可分享的小册子。'
        ],
        features: [
          { icon: '🗺️', title: '行程自动串联', desc: '按时间与位置把碎片整理成路线' },
          { icon: '📸', title: '照片就近安放', desc: '拍摄地点自动匹配到当天行程' },
          { icon: '🔗', title: '一键分享', desc: '生成精美链接与海报，无需注册即可看' }
        ],
        promises: [
          { icon: '🔐', title: '数据可导出', desc: '随时打包带走全部行程与照片' },
          { icon: '🚀', title: '无广告打扰', desc: '核心功能永久免费' }
        ],
        eco: [
          { name: '星轨旅记', desc: '旅行笔记', color: '#0ea5e9' },
          { name: '墨韵创作', desc: '小说创作', color: '#228FBD' },
          { name: '拾光', desc: '生活笔记', color: '#8b5cf6' },
          { name: '司南', desc: '人生推演', color: '#0d9488' }
        ]
      };
    },
    methods: { note() { window.showToast('返回首页（演示不跳转）', 'info'); } }
  });

  push('site', {
    id: 'settings-drawer',
    tag: 'nux-settings-drawer',
    title: '设置抽屉',
    desc: '左侧栏目 + 右侧页面的设置壳，hash 直达某栏目（#/settings/xxx），焦点与滚动锁定齐备',
    tpl: `
<div>
  <nux-button @click="open = true">打开设置</nux-button>
  <nux-settings-drawer v-model="open" app-name="星轨旅记" app-icon="🛰️"
    title="偏好设置" hash-prefix="pg-settings"
    :sections="sections" @navigate="k => page = k">
    <template #page>
      <p class="demo-note" style="margin:0 0 10px">当前栏目：{{ page }}。这里由业务通过 #page 插槽渲染真正的设置项。</p>
      <nux-switch v-model="dark" label="跟随深色模式" description="演示开关，不改变本页主题"></nux-switch>
    </template>
  </nux-settings-drawer>
</div>`,
    code: `<nux-settings-drawer v-model="open" :sections="sections"
  app-name="星轨旅记" hash-prefix="settings" @navigate="go">
  <template #page>设置项</template>
</nux-settings-drawer>
// sections: [{ key, label, icon, desc }]；#/settings/appearance 可直达栏目`,
    data() {
      return {
        open: false,
        page: 'appearance',
        dark: false,
        sections: [
          { key: 'appearance', label: '外观', icon: '🎨', desc: '主题与显示' },
          { key: 'notify', label: '通知', icon: '🔔', desc: '提醒方式与免打扰' },
          { key: 'about', label: '关于', icon: 'ℹ️', desc: '版本与反馈' }
        ]
      };
    }
  });

  push('global-controls', {
    id: 'onboarding',
    tag: 'nux-onboarding',
    title: '新手引导（全屏）',
    desc: '首访一次性弹出的多步引导，完成/跳过写入 localStorage 不再来；演示每次都生成新 key',
    tpl: `
<div>
  <nux-button @click="show = true">重播新手引导</nux-button>
  <nux-onboarding v-if="show" :steps="steps" :done-key="obKey"
    @done="fin('引导完成')" @skip="fin('已跳过')"></nux-onboarding>
</div>`,
    code: `<nux-onboarding :steps="steps" done-key="nux_onboarding_v1"
  @done="start" @skip="later"></nux-onboarding>
// steps: [{ title, desc, icon?, links?: [{label,url,primary?}] }]
// 首访自动弹出；done-key 写入 localStorage 后不再打扰`,
    data() {
      return {
        show: false,
        obKey: 'nux_pg_ob_' + Date.now(),
        steps: [
          { title: '欢迎来到 Playground', desc: '这里的每个组件都是真实渲染，点「查看代码」直接抄用法。' },
          { title: '先去摸一遍基础控件', desc: '按钮、输入、开关——摸过再决定要不要用。', links: [{ label: '查看接入指南', url: 'index.html#quickstart', primary: true }] }
        ]
      };
    },
    methods: {
      fin(msg) {
        this.show = false;
        window.showToast(msg, 'info');
      }
    }
  });

  push('global-controls', {
    id: 'onboarding-strip',
    tag: 'nux-onboarding-strip',
    title: '新手引导（横幅）',
    desc: '温和的任务条引导：只展示第一个未完成步骤，完成后自动切下一条，可忽略',
    tpl: `
<div class="demo-col" style="max-width: 520px">
  <nux-onboarding-strip :steps="steps" :done="done" dismiss-key="pg_ob_strip"
    @action="onAction" @dismiss="note('已忽略，本次不再展示')"></nux-onboarding-strip>
  <p class="demo-note" style="margin:0">已完成 {{ done.length }} / {{ steps.length }} 步。</p>
</div>`,
    code: `<nux-onboarding-strip :steps="steps" :done="doneKeys"
  dismiss-key="onboarding_strip" @action="go" @dismiss="hide"></nux-onboarding-strip>
// steps: [{ key, icon?, title, desc?, btn? }]；done 为已完成 key 数组`,
    data() {
      return {
        done: [],
        steps: [
          { key: 'create', icon: '✨', title: '创建第一个作品', desc: '从模板开始只要 30 秒', btn: '去创建' },
          { key: 'invite', icon: '👋', title: '邀请一位协作者', desc: '双人协作更高效', btn: '去邀请' },
          { key: 'share', icon: '🔗', title: '生成分享链接', desc: '让读者第一时间看到更新', btn: '去分享' }
        ]
      };
    },
    methods: {
      onAction(step) {
        if (!this.done.includes(step.key)) this.done = [...this.done, step.key];
        window.showToast('完成「' + step.title + '」', 'success');
      },
      note(msg) { window.showToast(msg, 'info'); }
    }
  });
})();
