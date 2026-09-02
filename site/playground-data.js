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
        id: 'steps',
        tag: 'nux-steps',
        title: '步骤条',
        desc: '流动填充线，current 控制进度',
        tpl: `
<div class="demo-col">
  <nux-steps :items="items" :current="cur"></nux-steps>
  <div class="demo-row">
    <nux-button size="sm" variant="ghost" @click="cur = Math.max(cur - 1, 0)">上一步</nux-button>
    <nux-button size="sm" @click="cur = Math.min(cur + 1, 3)">下一步</nux-button>
  </div>
</div>`,
        code: `<nux-steps :items="items" :current="cur"></nux-steps>`,
        data() {
          return {
            cur: 1,
            items: [
              { title: '选择场景', desc: '确认目标' },
              { title: '补充信息', desc: '关键细节' },
              { title: '确认生成', desc: '一键生成' },
              { title: '查看成果', desc: '编辑导出' }
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
