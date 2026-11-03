(function() {
    const NuxTableColumn = {
        name: 'NuxTableColumn',
        props: {
            label: { type: String, default: '' },
            prop: { type: String, default: '' },
            width: { type: [String, Number], default: '' },
            minWidth: { type: [String, Number], default: '' },
            fixed: { type: String, default: '' }
        },
        render() { return null; }
    };
    window.NuxTableColumn = NuxTableColumn;
})();
