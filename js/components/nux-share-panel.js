(function () {
    if (window.NuxSharePanel) return;
    if (!window.Vue) return;

    var NuxSharePanel = {
        name: 'NuxSharePanel',
        props: {
            visible: { type: Boolean, default: false },
            url: { type: String, default: '' },
            title: { type: String, default: '分享' },
            showQrcode: { type: Boolean, default: true },
            enableText: { type: String, default: '开启分享' },
            enabled: { type: Boolean, default: false },
            busy: { type: Boolean, default: false },
            downloadText: { type: String, default: '' }
        },
        emits: ['update:visible', 'enable', 'copied', 'download', 'close'],
        computed: {
            canQrcode: function () {
                return !!(this.showQrcode && this.url && window.NuxQrcode);
            }
        },
        methods: {
            requestClose: function () {
                this.$emit('update:visible', false);
                this.$emit('close');
            },
            onCopied: function (text) {
                this.$emit('copied', text);
                if (window.NexusUtils && NexusUtils.showToast) NexusUtils.showToast('链接已复制', 'success');
            },
            copy: function () {
                var text = this.url;
                if (!text) return;
                if (window.NexusUtils && NexusUtils.copyToClipboard) {
                    NexusUtils.copyToClipboard(text).then(function (ok) {
                        if (ok) this.onCopied(text);
                    }.bind(this));
                    return;
                }
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(function () {
                        this.onCopied(text);
                    }.bind(this)).catch(function () {});
                }
            },
            selectInput: function (event) {
                if (event && event.target && event.target.select) event.target.select();
            }
        },
        template: `
            <teleport to="body">
                <transition name="nux-share-fade">
                    <div v-if="visible" class="nux-share-mask" @click.self="requestClose">
                        <div class="nux-share-panel" role="dialog" aria-modal="true" :aria-label="title">
                            <header class="nux-share-head">
                                <h3 class="nux-share-title">{{ title }}</h3>
                                <button type="button" class="nux-share-close" aria-label="关闭" @click="requestClose"></button>
                            </header>
                            <div v-if="!enabled" class="nux-share-off">
                                <p class="nux-share-off-text">分享后，任何拿到链接的人都可以查看</p>
                                <button type="button" class="nux-btn nux-btn--primary nux-btn--block"
                                    :disabled="busy" @click="$emit('enable')">{{ busy ? '…' : enableText }}</button>
                            </div>
                            <template v-else>
                                <div class="nux-share-link">
                                    <input class="nux-share-input" type="text" :value="url" readonly aria-label="分享链接" @focus="selectInput">
                                    <button type="button" class="nux-btn nux-btn--primary nux-share-copy" :disabled="!url" @click="copy">复制</button>
                                </div>
                                <div v-if="canQrcode" class="nux-share-qr">
                                    <nux-qrcode :value="url" :size="160" label="扫码打开"></nux-qrcode>
                                </div>
                                <div class="nux-share-actions">
                                    <button v-if="downloadText" type="button" class="nux-btn nux-btn--ghost" @click="$emit('download')">{{ downloadText }}</button>
                                    <button type="button" class="nux-btn nux-btn--ghost" @click="requestClose">关闭</button>
                                </div>
                            </template>
                        </div>
                    </div>
                </transition>
            </teleport>
        `
    };

    if (window.Vue && Vue.component) {
        try { Vue.component('nux-share-panel', NuxSharePanel); } catch (e) {}
    }

    window.NuxSharePanel = NuxSharePanel;
})();