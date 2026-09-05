(function () {
    'use strict';

    function clampPct(v) {
        const n = Number(v);
        if (isNaN(n)) return 0;
        return Math.min(Math.max(Math.round(n), 0), 100);
    }

    function formatLabel(opts) {
        const days = opts && (opts.currentDay !== undefined && opts.currentDay !== null) ? Number(opts.currentDay) : NaN;
        if (!isNaN(days) && days > 0) return '第 ' + days + ' 天';
        if (opts && opts.totalDays && opts.doneDays !== undefined && opts.doneDays !== null) {
            return opts.doneDays + '/' + opts.totalDays + ' 天';
        }
        return '';
    }

    const NexusUseProgress = {
        computeStats(opts) {
            const total = Number(opts && opts.total) || 0;
            const done = (opts && opts.done !== undefined && opts.done !== null) ? Number(opts.done) : null;
            const totalDays = Number(opts && opts.totalDays) || 0;
            const doneDays = (opts && opts.doneDays !== undefined && opts.doneDays !== null) ? Number(opts.doneDays) : null;
            const currentDay = (opts && opts.currentDay !== undefined && opts.currentDay !== null) ? Number(opts.currentDay) : null;
            const elapsed = (opts && opts.elapsed !== undefined && opts.elapsed !== null) ? Number(opts.elapsed) : null;

            const pct = done !== null && total > 0
                ? clampPct(done / total * 100)
                : (elapsed !== null && total > 0 ? clampPct(elapsed / total * 100) : 0);

            const statLines = [];
            if (done !== null && total > 0) statLines.push({ k: '达标', v: done + '/' + total });
            if (doneDays !== null && totalDays > 0) statLines.push({ k: '已打卡', v: doneDays + '/' + totalDays + ' 天' });
            if (currentDay !== null && currentDay > 0) statLines.push({ k: '进行到', v: '第 ' + currentDay + ' 天' });
            if (elapsed !== null && elapsed > 0) statLines.push({ k: '已过', v: elapsed + ' 天' });
            if (!statLines.length) statLines.push({ k: '进度', v: pct + '%' });

            return {
                percent: pct,
                currentDayLabel: formatLabel({ currentDay, totalDays, doneDays }),
                statLines: statLines,
                total: total,
                done: done,
                totalDays: totalDays,
                doneDays: doneDays,
                currentDay: currentDay,
                elapsed: elapsed
            };
        },

        formatLabel: formatLabel
    };

    window.NexusUseProgress = NexusUseProgress;
})();