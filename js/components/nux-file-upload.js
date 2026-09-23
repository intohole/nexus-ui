(function () {
    const STYLE_ID = 'nux-file-upload-style';
    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
.nfu{display:flex;flex-direction:column;gap:var(--nx-space-2,8px)}
.nfu-label{font-size:var(--nx-text-sm,14px);font-weight:500;color:var(--nx-text-heading,#0f172a)}
.nfu-drop{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--nx-space-1,4px);min-height:88px;padding:var(--nx-space-4,16px);border:1px dashed var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-md,10px);background:var(--nx-bg-surface,#fff);color:var(--nx-text-secondary,#64748b);font-size:var(--nx-text-sm,14px);text-align:center;cursor:pointer;transition:border-color var(--nx-transition-fast,.15s ease),background var(--nx-transition-fast,.15s ease)}
.nfu-drop:hover{border-color:var(--nx-border-hover,rgba(0,0,0,.15));background:var(--nx-bg-hover,#f1f5f9)}
.nfu-drop--over{border-color:var(--app-accent,#6366f1);background:rgba(var(--app-accent-rgb,99,102,241),.06);color:var(--app-accent,#6366f1)}
.nfu-drop--disabled{cursor:default;opacity:.6}
.nfu-input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden;clip:rect(0 0 0 0)}
.nfu-hint{font-size:var(--nx-text-xs,12px);color:var(--nx-text-muted,#94a3b8)}
.nfu-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--nx-space-2,8px)}
.nfu-item{display:flex;align-items:center;gap:var(--nx-space-3,12px);padding:var(--nx-space-2,8px);border:1px solid var(--nx-border,rgba(0,0,0,.08));border-radius:var(--nx-radius-sm,6px);background:var(--nx-bg-surface,#fff)}
.nfu-thumb{width:36px;height:36px;flex-shrink:0;border-radius:var(--nx-radius-sm,6px);object-fit:cover;background:var(--nx-bg-muted,#f1f5f9)}
.nfu-thumb--file{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;letter-spacing:.02em;color:var(--nx-text-secondary,#64748b)}
.nfu-meta{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.nfu-name{font-size:var(--nx-text-sm,14px);color:var(--nx-text-heading,#0f172a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nfu-size{font-size:var(--nx-text-xs,12px);color:var(--nx-text-muted,#94a3b8)}
.nfu-remove{flex-shrink:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:none;border-radius:var(--nx-radius-full,9999px);background:transparent;color:var(--nx-text-muted,#94a3b8);font-size:16px;line-height:1;cursor:pointer;transition:background var(--nx-transition-fast,.15s ease),color var(--nx-transition-fast,.15s ease)}
.nfu-remove:hover{background:rgba(var(--nx-danger-rgb,239,68,68),.1);color:var(--nx-danger,#ef4444)}
.nfu-remove:disabled{opacity:.5;cursor:default}
@media(hover:none) and (pointer:coarse){.nfu-drop{min-height:110px}.nfu-remove{width:44px;height:44px}}
`;
        document.head.appendChild(style);
    }
    ensureStyle();

    const NuxFileUpload = {
        name: 'NuxFileUpload',
        props: {
            modelValue: { type: Array, default: () => [] },
            multiple: { type: Boolean, default: false },
            accept: { type: String, default: '' },
            maxSizeMb: { type: Number, default: 0 },
            maxCount: { type: Number, default: 0 },
            disabled: { type: Boolean, default: false },
            label: { type: String, default: '' },
            hint: { type: String, default: '' },
            dragText: { type: String, default: '点击或拖拽文件到此处' }
        },
        emits: ['update:modelValue', 'change', 'remove', 'error'],
        setup(props, ctx) {
            const instance = Vue.getCurrentInstance();
            const uid = 'nfu-' + (instance ? instance.uid : Math.random().toString(36).slice(2));
            const inputRef = Vue.ref(null);
            const dragging = Vue.ref(false);
            const objectUrls = [];
            const previewMap = new Map();

            function extOf(name) {
                const dot = name.lastIndexOf('.');
                if (dot < 0 || dot === name.length - 1) return 'FILE';
                return name.slice(dot + 1).toUpperCase().slice(0, 4);
            }

            function previewUrl(file) {
                if (!file || typeof file !== 'object') return '';
                if (typeof file.url === 'string') return file.url;
                if (typeof file.preview === 'string') return file.preview;
                if (typeof URL === 'undefined' || typeof Blob === 'undefined' || !(file instanceof Blob)) return '';
                if (!/^image\//.test(file.type || '')) return '';
                if (previewMap.has(file)) return previewMap.get(file);
                const url = URL.createObjectURL(file);
                previewMap.set(file, url);
                objectUrls.push(url);
                return url;
            }

            const items = Vue.computed(() =>
                (props.modelValue || []).map((file, index) => {
                    const name = file && file.name ? String(file.name) : '文件 ' + (index + 1);
                    return {
                        name: name,
                        size: file && typeof file.size === 'number' ? file.size : 0,
                        url: previewUrl(file),
                        ext: extOf(name)
                    };
                })
            );

            function formatSize(bytes) {
                if (!bytes) return '0 B';
                if (bytes < 1024) return bytes + ' B';
                if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
                return (bytes / 1024 / 1024).toFixed(1) + ' MB';
            }

            function commit(next) {
                ctx.emit('update:modelValue', next);
                ctx.emit('change', next);
            }

            function addFiles(fileList) {
                if (props.disabled) return;
                const incoming = Array.prototype.slice.call(fileList || []);
                if (!incoming.length) return;
                const accepted = [];
                incoming.forEach((file) => {
                    if (props.maxSizeMb > 0 && file.size > props.maxSizeMb * 1024 * 1024) {
                        ctx.emit('error', '「' + file.name + '」超过 ' + props.maxSizeMb + 'MB 大小限制');
                        return;
                    }
                    accepted.push(file);
                });
                if (!accepted.length) return;
                let next = props.multiple
                    ? (props.modelValue || []).slice().concat(accepted)
                    : [accepted[accepted.length - 1]];
                if (props.maxCount > 0 && next.length > props.maxCount) {
                    next.slice(props.maxCount).forEach(() => {
                        ctx.emit('error', '最多只能上传 ' + props.maxCount + ' 个文件');
                    });
                    next = next.slice(0, props.maxCount);
                }
                commit(next);
            }

            function pick(event) {
                addFiles(event.target.files);
                if (inputRef.value) inputRef.value.value = '';
            }

            function remove(index) {
                if (props.disabled) return;
                const next = (props.modelValue || []).slice();
                const removed = next.splice(index, 1)[0];
                commit(next);
                ctx.emit('remove', removed, index);
            }

            function onDragOver(event) {
                if (props.disabled) return;
                event.preventDefault();
                dragging.value = true;
            }

            function onDragLeave(event) {
                if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) return;
                dragging.value = false;
            }

            function onDrop(event) {
                event.preventDefault();
                dragging.value = false;
                if (props.disabled) return;
                addFiles(event.dataTransfer ? event.dataTransfer.files : null);
            }

            Vue.onBeforeUnmount(() => {
                if (typeof URL !== 'undefined') objectUrls.forEach((url) => URL.revokeObjectURL(url));
                objectUrls.length = 0;
                previewMap.clear();
            });

            return { uid, inputRef, dragging, items, formatSize, pick, remove, onDragOver, onDragLeave, onDrop };
        },
        template: `
<div class="nfu">
    <label v-if="label" class="nfu-label" :for="uid">{{ label }}</label>
    <label class="nfu-drop" :class="{ 'nfu-drop--over': dragging, 'nfu-drop--disabled': disabled }"
        @dragover="onDragOver" @dragenter="onDragOver" @dragleave="onDragLeave" @drop="onDrop">
        <input :id="uid" ref="inputRef" class="nfu-input" type="file"
            :accept="accept" :multiple="multiple" :disabled="disabled" @change="pick" />
        <span>{{ dragText }}</span>
    </label>
    <span v-if="hint" class="nfu-hint">{{ hint }}</span>
    <ul v-if="items.length" class="nfu-list">
        <li v-for="(item, index) in items" :key="index" class="nfu-item">
            <img v-if="item.url" class="nfu-thumb" :src="item.url" :alt="item.name" />
            <span v-else class="nfu-thumb nfu-thumb--file" aria-hidden="true">{{ item.ext }}</span>
            <span class="nfu-meta">
                <span class="nfu-name" :title="item.name">{{ item.name }}</span>
                <span class="nfu-size">{{ formatSize(item.size) }}</span>
            </span>
            <button type="button" class="nfu-remove" :disabled="disabled"
                :aria-label="'删除 ' + item.name" @click="remove(index)">×</button>
        </li>
    </ul>
</div>
`
    };

    window.NuxFileUpload = NuxFileUpload;
})();
