(function () {
  const pad2 = (n) => String(n).padStart(2, '0')
  const toKey = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
  const parseKey = (s) => new Date(s + 'T00:00:00')
  const clampLevel = (v) => Math.min(4, Math.max(0, Number(v) || 0))

  const NuxCalendar = {
    name: 'NuxCalendar',
    props: {
      mode: { type: String, default: 'month' },
      modelValue: { type: String, default: '' },
      levels: { type: Object, default: () => ({}) },
      counts: { type: Object, default: () => ({}) },
      startDate: { type: String, default: '' },
      totalDays: { type: Number, default: 0 },
      endDate: { type: String, default: '' },
      records: { type: Array, default: () => [] },
      cells: { type: Array, default: () => [] },
      year: { type: Number, default: 0 },
      month: { type: Number, default: 0 },
      weekStart: { type: Number, default: 1 },
      legend: { type: Boolean, default: true },
      loading: { type: Boolean, default: false }
    },
    emits: ['update:modelValue', 'date-select', 'month-change'],
    data() {
      const now = new Date()
      return { viewYear: this.year || now.getFullYear(), viewMonth: this.month || now.getMonth() + 1, heatStep: 15 }
    },
    watch: {
      year(v) { if (v) this.viewYear = v },
      month(v) { if (v) this.viewMonth = v },
      cells() { this.$nextTick(this.measureHeat) }
    },
    mounted() {
      this.$nextTick(this.measureHeat)
      if (typeof ResizeObserver !== 'undefined') {
        this._heatRO = new ResizeObserver(() => this.measureHeat())
        this._heatRO.observe(this.$el)
      }
    },
    unmounted() {
      if (this._heatRO) { this._heatRO.disconnect(); this._heatRO = null }
    },
    computed: {
      weekLabels() {
        return ['一', '二', '三', '四', '五', '六', '日']
      },
      monthDays() {
        const y = this.viewYear, m = this.viewMonth
        const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7
        const total = new Date(y, m, 0).getDate()
        const today = toKey(new Date())
        const out = []
        for (let i = 0; i < offset; i++) out.push({ key: 'e' + i, isEmpty: true, cls: 'empty', day: '' })
        for (let d = 1; d <= total; d++) {
          const date = y + '-' + pad2(m) + '-' + pad2(d)
          let cls = 'level-' + clampLevel(this.levels[date])
          if (date === today) cls += ' today'
          if (date === this.modelValue) cls += ' selected'
          out.push({ key: date, date, day: d, count: Number(this.counts[date]) || 0, cls, isEmpty: false })
        }
        return out
      },
      seqDays() {
        if (!this.startDate) return []
        const today = toKey(new Date())
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
          else if (date < today) cls = 'missed'
          else if (date > today) cls = 'future'
          if (date === today) cls += ' today'
          out.push({ date, index: i, mark, cls, clickable: !!st || date === today })
        }
        return out
      },
      heatWeeks() {
        if (!this.cells.length) return { weeks: [], months: [] }
        const sorted = this.cells.slice().sort((a, b) => a.date < b.date ? -1 : 1)
        const offset = (parseKey(sorted[0].date).getDay() + 6) % 7
        const flat = []
        for (let i = 0; i < offset; i++) flat.push(null)
        sorted.forEach(c => flat.push(c))
        while (flat.length % 7 !== 0) flat.push(null)
        const weeks = []
        for (let i = 0; i < flat.length; i += 7) weeks.push(flat.slice(i, i + 7))
        const months = []
        let last = -1
        weeks.forEach((w, wi) => {
          for (let j = 0; j < 7; j++) {
            const c = w[j]
            if (c) {
              const m = parseInt(c.date.slice(5, 7), 10)
              if (m !== last) { months.push({ idx: wi, label: m + '月' }); last = m }
            }
          }
        })
        return { weeks, months }
      },
      heatFlat() {
        return this.heatWeeks.weeks.flat()
      }
    },
    methods: {
      measureHeat() {
        if (this.mode !== 'heatmap' || !this.$el) return
        const el = this.$el.querySelector('.nux-cal-heat-scroll')
        if (!el) return
        const weeks = this.heatWeeks.weeks.length || 1
        const step = Math.floor((el.clientWidth - 26) / weeks)
        const next = Math.max(15, Math.min(26, step))
        if (next !== this.heatStep) this.heatStep = next
      },
      addDays(ds, n) {
        const d = parseKey(ds)
        d.setDate(d.getDate() + n)
        return toKey(d)
      },
      shiftMonth(dir) {
        let y = this.viewYear, m = this.viewMonth + dir
        if (m < 1) { m = 12; y-- }
        if (m > 12) { m = 1; y++ }
        this.viewYear = y
        this.viewMonth = m
        this.$emit('month-change', { year: y, month: m })
      },
      goToday() {
        const now = new Date()
        const y = now.getFullYear(), m = now.getMonth() + 1
        const changed = y !== this.viewYear || m !== this.viewMonth
        this.viewYear = y
        this.viewMonth = m
        if (changed) this.$emit('month-change', { year: y, month: m })
      },
      pick(c) {
        if (c.isEmpty) return
        this.$emit('update:modelValue', c.date)
        this.$emit('date-select', c.date, c)
      },
      heatTitle(c) {
        if (!c) return ''
        return c.date + (c.value !== undefined ? ' · ' + c.value + (c.unit || '') : '')
      },
      heatStyle(idx) {
        return { left: (idx * this.heatStep) + 'px' }
      },
      clampL(v) {
        return clampLevel(v)
      }
    },
    template: `
      <div class="nux-calendar" :class="'mode-' + mode">
        <div v-if="loading" class="nux-cal-skeleton" aria-hidden="true">
          <span class="nx-skeleton skeleton-line w40"></span>
          <div class="nux-cal-skeleton-grid"><span v-for="i in 35" :key="i" class="nx-skeleton nux-cal-sk-cell"></span></div>
        </div>
        <template v-else>
          <template v-if="mode === 'month'">
            <div class="nux-cal-head">
              <div class="nux-cal-title">
                <button type="button" class="nux-cal-nav" @click="shiftMonth(-1)" aria-label="上一月">‹</button>
                <span class="nux-cal-month">{{ viewYear }} 年 {{ viewMonth }} 月</span>
                <button type="button" class="nux-cal-nav" @click="shiftMonth(1)" aria-label="下一月">›</button>
              </div>
              <button type="button" class="nux-cal-today-btn" @click="goToday">今天</button>
            </div>
            <div class="nux-cal-weeks" aria-hidden="true"><span v-for="w in weekLabels" :key="w">{{ w }}</span></div>
            <div class="nux-cal-grid" role="grid">
              <button v-for="c in monthDays" :key="c.key" type="button" class="nux-cal-cell" :class="c.cls"
                      :disabled="c.isEmpty" :aria-label="c.isEmpty ? null : c.date" @click="pick(c)">
                <span class="nux-cal-num">{{ c.day }}</span>
                <span v-if="c.count > 0" class="nux-cal-count">{{ c.count > 99 ? '99+' : c.count }}</span>
              </button>
            </div>
          </template>

          <template v-else-if="mode === 'sequence'">
            <div class="nux-cal-grid seq" role="grid">
              <button v-for="c in seqDays" :key="c.date" type="button" class="nux-cal-cell" :class="c.cls"
                      :disabled="!c.clickable" :aria-label="'第' + (c.index + 1) + '天 ' + c.date"
                      @click="$emit('date-select', c.date, c)">
                <span class="nux-cal-mark">{{ c.mark }}</span>
                <span class="nux-cal-num">{{ c.index + 1 }}</span>
              </button>
            </div>
          </template>

          <template v-else>
            <div v-if="!cells.length" class="nux-cal-heat-empty">暂无数据</div>
            <div v-else class="nux-cal-heat-scroll">
              <div class="nux-cal-heat" :style="{ '--nux-heat-cell': (heatStep - 2) + 'px' }">
                <div class="nux-cal-heat-months">
                  <span v-for="m in heatWeeks.months" :key="m.idx" class="nux-cal-heat-month" :style="heatStyle(m.idx)">{{ m.label }}</span>
                </div>
                <div class="nux-cal-heat-body">
                  <div class="nux-cal-heat-wds" aria-hidden="true">
                    <span style="grid-row: 1">一</span><span style="grid-row: 3">三</span><span style="grid-row: 5">五</span>
                  </div>
                  <div class="nux-cal-heat-grid" role="grid">
                    <button v-for="(c, i) in heatFlat" :key="i" type="button" class="nux-cal-heat-cell"
                            :class="c ? 'level-' + clampL(c.level) : 'empty'"
                            :disabled="!c" :title="heatTitle(c)" :aria-label="c ? c.date : null"
                            @click="c && $emit('date-select', c.date, c)"></button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <div v-if="legend" class="nux-cal-legend">
            <template v-if="mode === 'sequence'">
              <span class="lg"><em class="dot done"></em>已打</span>
              <span class="lg"><em class="dot frozen"></em>冻结</span>
              <span class="lg"><em class="dot mended"></em>补签</span>
              <span class="lg"><em class="dot missed"></em>未完成</span>
            </template>
            <template v-else>
              <span class="lg">少</span>
              <em class="sq level-0"></em><em class="sq level-1"></em><em class="sq level-2"></em><em class="sq level-3"></em><em class="sq level-4"></em>
              <span class="lg">多</span>
            </template>
          </div>
        </template>
      </div>
    `
  }

  window.NuxCalendar = NuxCalendar
})()
