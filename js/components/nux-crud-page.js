(function () {
    const NuxCrudPage = {
        name: 'NuxCrudPage',
        props: {
            api: { type: Object, required: true },
            basePath: { type: String, required: true },
            columns: { type: Array, default: () => [] },
            formFields: { type: Array, default: () => [] },
            idField: { type: String, default: 'id' },
            searchPlaceholder: { type: String, default: '搜索' },
            pageSize: { type: Number, default: 20 },
            canCreate: { type: Boolean, default: true },
            canEdit: { type: Boolean, default: true },
            canDelete: { type: Boolean, default: true }
        },
        emits: ['created', 'updated', 'removed', 'error'],
        data() {
            return {
                items: [],
                total: 0,
                page: 1,
                totalPages: 1,
                loading: false,
                search: '',
                modalVisible: false,
                editingId: null,
                formData: {}
            };
        },
        computed: {
            crud() {
                return window.createNexusCrud({ api: this.api, basePath: this.basePath, idField: this.idField });
            },
            modalTitle() {
                return this.editingId === null ? '新增' : '编辑';
            },
            hasNext() { return this.page < this.totalPages; },
            hasPrev() { return this.page > 1; }
        },
        watch: {
            modalVisible(v) {
                if (v) return;
                this.editingId = null;
                this.formData = {};
            }
        },
        methods: {
            async load() {
                this.loading = true;
                try {
                    const res = await this.crud.list({ page: this.page, pageSize: this.pageSize, search: this.search });
                    this.items = res.items || [];
                    this.total = res.total || 0;
                    this.totalPages = Math.max(1, Math.ceil(this.total / this.pageSize));
                } catch (e) {
                    this.$emit('error', e);
                } finally {
                    this.loading = false;
                }
            },
            onSearch(keyword) {
                this.search = keyword || '';
                this.page = 1;
                this.load();
            },
            onPrev() { if (this.hasPrev) { this.page--; this.load(); } },
            onNext() { if (this.hasNext) { this.page++; this.load(); } },
            openCreate() {
                this.editingId = null;
                this.formData = {};
                this.formFields.forEach(f => { if (f.default !== undefined) this.formData[f.key] = f.default; });
                this.modalVisible = true;
            },
            openEdit(row) {
                this.editingId = row[this.idField];
                this.formData = {};
                this.formFields.forEach(f => { this.formData[f.key] = row[f.key]; });
                this.modalVisible = true;
            },
            onRowClick(row) {
                if (this.canEdit) this.openEdit(row);
            },
            async submit() {
                try {
                    const payload = {};
                    this.formFields.forEach(f => { payload[f.key] = this.formData[f.key]; });
                    if (this.editingId === null) {
                        await this.crud.create(payload);
                        this.$emit('created', payload);
                    } else {
                        await this.crud.update(this.editingId, payload);
                        this.$emit('updated', { id: this.editingId, ...payload });
                    }
                    this.modalVisible = false;
                    this.load();
                } catch (e) {
                    this.$emit('error', e);
                }
            },
            async remove(row) {
                const ok = window.NexusUtils && window.NexusUtils.confirm
                    ? await window.NexusUtils.confirm('确认删除该记录？', '删除确认', { type: 'warning' })
                    : window.confirm('确认删除该记录？');
                if (!ok) return;
                try {
                    await this.crud.remove(row[this.idField]);
                    this.$emit('removed', row);
                    this.load();
                } catch (e) {
                    this.$emit('error', e);
                }
            }
        },
        mounted() {
            this.load();
        },
        template: `
            <div class="nux-crud-page">
                <div class="nux-crud-toolbar">
                    <nux-search-box v-model="search" :placeholder="searchPlaceholder" @search="onSearch" />
                    <button v-if="canCreate" type="button" class="nux-btn nux-btn--primary nux-btn--sm" @click="openCreate">新增</button>
                </div>
                <nux-data-table :columns="columns" :items="items" :loading="loading" @row-click="onRowClick" />
                <div class="nux-crud-footer">
                    <nux-pagination :page="page" :total-pages="totalPages" :has-prev="hasPrev" :has-next="hasNext" @prev="onPrev" @next="onNext" />
                </div>
                <nux-modal v-model="modalVisible" :title="modalTitle" @confirm="submit">
                    <form v-if="formFields.length" class="nux-crud-form" @submit.prevent="submit">
                        <div v-for="f in formFields" :key="f.key" class="nux-crud-form-item">
                            <label class="nux-crud-form-label">{{ f.label }}</label>
                            <el-input v-if="!f.type || f.type === 'text'" v-model="formData[f.key]" :placeholder="f.placeholder || ''" />
                            <el-input v-else-if="f.type === 'textarea'" v-model="formData[f.key]" type="textarea" :rows="f.rows || 3" />
                            <el-switch v-else-if="f.type === 'switch'" v-model="formData[f.key]" />
                            <el-select v-else-if="f.type === 'select'" v-model="formData[f.key]" style="width:100%">
                                <el-option v-for="opt in (f.options || [])" :key="opt.value" :label="opt.label" :value="opt.value" />
                            </el-select>
                        </div>
                    </form>
                </nux-modal>
            </div>
        `
    };

    window.NuxCrudPage = NuxCrudPage;
})();
