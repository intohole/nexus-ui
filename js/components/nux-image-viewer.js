(function () {
    if (window.NuxImageViewer) return;
    if (!window.Vue) return;

    function normalize(list) {
        var out = [];
        var source = Array.isArray(list) ? list : [];
        for (var i = 0; i < source.length; i++) {
            var item = source[i];
            if (item && typeof item === 'object') {
                out.push({ src: item.src || '', title: item.title || '', thumb: item.thumb || item.src || '' });
            } else {
                out.push({ src: item ? String(item) : '', title: '', thumb: item ? String(item) : '' });
            }
        }
        return out;
    }

    var NuxImageViewer = {
        name: 'NuxImageViewer',
        props: {
            images: { type: Array, default: function () { return []; } },
            index: { type: Number, default: 0 },
            visible: { type: Boolean, default: false },
            downloadable: { type: Boolean, default: true }
        },
        emits: ['update:index', 'update:visible', 'close', 'download'],
        setup: function (props, ctx) {
            var zoomed = Vue.ref(false);

            var list = Vue.computed(function () { return normalize(props.images); });
            var total = Vue.computed(function () { return list.value.length; });
            var currentIndex = Vue.computed(function () {
                if (!total.value) return 0;
                var raw = Math.round(props.index);
                return Math.min(Math.max(isNaN(raw) ? 0 : raw, 0), total.value - 1);
            });
            var current = Vue.computed(function () { return list.value[currentIndex.value] || null; });

            function go(delta) {
                var next = currentIndex.value + delta;
                if (next < 0 || next >= total.value) return;
                zoomed.value = false;
                ctx.emit('update:index', next);
            }

            function close() {
                zoomed.value = false;
                ctx.emit('update:visible', false);
                ctx.emit('close');
            }

            function toggleZoom() {
                zoomed.value = !zoomed.value;
            }

            function download() {
                var image = current.value;
                if (!image || !image.src) return;
                ctx.emit('download', { index: currentIndex.value, image: image });
                var link = document.createElement('a');
                link.href = image.src;
                link.download = image.title || 'image';
                link.target = '_blank';
                link.rel = 'noopener';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            function onKeydown(event) {
                if (event.key === 'Escape') { close(); return; }
                if (event.key === 'ArrowLeft') { go(-1); return; }
                if (event.key === 'ArrowRight') { go(1); return; }
            }

            Vue.watch(function () { return props.visible; }, function (value) {
                if (value) window.addEventListener('keydown', onKeydown);
                else window.removeEventListener('keydown', onKeydown);
            });
            Vue.watch(function () { return props.index; }, function () { zoomed.value = false; });
            Vue.onBeforeUnmount(function () { window.removeEventListener('keydown', onKeydown); });
            if (props.visible) window.addEventListener('keydown', onKeydown);

            return {
                list: list,
                total: total,
                currentIndex: currentIndex,
                current: current,
                zoomed: zoomed,
                go: go,
                close: close,
                toggleZoom: toggleZoom,
                download: download
            };
        },
        template: `
            <teleport to="body">
                <transition name="nux-iv-fade">
                    <div v-if="visible && current" class="nux-iv" role="dialog" aria-modal="true" aria-label="图片预览" @click.self="close">
                        <div class="nux-iv-stage">
                            <img class="nux-iv-img" :class="{ 'is-zoomed': zoomed }" :src="current.src"
                                :alt="current.title || '图片预览'" @click="toggleZoom">
                        </div>
                        <button v-if="total > 1" type="button" class="nux-iv-nav is-prev"
                            :disabled="currentIndex <= 0" aria-label="上一张" @click.stop="go(-1)"></button>
                        <button v-if="total > 1" type="button" class="nux-iv-nav is-next"
                            :disabled="currentIndex >= total - 1" aria-label="下一张" @click.stop="go(1)"></button>
                        <div class="nux-iv-bar" @click.stop>
                            <span class="nux-iv-count">{{ currentIndex + 1 }} / {{ total }}</span>
                            <span v-if="current.title" class="nux-iv-title">{{ current.title }}</span>
                            <span class="nux-iv-tools">
                                <button type="button" class="nux-iv-btn" @click="toggleZoom">{{ zoomed ? '1x' : '2x' }}</button>
                                <button v-if="downloadable" type="button" class="nux-iv-btn" @click="download">下载</button>
                                <button type="button" class="nux-iv-btn is-close" @click="close">关闭</button>
                            </span>
                        </div>
                    </div>
                </transition>
            </teleport>
        `
    };

    if (window.Vue && Vue.component) {
        try { Vue.component('nux-image-viewer', NuxImageViewer); } catch (e) {}
    }

    window.NuxImageViewer = NuxImageViewer;
})();