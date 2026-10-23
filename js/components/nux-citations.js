(function() {
    const VERDICTS = {
        supported: { text: '有据', tone: 'success' },
        partial: { text: '部分支撑', tone: 'warning' },
        unsupported: { text: '缺乏支撑', tone: 'danger' }
    };

    const NuxCitations = {
        name: 'NuxCitations',
        props: {
            items: { type: Array, default: () => [] },
            title: { type: String, default: '参考来源' },
            collapsible: { type: Boolean, default: true }
        },
        data() {
            return { expanded: false };
        },
        computed: {
            visible() {
                if (!this.collapsible || this.expanded || this.items.length <= 3) return this.items;
                return this.items.slice(0, 3);
            },
            restCount() { return this.items.length - this.visible.length; }
        },
        methods: {
            verdict(item) { return VERDICTS[item.verdict] || null; },
            host(url) {
                if (!url) return '';
                try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
            },
            expandAll() { this.expanded = true; }
        },
        template: `
            <div class="nx-citations" v-if="items.length">
                <div class="nx-citations-head" v-if="title">{{ title }}</div>
                <ol class="nx-citations-list">
                    <li v-for="item in visible" :key="item.n || item.title" class="nx-citation">
                        <span class="nx-citation-n" aria-hidden="true">{{ item.n || '·' }}</span>
                        <div class="nx-citation-body">
                            <a v-if="item.url" class="nx-citation-title" :href="item.url" target="_blank" rel="noopener">{{ item.title }}</a>
                            <span v-else class="nx-citation-title">{{ item.title }}</span>
                            <span class="nx-citation-meta">
                                <span class="nx-citation-host" v-if="host(item.url)">{{ host(item.url) }}</span>
                                <span v-if="verdict(item)" :class="['nx-citation-verdict', 'nx-citation-verdict--' + verdict(item).tone]">{{ verdict(item).text }}</span>
                            </span>
                            <span class="nx-citation-note" v-if="item.note">{{ item.note }}</span>
                        </div>
                    </li>
                </ol>
                <button type="button" class="nx-citations-more" v-if="restCount > 0" @click="expandAll">展开其余 {{ restCount }} 条</button>
            </div>
        `
    };

    window.NuxCitations = NuxCitations;
})();
