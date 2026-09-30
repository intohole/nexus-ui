(function() {
  window.PG_CATS = window.PG_CATS || [];

  window.PG_CATS.push({
    id: 'controls',
    name: '基础控件',
    demos: [
      {
        id: 'btn',
        tag: 'nux-button',
        title: '按钮',
        desc: 'variant 变体 / size 尺寸 / loading 状态，触屏自动 44px 命中区',
        tpl: `
<div class="demo-row">
  <nux-button @click="say('主要操作')">主要操作</nux-button>
  <nux-button variant="ghost">次要操作</nux-button>
  <nux-button variant="danger">危险操作</nux-button>
  <nux-button variant="text">文字按钮</nux-button>
  <nux-button size="sm">小按钮</nux-button>
  <nux-button size="lg">大按钮</nux-button>
  <nux-button :loading="busy" @click="save">点击保存</nux-button>
  <nux-button disabled>禁用</nux-button>
</div>`,
        code: `<nux-button>主要操作</nux-button>
<nux-button variant="ghost">次要操作</nux-button>
<nux-button variant="danger">危险操作</nux-button>
<nux-button size="sm">小按钮</nux-button>
<nux-button :loading="busy" @click="save">点击保存</nux-button>`,
        data() { return { busy: false }; },
        methods: {
          say(t) { window.showToast(t, 'info'); },
          save() {
            this.busy = true;
            setTimeout(() => { this.busy = false; window.showToast('已保存', 'success'); }, 900);
          }
        }
      },
      {
        id: 'switch-check',
        tag: 'nux-switch / nux-checkbox',
        title: '开关与复选',
        desc: 'v-model 统一，label 与 description 内置排版',
        tpl: `
<div class="demo-col">
  <nux-switch v-model="notify" label="接收通知" description="重要进展会第一时间告诉你"></nux-switch>
  <nux-switch v-model="dark" label="深色模式跟随系统"></nux-switch>
  <nux-checkbox v-model="agree" label="我已阅读并同意服务条款"></nux-checkbox>
</div>`,
        code: `<nux-switch v-model="notify" label="接收通知"
  description="重要进展会第一时间告诉你"></nux-switch>
<nux-checkbox v-model="agree" label="我已阅读并同意服务条款"></nux-checkbox>`,
        data() { return { notify: true, dark: false, agree: true }; }
      },
      {
        id: 'radio-num',
        tag: 'nux-radio-group / nux-input-number',
        title: '单选组与数字步进',
        desc: '胶囊单选与带步进按钮的数值输入，键盘可用',
        tpl: `
<div class="demo-col">
  <nux-radio-group v-model="plan" :options="plans" label="选择方案"></nux-radio-group>
  <nux-input-number v-model="count" :min="1" :max="99" label="数量" unit="个"></nux-input-number>
</div>`,
        code: `<nux-radio-group v-model="plan"
  :options="[{label:'基础版',value:'basic'},{label:'专业版',value:'pro'}]"
  label="选择方案"></nux-radio-group>
<nux-input-number v-model="count" :min="1" :max="99"
  label="数量" unit="个"></nux-input-number>`,
        data() { return { plan: 'pro', count: 3, plans: [{label:'基础版',value:'basic'},{label:'专业版',value:'pro'},{label:'旗舰版',value:'max', disabled:true}] }; }
      },
      {
        id: 'swipe',
        tag: 'nux-swipe-actions',
        title: '滑动操作',
        desc: '右滑露左操作、左滑露右操作，触摸与鼠标拖拽，同页互斥',
        tpl: `
<nux-swipe-actions :left-actions="leftOps" :right-actions="rightOps" @action="onAction">
  <div class="demo-swipe-cell">👈 左滑标红 / 右滑标蓝 👉</div>
</nux-swipe-actions>
<p class="demo-note" v-if="last">触发：{{ last }}</p>`,
        code: `<nux-swipe-actions
  :left-actions="[{key:'open',label:'查看',icon:'👀',tone:'accent'}]"
  :right-actions="[{key:'delete',label:'删除',icon:'🗑',tone:'danger'}]"
  @action="onAction(key)">
  <div>任意卡片内容</div>
</nux-swipe-actions>`,
        data() {
          return {
            last: '',
            leftOps: [{ key: 'open', label: '查看', icon: '👀', tone: 'accent' }],
            rightOps: [{ key: 'archive', label: '归档', icon: '📦', tone: 'neutral' }, { key: 'delete', label: '删除', icon: '🗑', tone: 'danger' }]
          };
        },
        methods: { onAction(k) { this.last = k; } }
      },
      {
        id: 'search',
        tag: 'nux-search-box',
        title: '搜索框',
        desc: '防抖 search 事件、可清空、回车确认',
        tpl: `
<div class="demo-col">
  <nux-search-box v-model="kw" @search="go"></nux-search-box>
  <p class="demo-note" v-if="result">搜索：{{ result }}</p>
</div>`,
        code: `<nux-search-box v-model="kw" @search="go"></nux-search-box>`,
        data() { return { kw: '', result: '' }; },
        methods: { go() { this.result = this.kw || '（空关键词）'; } }
      },
      {
        id: 'loadprog',
        tag: 'nux-loading / nux-progress',
        title: '加载与进度',
        desc: '行内/块级加载，线性与环形进度',
        tpl: `
<div class="demo-col">
  <nux-progress :value="pct" :label="'同步进度 ' + pct + '%'" status="success"></nux-progress>
  <div class="demo-row">
    <nux-progress type="circle" :value="pct"></nux-progress>
    <nux-loading text="加载中"></nux-loading>
    <nux-loading size="sm" :inline="true"></nux-loading>
  </div>
</div>`,
        code: `<nux-progress :value="pct" label="同步进度" status="success"></nux-progress>
<nux-progress type="circle" :value="66"></nux-progress>
<nux-loading text="加载中"></nux-loading>`,
        data() { return { pct: 30 }; },
        mounted() {
          this.timer = setInterval(() => { this.pct = this.pct >= 100 ? 10 : this.pct + 9; }, 1600);
        },
        beforeUnmount() { clearInterval(this.timer); }
      },
      {
        id: 'sortable',
        tag: 'nux-sortable',
        title: '拖拽排序',
        desc: 'Pointer 拖拽 + 键盘方向键/Home/End，松手即提交新顺序并抛出 change',
        tpl: `
<div class="demo-col">
  <nux-sortable v-model="list" item-key="id" @change="onChange">
    <template #item="{ item, index }">
      <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;padding:10px 12px;border:1px solid var(--nx-border);border-radius:10px;background:var(--nx-bg-surface)">
        <span style="font-size:16px">{{ item.icon }}</span>
        <span style="font-weight:600;font-size:14px">{{ item.name }}</span>
        <span class="demo-note" style="margin:0 0 0 auto">第 {{ index + 1 }} 位</span>
      </div>
    </template>
  </nux-sortable>
  <p class="demo-note" style="margin:0">按住左侧圆点拖动；聚焦手柄后也可用方向键 / Home / End 调整。</p>
</div>`,
        code: `<nux-sortable v-model="list" item-key="id" @change="onChange">
  <template #item="{ item, index }">
    <div class="row">{{ item.name }}（第 {{ index + 1 }} 位）</div>
  </template>
</nux-sortable>
// @change(next, { from, to })：next 为新数组，落地后持久化即可`,
        data() {
          return {
            list: [
              { id: 'a', icon: '🌅', name: '晨间写作' },
              { id: 'b', icon: '📚', name: '主题阅读' },
              { id: 'c', icon: '🏃', name: '三公里慢跑' },
              { id: 'd', icon: '🧘', name: '睡前复盘' }
            ]
          };
        },
        methods: {
          onChange(next, pos) {
            this.list = next;
            window.showToast('第 ' + (pos.from + 1) + ' 项移到第 ' + (pos.to + 1) + ' 位', 'success');
          }
        }
      },
      {
        id: 'backtop',
        tag: 'nux-backtop',
        title: '回到顶部',
        desc: '窗口滚动超过 threshold 出现于右下角，点击平滑回顶，bottom/right 可调',
        tpl: `
<div>
  <div style="height: 480px; display:flex; align-items:center; justify-content:center; border:1px dashed var(--nx-border); border-radius:12px; color: var(--nx-text-muted); font-size: 13px; text-align:center">
    长页面占位（480px）<br>向下滚动本页，右下角会出现回到顶部按钮
  </div>
  <nux-backtop :threshold="240" @click="onBack"></nux-backtop>
</div>`,
        code: `<nux-backtop :threshold="300" bottom="32px" right="24px"
  @click="onBack"></nux-backtop>`,
        methods: { onBack() { window.showToast('正在回到顶部', 'info'); } }
      },
      {
        id: 'infinite-scroll',
        tag: 'nux-infinite-scroll',
        title: '无限滚动',
        desc: '滚动触底自动派发 load，loading / finished 状态内置展示，容器内滚动即可',
        tpl: `
<div>
  <div style="height: 300px; overflow-y: auto; border: 1px solid var(--nx-border); border-radius: 12px; padding: 4px">
    <nux-infinite-scroll :loading="loading" :finished="finished" :offset="60" @load="onLoad">
      <div v-for="n in items" :key="n"
           style="padding: 12px 14px; margin: 6px; border-radius: 10px; background: var(--nx-bg-muted); font-size: 14px">
        模拟记录 #{{ String(n).padStart(2, '0') }}
      </div>
    </nux-infinite-scroll>
  </div>
  <p class="demo-note" style="margin-top: 10px">已加载 {{ items.length }} / 30 条{{ finished ? '，全部加载完毕' : '，继续滚动加载' }}</p>
</div>`,
        code: `<nux-infinite-scroll :loading="loading" :finished="finished"
  :offset="200" @load="onLoad">
  <div v-for="item in items" :key="item.id">{{ item.title }}</div>
</nux-infinite-scroll>`,
        data() { return { items: [1, 2, 3, 4, 5], loading: false, finished: false, seq: 5 }; },
        methods: {
          onLoad() {
            if (this.loading || this.finished) return;
            this.loading = true;
            setTimeout(() => {
              const add = [];
              for (let i = 0; i < 5 && this.items.length < 30; i++) add.push(++this.seq);
              this.items = this.items.concat(add);
              this.loading = false;
              if (this.items.length >= 30) this.finished = true;
            }, 700);
          }
        }
      },
      {
        id: 'selection-bar',
        tag: 'nux-selection-bar',
        title: '批量操作条',
        desc: 'count 大于 0 时浮出底部操作条（fixed），{n} 占位显示数量，取消一键清空',
        tpl: `
<div class="demo-col">
  <div style="display:flex;flex-direction:column;gap:8px">
    <div v-for="row in rows" :key="row.id"
         style="display:flex;align-items:center;gap:12px;padding:10px 14px;border:1px solid var(--nx-border);border-radius:10px">
      <nux-checkbox v-model="row.picked"></nux-checkbox>
      <span style="font-size:14px">{{ row.name }}</span>
    </div>
  </div>
  <p class="demo-note" style="margin:0">已勾选 {{ pickedCount() }} 项，勾选后页面底部会浮出操作条。</p>
  <nux-selection-bar :count="pickedCount()" count-label="已选 {n} 条记录" @clear="clearAll">
    <nux-button size="sm" variant="ghost" @click="markDone">标记完成</nux-button>
    <nux-button size="sm" variant="danger" @click="removePicked">删除</nux-button>
  </nux-selection-bar>
</div>`,
        code: `<nux-selection-bar :count="picked.length" count-label="已选 {n} 条记录"
  @clear="picked = []">
  <nux-button size="sm" variant="ghost" @click="markDone">标记完成</nux-button>
</nux-selection-bar>`,
        data() {
          return {
            rows: [
              { id: 1, name: '整理会议纪要', picked: false },
              { id: 2, name: '回复合作邮件', picked: true },
              { id: 3, name: '更新版本计划', picked: false },
              { id: 4, name: '复审设计稿', picked: false }
            ]
          };
        },
        methods: {
          pickedCount() { return this.rows.filter(r => r.picked).length; },
          clearAll() {
            this.rows.forEach(r => { r.picked = false; });
            window.showToast('已清空选择', 'info');
          },
          markDone() {
            window.showToast('已标记 ' + this.pickedCount() + ' 条为完成', 'success');
            this.rows.forEach(r => { r.picked = false; });
          },
          removePicked() {
            window.showToast('已删除 ' + this.pickedCount() + ' 条（演示不真删）', 'success');
            this.rows.forEach(r => { r.picked = false; });
          }
        }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'forms',
    name: '表单输入',
    demos: [
      {
        id: 'input',
        tag: 'nux-input',
        title: '输入框',
        desc: 'label / clearable / counter / hint / error 校验提示，移动端 16px 字号防 iOS 缩放',
        tpl: `
<div class="demo-col">
  <nux-input v-model="name" label="名称" placeholder="请输入名称"
             clearable required :maxlength="20" hint="不超过 20 个字"
             :error="nameError">
    <template #prefix>@</template>
  </nux-input>
</div>`,
        code: `<nux-input v-model="name" label="名称" placeholder="请输入名称"
  clearable :maxlength="20" hint="不超过 20 个字" :error="nameError">
  <template #prefix>@</template>
</nux-input>`,
        data() { return { name: '', nameError: '' }; },
        watch: {
          name(v) {
            this.nameError = v.length > 0 && v.length < 2 ? '名称至少 2 个字符' : '';
          }
        }
      },
      {
        id: 'textarea',
        tag: 'nux-textarea',
        title: '多行输入',
        desc: 'autoResize 自动增高，字数统计',
        tpl: `
<div class="demo-col">
  <nux-textarea v-model="bio" label="简介" :rows="3" :auto-resize="true"
                :maxlength="120" placeholder="介绍一下自己"></nux-textarea>
</div>`,
        code: `<nux-textarea v-model="bio" label="简介" :rows="3"
  :auto-resize="true" :maxlength="120" placeholder="介绍一下自己"></nux-textarea>`,
        data() { return { bio: '' }; }
      },
      {
        id: 'select',
        tag: 'nux-select',
        title: '下拉选择',
        desc: '原生 select 保证移动端体验，options 配置化',
        tpl: `
<div class="demo-col">
  <nux-select v-model="city" label="城市" :options="cities" placeholder="请选择城市"></nux-select>
  <p class="demo-note" v-if="city">当前选择：{{ city }}</p>
</div>`,
        code: `<nux-select v-model="city" label="城市" :options="cities"
  placeholder="请选择城市"></nux-select>`,
        data() {
          return {
            city: '',
            cities: [
              { label: '上海', value: '上海' },
              { label: '杭州', value: '杭州' },
              { label: '深圳', value: '深圳' }
            ]
          };
        }
      },
      {
        id: 'form-group',
        tag: 'nux-form-group',
        title: '表单分组',
        desc: '统一的 label / 必填星号 / hint / error 排版壳，任意控件放进去就成表单',
        tpl: `
<div class="demo-col">
  <nux-form-group label="邮箱" required hint="用于登录与找回密码">
    <nux-input v-model="mail" placeholder="you@example.com" clearable></nux-input>
  </nux-form-group>
  <nux-form-group label="邀请码" required :error="codeError">
    <nux-input v-model="code" placeholder="请输入 6 位邀请码" :maxlength="6"></nux-input>
  </nux-form-group>
  <nux-form-group label="备注" hint="选填，不超过 50 字">
    <nux-input v-model="memo" placeholder="补充说明"></nux-input>
  </nux-form-group>
  <nux-form-group label="横排布局" :horizontal="true" hint="label 与控件同行，适合设置页">
    <nux-input v-model="nick" placeholder="昵称"></nux-input>
  </nux-form-group>
</div>`,
        code: `<nux-form-group label="邮箱" required hint="用于登录与找回密码">
  <nux-input v-model="mail" placeholder="you@example.com"></nux-input>
</nux-form-group>
<nux-form-group label="邀请码" required :error="codeError">
  <nux-input v-model="code"></nux-input>
</nux-form-group>`,
        data() { return { mail: '', code: '', memo: '', nick: '', codeError: '' }; },
        watch: {
          code(v) {
            this.codeError = v.length > 0 && v.length < 6 ? '邀请码为 6 位，还差 ' + (6 - v.length) + ' 位' : '';
          }
        }
      }
    ]
  });

  window.PG_CATS.push({
    id: 'nav',
    name: '选择与导航',
    demos: [
      {
        id: 'segmented',
        tag: 'nux-segmented',
        title: '分段控件',
        desc: '滑动指示器，移动端横向适配',
        tpl: `
<div class="demo-col">
  <nux-segmented v-model="tab" :options="tabs"></nux-segmented>
  <p class="demo-note">当前分段：{{ tab }}</p>
</div>`,
        code: `<nux-segmented v-model="tab" :options="tabs"></nux-segmented>`,
        data() {
          return {
            tab: 'day',
            tabs: [
              { label: '今日', value: 'day' },
              { label: '本周', value: 'week' },
              { label: '本月', value: 'month' },
              { label: '全部', value: 'all' }
            ]
          };
        }
      },
      {
        id: 'chips',
        tag: 'nux-chip-group',
        title: '标签选择组',
        desc: '单选 / 多选 / 可移除',
        tpl: `
<div class="demo-col">
  <nux-chip-group v-model="tags" :options="opts" :multiple="true"></nux-chip-group>
  <p class="demo-note">已选：{{ tags.join('、') || '（无）' }}</p>
</div>`,
        code: `<nux-chip-group v-model="tags" :options="opts" :multiple="true"></nux-chip-group>`,
        data() {
          return {
            tags: ['写作'],
            opts: [
              { label: '写作', value: '写作' },
              { label: '学习', value: '学习' },
              { label: '理财', value: '理财' },
              { label: '健康', value: '健康' }
            ]
          };
        }
      },
      {
        id: 'tabs-acc',
        tag: 'nux-tab-group / nux-accordion',
        title: '标签页与折叠面板',
        desc: '标签页切换视图，折叠面板单开模式',
        tpl: `
<div class="demo-col">
  <nux-tab-group v-model="view" :tabs="views"></nux-tab-group>
  <nux-accordion v-model="acc" :items="faqs"></nux-accordion>
</div>`,
        code: `<nux-tab-group v-model="view" :tabs="views"></nux-tab-group>
<nux-accordion v-model="acc" :items="faqs"></nux-accordion>`,
        data() {
          return {
            view: 'all',
            views: [
              { key: 'all', label: '全部', icon: '📋' },
              { key: 'mine', label: '我的', icon: '👤' },
              { key: 'fav', label: '收藏', icon: '⭐' }
            ],
            acc: 0,
            faqs: [
              { title: '多端适配谁来做？', content: '适配收口在 nexus-ui 中间件：桌面优先布局，820px 以下自动单列，触屏自动放大命中区。' },
              { title: '如何切换主题色？', content: '在 body 上添加应用 class（如 app-one-note），全部组件跟随 --app-accent 变量联动。' },
              { title: '组件如何引入？', content: 'nexus-all.css 包含全部样式，按需引入对应 nux-*.js 并注册组件即可。' }
            ]
          };
        }
      }
    ]
  });
})();
