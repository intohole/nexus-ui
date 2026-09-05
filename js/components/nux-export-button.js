(function() {
    if (window.NuxExportButton) return;
    if (!window.Vue) return;

    const NuxExportButton = {
        name: 'NuxExportButton',
        props: {
            label: { type: String, default: '导出' },
            loadingLabel: { type: String, default: '导出中…' },
            variant: { type: String, default: 'primary' },
            successMsg: { type: String, default: '导出成功' },
            handler: { type: Function, default: null }
        },
        data() {
            return { busy: false };
        },
        methods: {
            notify(message, type) {
                if (window.NexusApp && typeof window.NexusApp.notify === 'function') {
                    window.NexusApp.notify(message, type || 'success');
                } else if (window.NexusUtils && typeof window.NexusUtils.showToast === 'function') {
                    window.NexusUtils.showToast(message, type || 'success');
                } else if (window.ElementPlus && ElementPlus.ElMessage) {
                    try { ElementPlus.ElMessage({ message, type: type || 'success' }); } catch (e) {}
                }
            },
            triggerDownload(url, filename) {
                if (!url) return;
                if (filename) {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                } else {
                    window.open(url, '_blank');
                }
            },
            async run() {
                if (this.busy) return;
                this.busy = true;
                try {
                    if (typeof this.handler === 'function') {
                        const result = await this.handler();
                        const r = result || {};
                        if (r.downloadUrl) this.triggerDownload(r.downloadUrl, r.filename);
                        if (r.toast !== false) this.notify(r.message || this.successMsg, r.type || 'success');
                        return result;
                    }
                    this.notify(this.successMsg, 'success');
                } catch (e) {
                    const msg = (e && (e.message || e.detail)) || '导出失败，请重试';
                    this.notify(msg, 'error');
                } finally {
                    this.busy = false;
                }
            }
        },
        template: `
            <button type="button" class="nux-export-button" :disabled="busy" @click="run">
                <i v-if="busy" class="nux-export-spinner" aria-hidden="true"></i>
                <span>{{ busy ? loadingLabel : label }}</span>
            </button>
        `
    };

    if (window.Vue && Vue.component) {
        try { Vue.component('nux-export-button', NuxExportButton); } catch (e) {}
    }

    window.NuxExportButton = NuxExportButton;
})();