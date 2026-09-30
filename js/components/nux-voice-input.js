(function () {
    'use strict';

    const { ref, computed, onBeforeUnmount } = Vue;

    function encodeWav(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        const writeStr = (offset, s) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
        writeStr(0, 'RIFF'); view.setUint32(4, 36 + samples.length * 2, true); writeStr(8, 'WAVE');
        writeStr(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true); view.setUint16(34, 16, true);
        writeStr(36, 'data'); view.setUint32(40, samples.length * 2, true);
        let offset = 44;
        for (let i = 0; i < samples.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        return new Blob([view], { type: 'audio/wav' });
    }

    function mergeChunks(chunks) {
        let total = 0;
        chunks.forEach((c) => { total += c.length; });
        const out = new Float32Array(total);
        let offset = 0;
        chunks.forEach((c) => { out.set(c, offset); offset += c.length; });
        return out;
    }

    function downsample(samples, fromRate, toRate) {
        if (toRate >= fromRate) return samples;
        const ratio = fromRate / toRate;
        const length = Math.floor(samples.length / ratio);
        const out = new Float32Array(length);
        for (let i = 0; i < length; i++) {
            const pos = i * ratio;
            const idx = Math.floor(pos);
            const frac = pos - idx;
            const a = samples[idx] || 0;
            const b = samples[idx + 1] || a;
            out[i] = a + (b - a) * frac;
        }
        return out;
    }

    const NuxVoiceInput = {
        name: 'NuxVoiceInput',
        props: {
            transcribeUrl: { type: String, default: '' },
            handler: { type: Function, default: null },
            apiInstance: { type: Object, default: null },
            disabled: { type: Boolean, default: false },
            maxSeconds: { type: Number, default: 60 },
            fieldName: { type: String, default: 'file' },
            size: { type: String, default: 'md' }
        },
        emits: ['result', 'error', 'state-change'],
        setup(props, ctx) {
            const state = ref('idle');
            const seconds = ref(0);
            let audioCtx = null, mediaStream = null, processor = null, sourceNode = null, timer = null;
            let chunks = [], captureRate = 16000;

            const isRecording = computed(() => state.value === 'recording');
            const isBusy = computed(() => state.value === 'transcribing');
            const label = computed(() => {
                if (state.value === 'recording') return '0:' + String(seconds.value).padStart(2, '0');
                if (state.value === 'transcribing') return '识别中';
                return '';
            });

            function setState(s) { state.value = s; ctx.emit('state-change', s); }

            function cleanupAudio() {
                clearInterval(timer); timer = null;
                if (processor) { processor.onaudioprocess = null; try { processor.disconnect(); } catch (e) {} processor = null; }
                if (sourceNode) { try { sourceNode.disconnect(); } catch (e) {} sourceNode = null; }
                if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; }
                if (audioCtx) { try { audioCtx.close(); } catch (e) {} audioCtx = null; }
            }

            async function start() {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    fail('当前浏览器不支持语音输入'); return;
                }
                try {
                    mediaStream = await navigator.mediaDevices.getUserMedia({
                        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
                    });
                } catch (e) {
                    fail('需要麦克风权限才能使用语音输入'); return;
                }
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                captureRate = audioCtx.sampleRate;
                sourceNode = audioCtx.createMediaStreamSource(mediaStream);
                processor = audioCtx.createScriptProcessor(4096, 1, 1);
                chunks = [];
                processor.onaudioprocess = (e) => { chunks.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
                sourceNode.connect(processor);
                processor.connect(audioCtx.destination);
                seconds.value = 0;
                timer = setInterval(() => {
                    seconds.value++;
                    if (seconds.value >= props.maxSeconds) { stop(true); }
                }, 1000);
                setState('recording');
            }

            async function stop(auto) {
                if (state.value !== 'recording') return;
                cleanupAudio();
                const merged = mergeChunks(chunks); chunks = [];
                const rate = captureRate;
                if (!merged.length || merged.length < rate * 0.3) {
                    setState('idle');
                    if (!auto) fail('说话时间太短');
                    return;
                }
                setState('transcribing');
                try {
                    const blob = encodeWav(downsample(merged, rate, 16000), 16000);
                    const text = props.handler ? await props.handler(blob, {}) : await upload(blob);
                    setState('idle');
                    ctx.emit('result', { text: String(text || '').trim(), duration: Math.round(merged.length / rate) });
                } catch (e) {
                    fail((e && e.message) || '语音识别失败，请重试');
                }
            }

            async function upload(blob) {
                const api = props.apiInstance || (window.NexusApi ? new NexusApi() : null);
                if (!api || !props.transcribeUrl) throw new Error('未配置语音转写接口');
                const res = await api.uploadFile(props.transcribeUrl, blob, { fieldName: props.fieldName, filename: 'voice.wav' });
                const data = res && res.code === 200 && res.data ? res.data : (res || {});
                if (data.success === false) throw new Error(data.detail || '语音识别失败');
                return data.text || '';
            }

            function fail(msg) {
                cleanupAudio();
                setState('idle');
                ctx.emit('error', msg);
                if (window.NexusUtils && NexusUtils.toast) NexusUtils.toast(msg, 'error');
            }

            function toggle() {
                if (props.disabled || state.value === 'transcribing') return;
                if (state.value === 'recording') stop(false);
                else start();
            }

            onBeforeUnmount(cleanupAudio);

            return { state, seconds, label, isRecording, isBusy, toggle };
        },
        template: [
            '<button type="button" class="nvi-btn" :class="{ \'nvi-btn--recording\': isRecording, \'nvi-btn--busy\': isBusy }"',
            '    :disabled="disabled || isBusy" :aria-label="isRecording ? \'停止录音\' : \'语音输入\'" @click="toggle">',
            '    <span v-if="isRecording" class="nvi-pulse" aria-hidden="true"></span>',
            '    <svg v-if="!isRecording && !isBusy" class="nvi-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
            '        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>',
            '        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line>',
            '    </svg>',
            '    <span v-else-if="isRecording" class="nvi-rec-dot" aria-hidden="true"></span>',
            '    <span v-else class="nvi-spinner" aria-hidden="true"></span>',
            '    <span v-if="label" class="nvi-label">{{ label }}</span>',
            '</button>'
        ].join('')
    };

    function ensureStyle() {
        if (!(window.NexusUtils && NexusUtils.injectStyle)) return;
        NexusUtils.injectStyle('nux-voice-input', [
            '.nvi-btn{display:inline-flex;align-items:center;gap:5px;padding:0 10px;height:34px;border:none;border-radius:999px;',
                'background:var(--nx-bg-muted,#f1f5f9);color:var(--nx-text-secondary,#64748b);cursor:pointer;font-size:12px;',
                'font-variant-numeric:tabular-nums;transition:background .2s,color .2s;position:relative;flex-shrink:0}',
            '.nvi-btn:hover{background:var(--nx-bg-active,#e2e8f0);color:var(--nx-text-body,#334155)}',
            '.nvi-btn:disabled{opacity:.5;cursor:not-allowed}',
            '.nvi-btn--recording{background:rgba(var(--nx-danger-rgb,239,68,68),.12);color:var(--nx-danger,#ef4444)}',
            '.nvi-btn--recording:hover{background:rgba(var(--nx-danger-rgb,239,68,68),.18)}',
            '.nvi-btn--busy{background:var(--nx-bg-muted,#f1f5f9);color:var(--nx-text-muted,#94a3b8)}',
            '.nvi-icon{display:block}',
            '.nvi-rec-dot{width:10px;height:10px;border-radius:50%;background:var(--nx-danger,#ef4444);animation:nvi-blink 1s ease-in-out infinite}',
            '.nvi-pulse{position:absolute;inset:0;border-radius:999px;border:2px solid rgba(var(--nx-danger-rgb,239,68,68),.5);animation:nvi-pulse 1.6s ease-out infinite;pointer-events:none}',
            '.nvi-spinner{width:12px;height:12px;border-radius:50%;border:2px solid var(--nx-border,rgba(0,0,0,.1));border-top-color:var(--nx-primary,#2563eb);animation:nvi-spin .8s linear infinite}',
            '.nvi-label{line-height:1}',
            '@keyframes nvi-blink{0%,100%{opacity:1}50%{opacity:.35}}',
            '@keyframes nvi-pulse{0%{transform:scale(1);opacity:1}100%{transform:scale(1.25);opacity:0}}',
            '@keyframes nvi-spin{to{transform:rotate(360deg)}}',
            '.nvi-btn--sm{height:28px;padding:0 8px;font-size:11px}',
            '@media(prefers-reduced-motion:reduce){.nvi-rec-dot,.nvi-pulse,.nvi-spinner{animation:none}}'
        ]);
    }
    ensureStyle();

    window.NuxVoiceInput = NuxVoiceInput;
})();
