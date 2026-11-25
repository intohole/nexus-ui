(function() {
  window.PG_CATS = window.PG_CATS || [];

  window.PG_CATS.push({
    id: 'ai-primitives',
    name: 'AI 交互原语 · v2.97.0',
    demos: [
      {
        id: 'nexus-stop',
        tag: 'NexusStop',
        title: '停止/取消生成原语',
        desc: 'seq 代际闸+终态四态分类+文案收敛（默认=宿主可覆盖），nux-ai-chat 已接线 stopNote 终态签名行',
        tpl: `
<div class="demo-col">
  <div class="demo-row" style="align-items:center">
    <button type="button" class="nux-btn" style="min-height:38px;padding:0 16px" @click="start">开始一轮生成</button>
    <button type="button" class="nux-btn" style="min-height:38px;padding:0 16px" :disabled="!streaming" @click="doStop">停止</button>
    <span class="demo-note" v-if="streaming">seq={{ seq }} · 生成中…（每 400ms 一帧）</span>
  </div>
  <div class="nx-ai-chat-bubble" style="max-width:32em;min-height:2.5em;padding:10px 14px">
    <span>{{ content }}</span>
    <div v-if="note" class="nx-ai-chat-stopped-line">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>
      <span>{{ note }}</span>
    </div>
  </div>
  <p class="demo-note">迟到帧演示：停止后 900ms 服务器还会补 3 帧（旧代际被 isCurrent 拒收，不污染终态）；有内容/无内容两种终态文案都来自 noteFor(classify())。</p>
</div>`,
        code: `const stopper = NexusStop.create({ cancelRequest: () => api.post('/chat/interrupt') });
const seq = stopper.begin();            // 每轮开始捕获代际
// 迟到回调顶部拒收：if (!stopper.isCurrent(seq)) return;
stopper.stop();                          // stopFn→controller→cancelRequest
msg._stoppedNote = stopper.noteFor(stopper.classify(!!msg.content));`,
        data() {
          return { streaming: false, content: '', note: '', seq: 0, timer: null, lateTimer: null };
        },
        methods: {
          start() {
            this.teardown();
            this.streaming = true;
            this.content = '';
            this.note = '';
            this.stopper = window.NexusStop.create();
            this.seq = this.stopper.begin();
            const seq = this.seq;
            this.timer = setInterval(() => {
              if (!this.stopper.isCurrent(seq)) return;
              this.content += '这是一段流式生成的回答。';
            }, 400);
          },
          doStop() {
            if (!this.streaming) return;
            this.streaming = false;
            this.stopper.stop();
            const note = this.stopper.noteFor(this.stopper.classify(!!this.content));
            this.note = note;
            clearInterval(this.timer);
            this.lateTimer = setTimeout(() => {
              const seq = this.seq;
              if (!this.stopper.isCurrent(seq)) return;
              this.content += '（迟到帧不应出现）';
            }, 900);
          },
          teardown() {
            clearInterval(this.timer);
            clearTimeout(this.lateTimer);
          }
        },
        beforeUnmount() { this.teardown(); }
      },
      {
        id: 'timeline-current',
        tag: 'nux-timeline',
        title: '时间线当前项与动作插槽',
        desc: 'item.current 高亮当前项；#item 作用域插槽 {index,is-current,busy} 承载动作钮；#empty 空态',
        tpl: `
<div class="demo-col">
  <nux-timeline :items="versions">
    <template #item="{ item, isCurrent, busy }">
      <button v-if="!isCurrent" type="button" class="nux-btn" style="min-height:30px;padding:0 12px;font-size:12px;margin-top:4px" :disabled="busy" @click="restore(item)">切回此版</button>
      <span v-else class="demo-note" style="margin-top:4px">当前使用中</span>
    </template>
    <template #empty>还没有版本，保存后改动前的版本会自动留在这里。</template>
  </nux-timeline>
  <div class="demo-row">
    <button type="button" class="nux-btn" style="min-height:30px;padding:0 12px;font-size:12px" @click="saveVersion">保存新版本</button>
    <button type="button" class="nux-btn" style="min-height:30px;padding:0 12px;font-size:12px" @click="versions = []">清空（看空态）</button>
  </div>
  <p class="demo-note">空态经 #empty 插槽给引导文案；徽章等富标记走 #item（组件只管 current 高亮，评审裁定）。</p>
</div>`,
        code: `<nux-timeline :items="versions">
  <template #item="{ item, isCurrent, busy }">
    <button v-if="!isCurrent" :disabled="busy" @click="restore(item)">切回此版</button>
  </template>
  <template #empty>还没有编辑过，保存后改动前的版本会自动留在这里。</template>
</nux-timeline>`,
        data() {
          return {
            versions: [
              { time: '11月25日 10:00', tag: 'v1', title: '初版行程', desc: '首次生成', current: false },
              { time: '11月25日 14:00', tag: 'v2', title: '加了博物馆', desc: '改动前的版本自动留档', current: true }
            ]
          };
        },
        methods: {
          restore(item) {
            item.busy = true;
            setTimeout(() => {
              this.versions.forEach(v => { v.current = false; v.busy = false; });
              item.current = true;
            }, 500);
          },
          saveVersion() {
            const n = this.versions.length;
            this.versions.forEach(v => { v.current = false; });
            this.versions.unshift({
              time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
              tag: 'v' + (n + 1),
              title: '第 ' + (n + 1) + ' 次改动',
              desc: '改动前的版本自动留档，可随时切回',
              current: true
            });
          }
        }
      },
      {
        id: 'select-rich',
        tag: 'nux-select',
        title: '联想选择富选项',
        desc: 'filterable combo 分支：desc 副文案+tag 徽标+disabled 拒点；filterFields 双语检索；freeText 原值兜底',
        tpl: `
<div class="demo-col">
  <nux-select v-model="breed" :options="breeds" filterable label="品种" placeholder="输入中英文搜索"
    :filter-fields="['label','desc']"></nux-select>
  <p class="demo-note">已选：{{ breed || '（未选）' }} —— 手动输入不存在项再失焦会显示原值（freeText 兜底，存量自由文本数据不丢显示）。</p>
</div>`,
        code: `<nux-select v-model="breed" filterable
  :options="[{ label: '布偶猫', value: 'ragdoll', desc: 'Ragdoll · 大型', tag: '4-6kg' }]"
  :filter-fields="['label','desc']"></nux-select>`,
        data() {
          return {
            breed: '自由文本存量品种',
            breeds: [
              { label: '布偶猫', value: 'ragdoll', desc: 'Ragdoll · 大型长毛', tag: '4-6kg' },
              { label: '英国短毛猫', value: 'british', desc: 'British Shorthair · 中型', tag: '4-5kg' },
              { label: '橘猫', value: 'orange', desc: 'Orange Tabby · 通用', tag: '4-7kg' },
              { label: '柯基犬', value: 'corgi', desc: 'Corgi · 小型', tag: '10-13kg' },
              { label: '柴犬', value: 'shiba', desc: 'Shiba Inu · 中型', tag: '8-10kg' },
              { label: '已绝育档（示例禁选）', value: 'disabled', desc: '该选项演示 disabled 拒点', tag: '—', disabled: true }
            ]
          };
        }
      },
      {
        id: 'chip-fold',
        tag: 'nux-chip-group',
        title: 'chips 折叠与动作形态',
        desc: 'maxVisible 折叠出「还有 N 个」（计数含已选）；stat 副文案；variant=action 动作钮；removable 移除',
        tpl: `
<div class="demo-col">
  <p class="demo-note">选择形态 + stat + 折叠（选中第 7 个再看计数口径——N 含已选不漂移）：</p>
  <nux-chip-group v-model="picked" :options="watchOptions" :multiple="true" :max-visible="4"></nux-chip-group>
  <p class="demo-note">动作形态 variant=action + removable（关注/取关语义）：</p>
  <nux-chip-group :options="suggestOptions" variant="action" removable @change="follow" @remove="unfollow"></nux-chip-group>
</div>`,
        code: `<nux-chip-group v-model="picked" :options="items"
  :multiple="true" :max-visible="4"></nux-chip-group>
<nux-chip-group :options="suggestions" variant="action"
  removable @change="follow" @remove="unfollow"></nux-chip-group>`,
        data() {
          return {
            picked: [],
            watchOptions: [
              { label: 'AlphaEvolve', value: 'ae', stat: '3 条昨日动态' },
              { label: '英伟达', value: 'nvda', stat: '昨日无动静' },
              { label: 'harness', value: 'h', stat: '1 条昨日动态' },
              { label: 'DeepSeek', value: 'ds', stat: '昨日无动静' },
              { label: 'OpenAI', value: 'oa', stat: '2 条昨日动态' },
              { label: '智谱', value: 'zp', stat: '昨日无动静' },
              { label: '月之暗面', value: 'mk', stat: '1 条昨日动态' }
            ],
            suggestOptions: [
              { label: '+ 关注 台积电', value: 'tsmc' },
              { label: '+ 关注 苹果', value: 'aapl' },
              { label: '+ 关注 微软', value: 'msft' }
            ]
          };
        },
        methods: {
          follow(v) { window.showToast && showToast('已关注 ' + v, 'success'); },
          unfollow(v) { window.showToast && showToast('已取关 ' + v, 'info'); }
        }
      }
    ]
  });
})();
