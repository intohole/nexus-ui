(function () {
    if (window.NuxWorkbench) return;
    if (!window.Vue) return;

    var COLUMNS = ['left-main', 'main-right', 'left-main-right', 'single'];

    var NuxWorkbench = {
        name: 'NuxWorkbench',
        props: {
            columns: { type: String, default: 'left-main-right' },
            height: { type: String, default: '' }
        },
        emits: [],
        methods: {
            modifier: function () {
                return 'nux-wb--' + (COLUMNS.indexOf(this.columns) >= 0 ? this.columns : 'left-main-right');
            },
            rootStyle: function () {
                return this.height ? { height: this.height } : null;
            },
            showLeft: function () {
                return this.columns.indexOf('left') >= 0 && !!this.$slots.left;
            },
            showRight: function () {
                return this.columns.indexOf('right') >= 0 && !!this.$slots.right;
            }
        },
        template: `
            <div class="nux-wb" :class="modifier()" :style="rootStyle()">
                <div v-if="$slots.toolbar" class="nux-wb-toolbar"><slot name="toolbar"></slot></div>
                <div class="nux-wb-body">
                    <aside v-if="showLeft()" class="nux-wb-left"><slot name="left"></slot></aside>
                    <section class="nux-wb-main"><slot name="main"><slot></slot></slot></section>
                    <aside v-if="showRight()" class="nux-wb-right"><slot name="right"></slot></aside>
                </div>
                <div v-if="$slots.footer" class="nux-wb-footer"><slot name="footer"></slot></div>
            </div>
        `
    };

    if (window.Vue && Vue.component) {
        try { Vue.component('nux-workbench', NuxWorkbench); } catch (e) {}
    }

    window.NuxWorkbench = NuxWorkbench;
})();