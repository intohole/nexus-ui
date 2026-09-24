(function () {
    if (window.NuxIcon) return;
    if (!window.Vue) return;

    var ICONS = {
        'deck': ['M3.5 5h17v10.5h-17z', 'M12 15.5V21', 'M8.5 21h7', 'M7 9h10'],
        'doc': ['M6 3h7.5L18 7.5V21H6z', 'M13.5 3v4.5H18', 'M9 12h6', 'M9 16h4'],
        'sheet': ['M4 4.5h16v15H4z', 'M4 9.5h16', 'M4 14.5h16', 'M10 4.5v15', 'M15 4.5v15'],
        'chart': ['M3.5 3.5v17h17', 'M8 20.5v-6', 'M12.5 20.5v-10', 'M17 20.5v-4'],
        'poster': ['M4.5 3.5h15v17h-15z', 'M4.5 16.5l4-4 3 3 3-3 5 4.5', 'M15.5 7.5h.01'],
        'mindmap': ['M3 10h4v4H3z', 'M7 12h3.5', 'M10.5 6.5v11', 'M10.5 6.5h6.5', 'M10.5 12h6.5', 'M10.5 17.5h6.5', 'M17 5h4v3h-4z', 'M17 10.5h4v3h-4z', 'M17 16h4v3h-4z'],
        'report': ['M6 3h7.5L18 7.5V21H6z', 'M13.5 3v4.5H18', 'M9.5 17.5v-3', 'M12 17.5v-5.5', 'M14.5 17.5v-2'],
        'sparkle': ['M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8z', 'M18.5 15.5l.7 1.7 1.8.8-1.8.8-.7 1.7-.7-1.7-1.8-.8 1.8-.8z'],
        'magic': ['M4.5 19.5L15 9', 'M13.5 7.5l3 3', 'M5.5 4.5v3', 'M4 6h3', 'M17 14.5v3', 'M15.5 16h3'],
        'wand': ['M3.5 20.5L14 10', 'M12.5 8.5l4 4', 'M17 3.5v3.5', 'M15.25 5.25h3.5', 'M19.5 12v2.5', 'M18.25 13.25h2.5'],
        'share': ['M12 15.5V4', 'M8.5 7.5L12 4l3.5 3.5', 'M5 14H4v6.5h16V14h-1'],
        'download': ['M12 4v11', 'M8 11.5L12 15.5l4-4', 'M5 19.5h14'],
        'upload': ['M12 15.5v-11', 'M8 8.5L12 4.5l4 4', 'M5 19.5h14'],
        'edit': ['M4.5 19.5l.9-3.9L16.6 4.4a2.2 2.2 0 0 1 3.1 3.1L8.4 18.6z', 'M14.5 6.5l3 3'],
        'trash': ['M4.5 6.5h15', 'M9.5 6.5V4h5v2.5', 'M6.5 6.5l1 13.5h9l1-13.5', 'M10 10v6.5', 'M14 10v6.5'],
        'more': ['M6 12h.01', 'M12 12h.01', 'M18 12h.01'],
        'close': ['M6 6l12 12', 'M18 6L6 18'],
        'back': ['M19 12H5', 'M11 6l-6 6 6 6'],
        'chevron-left': ['M14.5 6.5L9 12l5.5 5.5'],
        'chevron-right': ['M9.5 6.5L15 12l-5.5 5.5'],
        'chevron-down': ['M6.5 9.5L12 15l5.5-5.5'],
        'check': ['M5 12.5l4.5 4.5L19 7'],
        'warning': ['M12 4.5L21 19.5H3z', 'M12 9.5v4.5', 'M12 17h.01'],
        'info': ['M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z', 'M12 11v5.5', 'M12 7.8h.01'],
        'search': ['M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z', 'M15.2 15.2L20 20'],
        'image': ['M4 5h16v14H4z', 'M4 16l4.5-4.5 3.5 3.5 3-3L20 16', 'M15.5 8.5h.01'],
        'refresh': ['M3.5 12a8.5 8.5 0 0 1 14.4-6.1', 'M20.5 3.5v5.5h-5.5', 'M20.5 12a8.5 8.5 0 0 1-14.4 6.1', 'M3.5 20.5V15h5.5'],
        'copy': ['M9 9h11v11H9z', 'M15 9V4H4v11h5'],
        'link': ['M10 14a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11.5 7', 'M14 10a4 4 0 0 0-5.7 0L5.7 12.6a4 4 0 1 0 5.7 5.7L12.5 17'],
        'qrcode': ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h2.5v2.5H14z', 'M19.5 14v6', 'M17 19.5h3'],
        'fullscreen': ['M4 9V4.5h5', 'M20 9V4.5h-5', 'M4 15v4.5h5', 'M20 15v4.5h-5'],
        'play': ['M8 5.5l10.5 6.5L8 18.5z'],
        'pause': ['M9.5 5.5v13', 'M14.5 5.5v13'],
        'user': ['M12 4.5a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5z', 'M4.5 20a7.5 7.5 0 0 1 15 0'],
        'plus': ['M12 5v14', 'M5 12h14'],
        'minus': ['M5 12h14'],
        'filter': ['M4 5.5h16l-6.2 7.4v6.1l-3.6-2.1v-4z'],
        'grid': ['M4 4.5h6.5V11H4z', 'M13.5 4.5H20V11h-6.5z', 'M4 13.5h6.5V20H4z', 'M13.5 13.5H20V20h-6.5z'],
        'list': ['M8.5 6.5h11.5', 'M8.5 12h11.5', 'M8.5 17.5h11.5', 'M4.5 6.5h.01', 'M4.5 12h.01', 'M4.5 17.5h.01'],
        'clock': ['M12 3.5a8.5 8.5 0 1 1 0 17 8.5 8.5 0 0 1 0-17z', 'M12 7.5V12l3 2'],
        'folder': ['M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9v9A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18z'],
        'star': ['M12 4l2.5 5.2 5.5.8-4 3.9.9 5.6-4.9-2.6-4.9 2.6.9-5.6-4-3.9 5.5-.8z'],
        'arrow-right': ['M4 12h15', 'M13.5 6.5L19 12l-5.5 5.5'],
        'external': ['M14 4.5h5.5V10', 'M19.5 4.5L11 13', 'M18 14v5.5H4.5V6h5.5'],
        'eye': ['M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z', 'M12 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z'],
        'empty-box': ['M3.5 8.5L12 4l8.5 4.5v7L12 20l-8.5-4.5z', 'M3.5 8.5L12 13l8.5-4.5', 'M12 13v7']
    };

    var FALLBACK = 'empty-box';

    var NuxIcon = {
        name: 'NuxIcon',
        props: {
            name: { type: String, required: true },
            size: { type: [Number, String], default: 18 },
            strokeWidth: { type: [Number, String], default: 1.7 },
            color: { type: String, default: '' },
            label: { type: String, default: '' }
        },
        emits: [],
        computed: {
            paths: function () {
                return ICONS[this.name] || ICONS[FALLBACK];
            },
            stroke: function () {
                return this.color || 'currentColor';
            }
        },
        template: `
            <svg class="nux-icon" :width="size" :height="size" viewBox="0 0 24 24"
                fill="none" :stroke="stroke" :stroke-width="strokeWidth"
                stroke-linecap="round" stroke-linejoin="round" focusable="false"
                :aria-hidden="label ? null : 'true'" :role="label ? 'img' : null" :aria-label="label || null">
                <path v-for="(d, i) in paths" :key="i" :d="d"></path>
            </svg>
        `
    };

    if (window.Vue && Vue.component) {
        try { Vue.component('nux-icon', NuxIcon); } catch (e) {}
    }

    window.NuxIcon = NuxIcon;
})();