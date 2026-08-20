(function () {
  const STREAK_MILESTONES = [
    { min: 100, label: '百日光环', medal: '🏆' },
    { min: 66, label: '韧者之王', medal: '🥇' },
    { min: 30, label: '习惯成真', medal: '🥈' },
    { min: 21, label: '三周破茧', medal: '🥉' },
    { min: 7, label: '初见成效', medal: '🌱' },
    { min: 1, label: '勇敢起跑', medal: '🫶' }
  ]
  const TYPE_LABELS = { counter: '计数', timer: '计时', text: '记录', step: '分步', choice: '选择', binary: '打卡' }

  const NuxCheckin = {
    name: 'NuxCheckin',
    props: {
      title: { type: String, default: '' },
      icon: { type: String, default: '🔥' },
      subtitle: { type: String, default: '' },
      taskType: { type: String, default: 'binary' },
      taskTitle: { type: String, default: '' },
      taskDesc: { type: String, default: '' },
      taskTarget: { type: Number, default: 1 },
      unit: { type: String, default: '' },
      direction: { type: String, default: 'increase' },
      baseline: { type: Number, default: 0 },
      checkedIn: { type: Boolean, default: false },
      todayTotal: { type: Number, default: 0 },
      todayTarget: { type: Number, default: 1 },
      streak: { type: Number, default: 0 },
      prevStreak: { type: Number, default: 0 },
      completedDays: { type: Number, default: 0 },
      totalDays: { type: Number, default: 0 },
      startDate: { type: String, default: '' },
      endDate: { type: String, default: '' },
      records: { type: Array, default: () => [] },
      shields: { type: Number, default: 0 },
      mendLeft: { type: Number, default: 0 },
      freezeLeft: { type: Number, default: 0 },
      missedDates: { type: Array, default: () => [] },
      loading: { type: Boolean, default: false },
      error: { type: String, default: '' },
      celebrateText: { type: String, default: '' },
      task: { type: Boolean, default: true }
    },
    emits: ['checkin', 'quick-checkin', 'mend', 'freeze', 'repair', 'open-day'],
    data() {
      return { value: 1, textValue: '', steps: [], celebrating: false }
    },
    computed: {
      taskTypeName() { return TYPE_LABELS[this.taskType] || '打卡' },
      streakTrend() {
        if (this.streak > this.prevStreak) return 'up'
        if (this.streak < this.prevStreak) return 'down'
        return ''
      },
      milestone() { return STREAK_MILESTONES.find(m => this.streak >= m.min) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1] },
      progressPct() {
        if (this.baseline > 0) {
          if (this.direction === 'decrease') return this.todayTotal <= this.baseline ? 100 : Math.round(Math.min(100, 80 + Math.min(1, (this.todayTotal - this.baseline) / this.baseline) * 20))
          return Math.round(Math.min(100, (this.todayTotal / this.baseline) * 100))
        }
        return this.todayTarget > 0 ? Math.min(100, Math.round((this.todayTotal / this.todayTarget) * 100)) : 0
      },
      progressColor() {
        if (this.baseline > 0) {
          if (this.direction === 'decrease') return this.todayTotal <= this.baseline ? 'var(--nx-success)' : 'var(--nx-warning)'
          return this.todayTotal >= this.baseline ? 'var(--nx-success)' : 'var(--nx-warning)'
        }
        return this.todayTotal >= (this.todayTarget || 1) ? 'var(--nx-success)' : 'var(--app-accent, var(--nx-primary))'
      },
      isMulti() { return this.taskType === 'counter' || this.taskType === 'timer' },
      days() {
        if (!this.startDate) return []
        const today = this.todayStr()
        const total = this.totalDays || 1
        const end = this.endDate || this.addDays(this.startDate, total - 1)
        const map = {}
        this.records.forEach(r => { map[r.date] = r.status || 'checked' })
        const out = []
        for (let i = 0; i < total; i++) {
          const date = this.addDays(this.startDate, i)
          if (date > end) break
          const st = map[date] || ''
          let cls = '', mark = '·'
          if (st === 'checked' || st === 'completed') { cls = 'done'; mark = '✓' }
          else if (st === 'frozen') { cls = 'frozen'; mark = '❄' }
          else if (st === 'mended') { cls = 'mended'; mark = '✚' }
          else if (date < today) { cls = 'missed'; mark = '·' }
          else if (date > today) cls = 'future'
          if (date === today) cls += ' today'
          out.push({ date, index: i, cls, mark, clickable: !!st || date === today })
        }
        return out
      },
      fmtVal() {
        if (this.taskType !== 'timer') return String(this.value)
        const m = this.value || 0
        return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0')
      }
    },
    watch: {
      celebrateText(v) {
        if (!v) return
        this.celebrating = true
        setTimeout(() => { this.celebrating = false }, 1300)
      }
    },
    methods: {
      todayStr() {
        const d = new Date()
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
      },
      addDays(ds, n) {
        const d = new Date(ds + 'T00:00:00')
        d.setDate(d.getDate() + n)
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
      },
      adjust(d) { this.value = Math.max(0, this.value + d) },
      submit() {
        if (this.loading) return
        const tt = this.taskType
        const payload = { value: 1.0, reflection: '' }
        if (tt === 'counter' || tt === 'timer') {
          if (this.value <= 0) return
          payload.value = this.value
        } else if (tt === 'text') {
          if (!this.textValue.trim()) return
          payload.value = this.textValue.length
          payload.reflection = this.textValue
        }
        this.$emit('quick-checkin', payload, tt)
      }
    },
    template: `
      <div class="nux-checkin">
        <div v-if="loading" class="nux-checkin-skeleton"><span class="nx-skeleton skeleton-line w60"></span><span class="nx-skeleton skeleton-line w40"></span><span class="nx-skeleton skeleton-line w80"></span></div>
        <template v-else>
          <div v-if="error" class="nux-checkin-error"><i class="fas fa-circle-exclamation"></i>{{ error }}</div>

          <div class="nux-checkin-streak" :class="{ celebrating }">
            <div class="nux-checkin-streak-icon">{{ streak > 0 ? '🔥' : '🌱' }}</div>
            <div class="nux-checkin-streak-body">
              <div class="nux-checkin-streak-num">{{ streak }}<span>天</span></div>
              <div class="nux-checkin-streak-label">
                <b v-if="streakTrend==='up'" class="trend up">↑</b><b v-else-if="streakTrend==='down'" class="trend down">↓</b>
                连续打卡
              </div>
              <div class="nux-checkin-mile"><span class="medal">{{ milestone.medal }}</span><span>{{ milestone.label }}</span></div>
            </div>
            <div v-if="shields>0" class="nux-checkin-streak-shields"><i class="fas fa-shield-halved"></i><span>{{ shields }}</span></div>
          </div>

          <div class="nux-checkin-overview" v-if="totalDays>0">
            <div class="nux-checkin-ov"><b>{{ completedDays }}</b><span>已完成</span></div>
            <div class="nux-checkin-ov"><b>{{ totalDays ? Math.round(completedDays/totalDays*100) : 0 }}%</b><span>总进度</span></div>
            <div class="nux-checkin-ov"><b>{{ missedDates.length }}</b><span>待补签</span></div>
          </div>

          <div class="nux-checkin-task nx-card" v-if="taskType && task">
            <div class="nux-checkin-task-head">
              <div class="nux-checkin-task-title"><span class="nux-checkin-badge-type">{{ taskTypeName }}</span>{{ icon }} {{ taskTitle }}</div>
              <p v-if="taskDesc" class="nux-checkin-task-desc">{{ taskDesc }}</p>
            </div>

            <div class="nux-checkin-progress" v-if="isMulti && todayTotal>0">
              <div class="nux-checkin-progress-bar"><div class="nux-checkin-progress-fill" :style="{width: progressPct+'%', background: progressColor}"></div></div>
              <div class="nux-checkin-progress-info"><span>{{ todayTotal }}</span><span class="sep">/</span><span>{{ (baseline||todayTarget||taskTarget) }} {{ unit }}</span></div>
            </div>

            <div v-if="checkedIn" class="nux-checkin-done"><i class="fas fa-check-circle"></i><span>今日已完成，好样的！</span></div>
            <div v-else-if="!isMulti && taskType!=='text' && taskType!=='counter' && taskType!=='timer'" class="nux-checkin-action">
              <button class="nux-checkin-primary" :disabled="loading" @click="$emit('checkin', {value:1})"><i class="fas fa-fire"></i><span>{{ loading ? '点燃中…' : '点亮今日' }}</span></button>
              <button class="nux-checkin-mini" :disabled="loading" @click="$emit('checkin', {value:0.5})">今天太累？5分钟微打卡守住节奏</button>
            </div>
            <div v-else class="nux-checkin-action">
              <div class="nux-checkin-entry" v-if="taskType==='counter'">
                <div class="nux-checkin-picker"><button class="nux-checkin-step" @click="adjust(-1)">−1</button><div class="nux-checkin-display"><div class="num">{{ value }}</div><div class="tgt">/ {{ taskTarget || 1 }} {{ unit }}</div></div><button class="nux-checkin-step" @click="adjust(1)">+1</button></div>
              </div>
              <div class="nux-checkin-entry" v-else-if="taskType==='timer'">
                <div class="nux-checkin-picker"><button class="nux-checkin-step" @click="adjust(-5)">−5</button><div class="nux-checkin-display"><div class="num">{{ fmtVal }}</div><div class="tgt">/ {{ taskTarget || 10 }} {{ unit || '分钟' }}</div></div><button class="nux-checkin-step" @click="adjust(5)">+5</button></div>
                <div class="nux-checkin-presets"><button v-for="p in [5,10,15,20,30]" :key="p" class="nux-checkin-preset" :class="{active:value===p}" @click="value=p">{{ p }}分</button></div>
              </div>
              <div class="nux-checkin-entry" v-else-if="taskType==='text'">
                <textarea class="nux-checkin-textarea" v-model="textValue" placeholder="记录你的想法、感受或今天的收获..."></textarea>
                <div class="nux-checkin-text-counter"><b>{{ textValue.length }}</b> 字</div>
              </div>
              <button class="nux-checkin-primary" :disabled="loading" @click="submit"><i class="fas fa-check"></i><span>{{ loading ? '提交中…' : '提交打卡' }}</span></button>
            </div>
          </div>

          <div class="nux-checkin-safety" v-if="missedDates.length">
            <i class="fas fa-heart"></i><span>断签不是失败，找不到原因才是。别灰心，随时补上。</span>
            <button class="nux-checkin-sub" v-if="mendLeft>0" @click="$emit('mend')"><i class="fas fa-plus"></i> 补签（剩{{ mendLeft }}）</button>
          </div>

          <div class="nux-checkin-calendar" v-if="days.length">
            <div class="nux-checkin-cal-head"><span>打卡日历</span><span class="legend"><em class="d"></em>已打<em class="f"></em>冻结<em class="m"></em>补签</span></div>
            <div class="nux-checkin-cal-grid">
              <button v-for="c in days" :key="c.date" :class="['nux-checkin-cell', c.cls]" :disabled="!c.clickable" @click="$emit('open-day', c.date)"><span class="st">{{ c.mark }}</span><span>{{ c.index+1 }}</span></button>
            </div>
            <div class="nux-checkin-cal-actions" v-if="mendLeft>0 || freezeLeft>0">
              <button class="nux-checkin-ghost" v-if="mendLeft>0" @click="$emit('mend')"><i class="fas fa-plus"></i> 补签</button>
              <button class="nux-checkin-ghost" v-if="freezeLeft>0" @click="$emit('freeze')"><i class="fas fa-snowflake"></i> 冻结（剩{{ freezeLeft }}）</button>
              <button class="nux-checkin-ghost success" @click="$emit('repair')"><i class="fas fa-band-aid"></i> 修复</button>
            </div>
          </div>
        </template>
      </div>
    `
  }

  window.NuxCheckin = NuxCheckin
})()