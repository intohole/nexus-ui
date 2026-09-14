(function () {
    'use strict';
    const { ref, computed } = Vue;

    const UNITS = { minutes: '分钟', hours: '小时', days: '天' };
    const DOW = ['日', '一', '二', '三', '四', '五', '六'];

    function pad(n) { return String(n == null ? 0 : n).padStart(2, '0'); }

    function triggerText(type, cfg) {
        if (type === 'event') return '手动触发';
        const c = cfg || {};
        if (c.cron) {
            let head;
            if (c.cron.day) head = '每月 ' + c.cron.day + ' 日';
            else if (c.cron.day_of_week) {
                const d = String(c.cron.day_of_week).toLowerCase();
                head = '周' + DOW[['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].indexOf(d)] + '（每周）';
            } else head = '每天';
            return head + ' ' + pad(c.cron.hour) + ':' + pad(c.cron.minute);
        }
        const val = Number(c.value) || 1;
        if (c.at && (c.every || 'days') === 'days') return '每天 ' + c.at;
        return '每 ' + val + ' ' + (UNITS[c.every] || '天') + (c.at ? ' ' + c.at : '');
    }

    const NuxAutomation = {
        name: 'NuxAutomation',
        props: {
            rules: { type: Array, default: () => [] },
            templates: { type: Array, default: () => [] },
            triggerPresets: { type: Array, default: () => [] },
            loading: { type: Boolean, default: false }
        },
        emits: ['create', 'update', 'toggle', 'remove', 'run'],
        setup(props, { emit }) {
            const showForm = ref(false);
            const editing = ref(null);
            const form = ref({ name: '', action_type: '', action_config: {}, trigger_type: 'schedule', trigger_config: {} });
            const presetIdx = ref(0);
            const customTrigger = ref(false);

            const currentTemplate = computed(() => props.templates.find((t) => t.type === form.value.action_type) || null);

            function openCreate() {
                editing.value = null;
                resetForm();
                showForm.value = true;
            }

            function openEdit(rule) {
                const tpl = props.templates.find((t) => t.type === rule.action_type);
                editing.value = rule;
                form.value = {
                    name: rule.name,
                    icon: rule.icon || (tpl ? tpl.icon : '⚡'),
                    action_type: rule.action_type,
                    action_config: Object.assign({}, rule.action_config || {}),
                    trigger_type: rule.trigger_type || 'schedule',
                    trigger_config: Object.assign({}, rule.trigger_config || {})
                };
                customTrigger.value = true;
                showForm.value = true;
            }

            function resetForm() {
                form.value = { name: '', action_type: '', action_config: {}, trigger_type: 'schedule', trigger_config: {} };
                presetIdx.value = 0;
                customTrigger.value = false;
            }

            function pickTemplate(tpl) {
                form.value.action_type = tpl.type;
                form.value.name = tpl.label;
                form.value.icon = tpl.icon;
                form.value.action_config = Object.assign({}, tpl.default_config || {});
                if (tpl.default_trigger) {
                    form.value.trigger_config = Object.assign({}, tpl.default_trigger);
                    presetIdx.value = Math.max(0, props.triggerPresets.findIndex((p) => JSON.stringify(p.config) === JSON.stringify(tpl.default_trigger)));
                }
                customTrigger.value = false;
            }

            function pickPreset(p, i) {
                if (!p.config) return;
                presetIdx.value = i;
                customTrigger.value = false;
                form.value.trigger_config = Object.assign({}, p.config);
            }

            function save() {
                if (!form.value.action_type) { window.showToast && window.showToast('先选一个自动化动作', 'warning'); return; }
                if (!form.value.name.trim()) { window.showToast && window.showToast('给规则起个名字', 'warning'); return; }
                const payload = {
                    name: form.value.name.trim(),
                    icon: form.value.icon || '⚡',
                    action_type: form.value.action_type,
                    action_config: form.value.action_config,
                    trigger_type: form.value.trigger_type,
                    trigger_config: form.value.trigger_config
                };
                if (editing.value) {
                    const t = triggerText(payload.trigger_type, payload.trigger_config);
                    if (t === '手动触发') emit('update', editing.value.id, Object.assign({}, payload, { trigger_type: 'event', trigger_config: {} }));
                    else emit('update', editing.value.id, payload);
                } else {
                    emit('create', payload);
                }
                showForm.value = false;
            }

            function toggle(rule, enabled) {
                emit('toggle', rule, enabled);
            }

            return {
                showForm, editing, form, presetIdx, customTrigger, currentTemplate,
                triggerText, openCreate, openEdit, pickTemplate, pickPreset, save, toggle
            };
        },
        template: `
        <div class="nx-auto">
            <div v-if="loading" class="nx-auto-loading">
                <div class="nx-auto-skeleton" v-for="i in 2" :key="i"></div>
            </div>
            <template v-else>
                <div v-if="rules.length" class="nx-auto-list">
                    <div v-for="r in rules" :key="r.id" class="nx-auto-card">
                        <div class="nx-auto-card-head">
                            <span class="nx-auto-ico">{{ r.icon || '⚡' }}</span>
                            <div class="nx-auto-card-name">
                                <strong>{{ r.name }}</strong>
                                <span class="nx-auto-card-status" :class="r.enabled ? 'on' : 'off'">{{ r.enabled ? '启用中' : '已停用' }}</span>
                            </div>
                            <label class="nx-auto-switch">
                                <input type="checkbox" :checked="r.enabled" @change="toggle(r, $event.target.checked)">
                                <span></span>
                            </label>
                        </div>
                        <div class="nx-auto-flow">
                            <span class="nx-auto-flow-node nx-auto-trigger">⏱ {{ triggerText(r.trigger_type, r.trigger_config) }}</span>
                            <span class="nx-auto-flow-arrow">→</span>
                            <span class="nx-auto-flow-node nx-auto-action">{{ (templates.find(t => t.type === r.action_type) || {}).label || r.action_type }}</span>
                        </div>
                        <div v-if="r.last_run_at" class="nx-auto-card-meta">
                            <span :class="['nx-auto-dot', r.last_status === 'done' ? 'ok' : 'err']"></span>
                            上次：{{ r.last_run_at }} · {{ r.last_message || (r.last_status === 'done' ? '执行成功' : '执行失败') }}
                        </div>
                        <div class="nx-auto-card-actions">
                            <button class="nx-auto-act" @click="runRule(r)">立即执行</button>
                            <button class="nx-auto-act" @click="openEdit(r)">编辑</button>
                            <button class="nx-auto-act danger" @click="removeRule(r)">删除</button>
                        </div>
                    </div>
                </div>
                <div v-else class="nx-auto-empty">
                    <div class="nx-auto-empty-icon">⚡</div>
                    <h3>用自动化省点事</h3>
                    <p>临期提醒、借出归还、定期盘点，让格致主动替你把关。</p>
                </div>
                <button class="nx-auto-add" @click="openCreate">＋ 新建规则</button>
            </template>

            <teleport to="body">
                <transition name="nx-auto-fade">
                    <div v-if="showForm" class="nx-auto-modal-mask" @click.self="showForm = false"></div>
                </transition>
                <transition name="nx-auto-pop">
                    <div v-if="showForm" class="nx-auto-modal" role="dialog" aria-modal="true">
                        <div class="nx-auto-modal-head">
                            <h3>{{ editing ? '编辑规则' : '新建规则' }}</h3>
                            <button class="nx-auto-modal-close" @click="showForm = false">✕</button>
                        </div>
                        <div class="nx-auto-modal-body">
                            <template v-if="!form.action_type">
                                <p class="nx-auto-step-label">选择要自动做的事</p>
                                <div class="nx-auto-tpl-grid">
                                    <button v-for="t in templates" :key="t.type" class="nx-auto-tpl" @click="pickTemplate(t)">
                                        <span class="nx-auto-tpl-ico">{{ t.icon }}</span>
                                        <strong>{{ t.label }}</strong>
                                        <em>{{ t.description }}</em>
                                    </button>
                                </div>
                            </template>
                            <template v-else>
                                <div class="nx-auto-form-field">
                                    <label>规则名称</label>
                                    <input v-model="form.name" maxlength="20" placeholder="给这条规则起个名字" />
                                </div>
                                <div class="nx-auto-form-field">
                                    <label>什么时候</label>
                                    <div class="nx-auto-presets">
                                        <button v-for="(p, i) in triggerPresets" :key="i"
                                            :class="['nx-auto-preset', { active: !customTrigger && presetIdx === i }]"
                                            @click="pickPreset(p, i)">{{ p.label }}</button>
                                        <button :class="['nx-auto-preset', { active: customTrigger }]" @click="customTrigger = true">自定义…</button>
                                    </div>
                                    <div v-if="customTrigger" class="nx-auto-custom-trigger">
                                        <select v-model="form.trigger_config.every">
                                            <option value="days">每</option><option value="hours">每</option><option value="minutes">每</option>
                                        </select>
                                        <input v-model.number="form.trigger_config.value" type="number" min="1" max="90" style="width:72px" />
                                        <span class="nx-auto-custom-unit">{{ { minutes: '分钟', hours: '小时', days: '天' }[form.trigger_config.every] }}</span>
                                        <input v-model="form.trigger_config.at" type="time" style="width:110px" />
                                    </div>
                                </div>
                                <template v-if="currentTemplate && currentTemplate.fields && currentTemplate.fields.length">
                                    <div v-for="f in currentTemplate.fields" :key="f.key" class="nx-auto-form-field">
                                        <label>{{ f.label }}</label>
                                        <input v-if="f.kind === 'number'" v-model.number="form.action_config[f.key]"
                                            type="number" :min="f.min || 0" :max="f.max || 999" />
                                        <input v-else v-model="form.action_config[f.key]" :placeholder="f.placeholder || ''" maxlength="40" />
                                    </div>
                                </template>
                            </template>
                        </div>
                        <div class="nx-auto-modal-foot">
                            <button class="nx-auto-btn ghost" @click="showForm = false">取消</button>
                            <button v-if="form.action_type" class="nx-auto-btn primary" @click="save">{{ editing ? '保存修改' : '启用规则' }}</button>
                        </div>
                    </div>
                </transition>
            </teleport>
        </div>
        `
    };

    window.NuxAutomation = NuxAutomation;
})();