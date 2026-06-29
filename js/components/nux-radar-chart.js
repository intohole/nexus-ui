(function() {
    const DEFAULT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    const NuxRadarChart = {
        name: 'NuxRadarChart',
        props: {
            labels: { type: Array, default: function() { return []; } },
            datasets: { type: Array, default: function() { return []; } },
            maxValue: { type: Number, default: 100 },
            size: { type: Number, default: 320 },
            showLabels: { type: Boolean, default: true },
            showValues: { type: Boolean, default: false },
            showLegend: { type: Boolean, default: true },
            gridLevels: { type: Number, default: 4 },
            gridColor: { type: String, default: '#e2e8f0' },
            axisColor: { type: String, default: '#cbd5e1' },
            textColor: { type: String, default: '#64748b' }
        },
        data: function() {
            return { canvasId: 'nux-radar-' + Math.random().toString(36).substr(2, 9), ro: null };
        },
        computed: {
            safeDatasets: function() {
                var self = this;
                return this.datasets.map(function(ds, i) {
                    var vals = (ds.values || []).map(function(v) {
                        return Math.max(0, Math.min(self.maxValue, Number(v) || 0));
                    });
                    while (vals.length < self.labels.length) vals.push(0);
                    return {
                        label: ds.label || ('数据集' + (i + 1)),
                        values: vals.slice(0, self.labels.length),
                        color: ds.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]
                    };
                });
            }
        },
        watch: {
            labels: function() { this.$nextTick(this.draw); },
            datasets: function() { this.$nextTick(this.draw); },
            maxValue: function() { this.$nextTick(this.draw); }
        },
        mounted: function() {
            this.$nextTick(this.draw);
            var self = this;
            if (typeof ResizeObserver !== 'undefined') {
                this.ro = new ResizeObserver(function() { self.draw(); });
                this.ro.observe(this.$el);
            }
            window.addEventListener('resize', this.draw);
        },
        beforeUnmount: function() {
            if (this.ro) this.ro.disconnect();
            window.removeEventListener('resize', this.draw);
        },
        methods: {
            draw: function() {
                var canvas = this.$el.querySelector('canvas');
                if (!canvas) return;
                var dpr = window.devicePixelRatio || 1;
                var cssSize = Math.max(200, Math.min(canvas.parentElement.clientWidth || this.size, 500));
                canvas.style.width = cssSize + 'px';
                canvas.style.height = cssSize + 'px';
                canvas.width = cssSize * dpr;
                canvas.height = cssSize * dpr;
                var ctx = canvas.getContext('2d');
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx.clearRect(0, 0, cssSize, cssSize);

                var cx = cssSize / 2;
                var cy = cssSize / 2;
                var labelMargin = this.showLabels ? 50 : 20;
                var radius = Math.max(20, cssSize / 2 - labelMargin);
                var n = this.labels.length;
                if (n < 3) {
                    ctx.fillStyle = this.textColor;
                    ctx.font = '13px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('至少需要3个维度', cx, cy);
                    return;
                }
                var angleStep = (Math.PI * 2) / n;
                var startAngle = -Math.PI / 2;

                this.drawGrid(ctx, cx, cy, radius, n, startAngle, angleStep);
                this.drawAxes(ctx, cx, cy, radius, n, startAngle, angleStep);
                if (this.showLabels) this.drawLabels(ctx, cx, cy, radius, startAngle, angleStep);
                var self = this;
                this.safeDatasets.forEach(function(ds) {
                    self.drawDataset(ctx, cx, cy, radius, ds, n, startAngle, angleStep);
                });
                if (this.showLegend) this.drawLegend(ctx, cssSize);
            },
            drawGrid: function(ctx, cx, cy, radius, n, startAngle, angleStep) {
                ctx.strokeStyle = this.gridColor;
                ctx.lineWidth = 1;
                for (var level = 1; level <= this.gridLevels; level++) {
                    var r = (radius * level) / this.gridLevels;
                    ctx.beginPath();
                    for (var i = 0; i < n; i++) {
                        var angle = startAngle + i * angleStep;
                        var x = cx + r * Math.cos(angle);
                        var y = cy + r * Math.sin(angle);
                        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
            },
            drawAxes: function(ctx, cx, cy, radius, n, startAngle, angleStep) {
                ctx.strokeStyle = this.axisColor;
                ctx.lineWidth = 1;
                for (var i = 0; i < n; i++) {
                    var angle = startAngle + i * angleStep;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
                    ctx.stroke();
                }
            },
            drawLabels: function(ctx, cx, cy, radius, startAngle, angleStep) {
                ctx.fillStyle = this.textColor;
                ctx.font = '12px -apple-system, sans-serif';
                var n = this.labels.length;
                for (var i = 0; i < n; i++) {
                    var angle = startAngle + i * angleStep;
                    var lx = cx + (radius + 18) * Math.cos(angle);
                    var ly = cy + (radius + 18) * Math.sin(angle);
                    var cosA = Math.cos(angle);
                    if (cosA > 0.3) ctx.textAlign = 'left';
                    else if (cosA < -0.3) ctx.textAlign = 'right';
                    else ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    var label = String(this.labels[i] || '');
                    ctx.fillText(label, lx, ly);
                }
            },
            drawDataset: function(ctx, cx, cy, radius, ds, n, startAngle, angleStep) {
                var self = this;
                ctx.beginPath();
                ds.values.forEach(function(val, i) {
                    var ratio = val / self.maxValue;
                    var r = radius * Math.max(0, Math.min(1, ratio));
                    var angle = startAngle + i * angleStep;
                    var x = cx + r * Math.cos(angle);
                    var y = cy + r * Math.sin(angle);
                    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                });
                ctx.closePath();
                ctx.fillStyle = this.hexToRgba(ds.color, 0.15);
                ctx.fill();
                ctx.strokeStyle = ds.color;
                ctx.lineWidth = 2;
                ctx.stroke();
                ds.values.forEach(function(val, i) {
                    var ratio = val / self.maxValue;
                    var r = radius * Math.max(0, Math.min(1, ratio));
                    var angle = startAngle + i * angleStep;
                    var x = cx + r * Math.cos(angle);
                    var y = cy + r * Math.sin(angle);
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fillStyle = ds.color;
                    ctx.fill();
                });
            },
            drawLegend: function(ctx, cssSize) {
                if (!this.safeDatasets.length) return;
                ctx.font = '12px -apple-system, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                var startY = 14;
                var self = this;
                this.safeDatasets.forEach(function(ds, i) {
                    var y = startY + i * 18;
                    ctx.fillStyle = ds.color;
                    ctx.fillRect(10, y - 6, 12, 12);
                    ctx.fillStyle = self.textColor;
                    ctx.fillText(ds.label, 28, y);
                });
            },
            hexToRgba: function(hex, alpha) {
                var h = hex.replace('#', '');
                if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
                var r = parseInt(h.substr(0, 2), 16) || 0;
                var g = parseInt(h.substr(2, 2), 16) || 0;
                var b = parseInt(h.substr(4, 2), 16) || 0;
                return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
            }
        },
        template: '<div class="nux-radar-chart-wrap" style="text-align:center;"><canvas></canvas></div>'
    };

    window.NuxRadarChart = NuxRadarChart;
})();
