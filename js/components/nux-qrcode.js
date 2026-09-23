(function () {
    const STYLE_ID = 'nux-qrcode-style';
    const CDN_URL = 'https://registry.npmmirror.com/qrcodejs/1.0.0/files/qrcode.min.js';
    const LEVELS = { L: 1, M: 0, Q: 3, H: 2 };

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
.nq{display:inline-flex;flex-direction:column;align-items:center;gap:var(--nx-space-2,8px);max-width:100%}
.nq-code{display:block;line-height:0;border-radius:var(--nx-radius-sm,6px);overflow:hidden}
.nq-code img,.nq-code canvas{display:block;max-width:100%;height:auto}
.nq-fallback{display:flex;align-items:center;justify-content:center;box-sizing:border-box;border:1px dashed var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-sm,6px);background:var(--nx-bg-muted,#f1f5f9);color:var(--nx-text-muted,#94a3b8);font-size:var(--nx-text-sm,14px)}
.nq-label{font-size:var(--nx-text-sm,14px);color:var(--nx-text-secondary,#64748b);text-align:center;word-break:break-all;max-width:100%}
`;
        document.head.appendChild(style);
    }
    ensureStyle();

    let loaderPromise = null;
    function loadQrcode() {
        if (window.QRCode) return Promise.resolve(window.QRCode);
        if (loaderPromise) return loaderPromise;
        loaderPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = CDN_URL;
            script.async = true;
            script.onload = () => {
                if (window.QRCode) {
                    resolve(window.QRCode);
                    return;
                }
                loaderPromise = null;
                reject(new Error('二维码组件未就绪'));
            };
            script.onerror = () => {
                loaderPromise = null;
                reject(new Error('二维码加载失败'));
            };
            document.head.appendChild(script);
        });
        return loaderPromise;
    }

    const NuxQrcode = {
        name: 'NuxQrcode',
        props: {
            value: { type: String, default: '' },
            size: { type: Number, default: 180 },
            color: { type: String, default: '#0f172a' },
            bgColor: { type: String, default: '#ffffff' },
            level: { type: String, default: 'M' },
            label: { type: String, default: '' },
            alt: { type: String, default: '二维码' }
        },
        emits: ['ready', 'error'],
        setup(props, ctx) {
            const hostRef = Vue.ref(null);
            const failed = Vue.ref(false);
            let token = 0;

            function clear() {
                if (hostRef.value) hostRef.value.innerHTML = '';
            }

            function render() {
                const host = hostRef.value;
                if (!host) return;
                const current = ++token;
                clear();
                failed.value = false;
                if (!props.value) return;
                loadQrcode().then((QRCode) => {
                    if (current !== token || !hostRef.value) return;
                    const level = LEVELS[String(props.level || '').toUpperCase()];
                    new QRCode(hostRef.value, {
                        text: props.value,
                        width: props.size,
                        height: props.size,
                        colorDark: props.color,
                        colorLight: props.bgColor,
                        correctLevel: level === undefined ? LEVELS.M : level
                    });
                    ctx.emit('ready');
                }).catch((err) => {
                    if (current !== token) return;
                    clear();
                    failed.value = true;
                    ctx.emit('error', err);
                });
            }

            Vue.onMounted(render);
            Vue.watch(() => [props.value, props.size, props.color, props.bgColor, props.level], render);
            Vue.onBeforeUnmount(() => {
                token++;
                clear();
            });

            return { hostRef, failed, render };
        },
        template: `
<div class="nq" data-nux-qrcode role="img" :aria-label="alt"
    :style="{ width: size + 'px', maxWidth: '100%' }">
    <div ref="hostRef" class="nq-code" aria-hidden="true" v-show="!failed"
        :style="{ width: size + 'px', height: size + 'px', maxWidth: '100%' }"></div>
    <div v-if="failed" class="nq-fallback"
        :style="{ width: size + 'px', height: size + 'px', maxWidth: '100%' }">二维码加载失败</div>
    <div v-if="label" class="nq-label">{{ label }}</div>
</div>
`
    };

    window.NuxQrcode = NuxQrcode;
})();
