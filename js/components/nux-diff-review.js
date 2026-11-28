(function () {
    'use strict';

    // 解析 unified diff 文本 → files[]。业务可直接喂 git diff / 工具产物原文。
    // 输入宽容：整体字符串、[{file, patch}]、已结构化 [{file, hunks}] 三态均收。
    // git diff 字段序=diff --git → new file mode → index → ---/+++（created 旗标先行于文件名出现）。
    function parseUnified(text) {
        var files = [];
        var cur = null;
        var hunk = null;
        var newFile = false;
        var lines = String(text == null ? '' : text).split(/\r?\n/);
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.indexOf('diff --git ') === 0) {
                cur = null;
                hunk = null;
                newFile = false;
                continue;
            }
            if (line.indexOf('new file mode') === 0) { newFile = true; continue; }
            if (line.indexOf('deleted file mode') === 0) { newFile = false; continue; }
            if (line.indexOf('--- ') === 0 || line.indexOf('+++ ') === 0) {
                var p = line.slice(4).split('\t')[0];
                if (p && p !== '/dev/null') {
                    var name = p.replace(/^(a|b)\//, '');
                    if (!cur) {
                        cur = { file: name, hunks: [], created: newFile };
                        files.push(cur);
                    } else if (!cur.file) {
                        cur.file = name;
                    }
                    hunk = null;
                } else if (p === '/dev/null') {
                    if (line.indexOf('--- ') === 0) newFile = true;
                    else if (cur) cur.deleted = true;
                }
                continue;
            }
            if (line.indexOf('index ') === 0 || line.indexOf('similarity ') === 0 || line.indexOf('rename ') === 0) continue;
            if (line.indexOf('@@') === 0) {
                if (!cur) {
                    cur = { file: '', hunks: [], created: false };
                    files.push(cur);
                }
                hunk = { header: line, lines: [], adds: 0, dels: 0 };
                cur.hunks.push(hunk);
                continue;
            }
            if (!hunk) continue;
            if (line.charAt(0) === '+') { hunk.lines.push({ type: 'add', text: line.slice(1) }); hunk.adds++; }
            else if (line.charAt(0) === '-') { hunk.lines.push({ type: 'del', text: line.slice(1) }); hunk.dels++; }
            else if (line.charAt(0) === ' ' || line === '') { hunk.lines.push({ type: 'ctx', text: line.slice(1) }); }
            else if (line.charAt(0) === '\\') { hunk.lines.push({ type: 'meta', text: line }); }
        }
        return files;
    }

    function normalizeFiles(input) {
        if (input == null || input === '') return [];
        if (typeof input === 'string') return parseUnified(input);
        if (!Array.isArray(input)) return [];
        return input.map(function (f) {
            if (typeof f === 'string') {
                var parsedList = parseUnified(f);
                var firstFile = parsedList[0];
                return {
                    file: firstFile ? firstFile.file : '',
                    hunks: parsedList.reduce(function (acc, pf) { return acc.concat(pf.hunks); }, [])
                };
            }
            if (f && typeof f.patch === 'string') {
                var parsed = parseUnified(f.patch);
                var first = parsed[0];
                return {
                    file: f.file || f.path || (first ? first.file : ''),
                    created: !!(f.created || (first && first.created)),
                    hunks: (first ? first.hunks : [])
                };
            }
            return {
                file: f.file || f.path || '',
                created: !!f.created,
                hunks: Array.isArray(f.hunks) ? f.hunks.map(function (h) {
                    return {
                        header: h.header || '',
                        lines: (h.lines || []).map(function (l) {
                            if (typeof l === 'string') {
                                var c = l.charAt(0);
                                return { type: c === '+' ? 'add' : (c === '-' ? 'del' : 'ctx'), text: l.slice(1) };
                            }
                            return { type: l.type === 'add' || l.type === 'del' ? l.type : 'ctx', text: String(l.text == null ? '' : l.text) };
                        })
                    };
                }) : []
            };
        }).map(function (f, i) {
            f.hunks.forEach(function (h) {
                h.adds = h.lines.filter(function (l) { return l.type === 'add'; }).length;
                h.dels = h.lines.filter(function (l) { return l.type === 'del'; }).length;
            });
            if (!f.file) f.file = 'file-' + (i + 1);
            return f;
        });
    }

    function hunkKey(fi, hi) { return 'f' + fi + 'h' + hi; }

    var NuxDiffReview = {
        name: 'NuxDiffReview',
        props: {
            files: { type: [Array, String], default: function () { return []; } },
            title: { type: String, default: '变更审查' },
            approvable: { type: Boolean, default: true },
            collapsible: { type: Boolean, default: true },
            state: { type: String, default: 'reviewing' },
            disabled: { type: Boolean, default: false }
        },
        emits: ['decide'],
        data: function () {
            return { decisions: {}, expanded: {}, decided: false };
        },
        computed: {
            normalizedState: function () {
                var s = String(this.state || '').toLowerCase();
                if (s === 'approved' || s === 'accepted') return 'approved';
                if (s === 'rejected' || s === 'declined') return 'rejected';
                return 'reviewing';
            },
            views: function () {
                var self = this;
                return normalizeFiles(this.files).map(function (f, fi) {
                    var adds = 0, dels = 0;
                    var hunks = (f.hunks || []).map(function (h, hi) {
                        adds += h.adds || 0;
                        dels += h.dels || 0;
                        return {
                            key: hunkKey(fi, hi),
                            header: h.header || ('块 ' + (hi + 1)),
                            lines: h.lines || [],
                            adds: h.adds || 0,
                            dels: h.dels || 0
                        };
                    });
                    return {
                        key: 'f' + fi,
                        file: f.file || ('file-' + (fi + 1)),
                        created: !!f.created,
                        hunks: hunks,
                        adds: adds,
                        dels: dels,
                        decidedCount: hunks.filter(function (h) { return self.decisions[h.key]; }).length
                    };
                });
            },
            decidedKeys: function () {
                var self = this;
                return Object.keys(this.decisions).filter(function (k) { return self.decisions[k]; });
            },
            decidedCount: function () { return this.decidedKeys.length; },
            totalHunks: function () {
                return this.views.reduce(function (n, f) { return n + f.hunks.length; }, 0);
            },
            isReviewing: function () { return this.normalizedState === 'reviewing' && !this.decided && !this.disabled; },
            statsLine: function () {
                var adds = this.views.reduce(function (n, f) { return n + f.adds; }, 0);
                var dels = this.views.reduce(function (n, f) { return n + f.dels; }, 0);
                return { adds: adds, dels: dels };
            }
        },
        methods: {
            isOpen: function (key) { return !this.collapsible || !!this.expanded[key]; },
            toggle: function (key) {
                if (!this.collapsible) return;
                this.expanded[key] = !this.expanded[key];
            },
            decideHunk: function (key, verdict) {
                if (!this.isReviewing) return;
                if (this.decisions[key] === verdict) delete this.decisions[key];
                else this.decisions[key] = verdict;
            },
            decideAll: function (action) {
                if (!this.isReviewing) return;
                var self = this;
                var byFile = this.views.map(function (f) {
                    return {
                        file: f.file,
                        hunkIds: self.decidedCount
                            ? f.hunks.filter(function (h) { return self.decisions[h.key]; }).map(function (h) { return h.key; })
                            : f.hunks.map(function (h) { return h.key; })
                    };
                }).filter(function (x) { return x.hunkIds.length; });
                this.decided = true;
                this.$emit('decide', {
                    action: action,
                    scope: this.decidedCount ? 'hunk' : 'all',
                    files: byFile
                });
            },
            verdictClass: function (key) {
                return this.decisions[key] ? 'is-' + this.decisions[key] : '';
            }
        },
        template: `
            <section class="nx-diff" :data-nux-diff="'1'" :data-state="isReviewing ? 'reviewing' : normalizedState" aria-label="变更审查">
                <header class="nx-diff-head">
                    <span class="nx-diff-title">{{ title }}</span>
                    <span class="nx-diff-stats"><b class="is-add">+{{ statsLine.adds }}</b><b class="is-del">-{{ statsLine.dels }}</b><i>{{ totalHunks }} 块</i></span>
                </header>
                <div v-for="f in views" :key="f.key" class="nx-diff-file">
                    <div class="nx-diff-file-head">
                        <span class="nx-diff-file-name">{{ f.file }}<i v-if="f.created" class="nx-diff-file-tag">新建</i></span>
                        <span class="nx-diff-stats"><b class="is-add">+{{ f.adds }}</b><b class="is-del">-{{ f.dels }}</b></span>
                    </div>
                    <div v-for="h in f.hunks" :key="h.key" class="nx-diff-hunk" :class="verdictClass(h.key)">
                        <div class="nx-diff-hunk-head">
                            <code class="nx-diff-hunk-header">{{ h.header }}</code>
                            <span v-if="isReviewing" class="nx-diff-hunk-actions">
                                <button type="button" class="nx-diff-hunk-btn is-approve" :class="{ 'is-on': decisions[h.key] === 'approve' }" :aria-pressed="decisions[h.key] === 'approve' ? 'true' : 'false'" title="采纳此块" @click="decideHunk(h.key, 'approve')">✓</button>
                                <button type="button" class="nx-diff-hunk-btn is-reject" :class="{ 'is-on': decisions[h.key] === 'reject' }" :aria-pressed="decisions[h.key] === 'reject' ? 'true' : 'false'" title="驳回此块" @click="decideHunk(h.key, 'reject')">✕</button>
                            </span>
                            <span v-else-if="decisions[h.key]" class="nx-diff-hunk-verdict" :class="'is-' + decisions[h.key]">{{ decisions[h.key] === 'approve' ? '已采纳' : '已驳回' }}</span>
                        </div>
                        <div class="nx-diff-body" :class="{ 'is-collapsed': collapsible && !expanded[h.key] && h.lines.length > 12 }">
                            <pre class="nx-diff-code"><code><span v-for="(l, li) in h.lines" :key="li" class="nx-diff-line" :class="'is-' + l.type"><i class="nx-diff-gutter" aria-hidden="true"></i>{{ l.text }}</span></code></pre>
                            <button v-if="collapsible && h.lines.length > 12" type="button" class="nx-diff-expand" :aria-expanded="expanded[h.key] ? 'true' : 'false'" @click="toggle(h.key)">{{ expanded[h.key] ? '收起' : '展开全部 ' + h.lines.length + ' 行' }}</button>
                        </div>
                    </div>
                </div>
                <footer v-if="approvable" class="nx-diff-foot" :class="{ 'is-resolved': !isReviewing }">
                    <template v-if="isReviewing">
                        <span class="nx-diff-foot-hint">{{ decidedCount ? '已标记 ' + decidedCount + '/' + totalHunks + ' 块' : '未标记则作用于全部 ' + totalHunks + ' 块' }}</span>
                        <span class="nx-diff-foot-actions">
                            <button type="button" class="nx-diff-btn is-reject" @click="decideAll('reject')">驳回</button>
                            <button type="button" class="nx-diff-btn is-approve" @click="decideAll('approve')">采纳</button>
                        </span>
                    </template>
                    <template v-else>
                        <span class="nx-diff-foot-hint">{{ (normalizedState === 'approved' || decided) ? '已采纳' : '已驳回' }}<template v-if="decidedCount">（{{ decidedCount }} 块）</template></span>
                    </template>
                </footer>
            </section>
        `
    };

    // 消息内 widget 型注册（type=diff）：decide 动作翻译进白名单动词
    // approve→confirm / reject→cancel，零改动 nux-ai-widgets 分发器。
    var registry = window.NuxAiWidgetsRegistry || (window.NuxAiWidgetsRegistry = {});
    registry.types = registry.types || {};
    registry.icons = registry.icons || {};
    if (!registry.register) {
        registry.register = function (type, def, icon) {
            registry.types[type] = def;
            if (icon) registry.icons[type] = icon;
        };
    }
    registry.register('diff', {
        name: 'NuxDiffWidget',
        components: { 'nux-diff-review': NuxDiffReview },
        props: { data: { type: Object, default: function () { return {}; } } },
        emits: ['confirm', 'cancel'],
        methods: {
            onDecide: function (d) {
                this.$emit(d.action === 'approve' ? 'confirm' : 'cancel', d);
            }
        },
        template: `<nux-diff-review :files="data.files != null ? data.files : data" :title="data.title || '变更审查'"
            :approvable="data.approvable !== false" :collapsible="data.collapsible !== false"
            :state="data.state || 'reviewing'" :disabled="data.disabled === true"
            @decide="onDecide"></nux-diff-review>`
    }, '📝');

    NuxDiffReview.parse = parseUnified;
    window.NuxDiffReview = NuxDiffReview;
})();
