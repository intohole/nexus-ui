(function () {
    'use strict';

    function extractBody(result) {
        if (result && typeof result === 'object' && !Array.isArray(result)
            && 'data' in result && result.data !== undefined && result.data !== null) {
            return result.data;
        }
        return result;
    }

    function stringifyVal(v) {
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') {
            try { return JSON.stringify(v); } catch (e) { return String(v); }
        }
        return String(v);
    }

    function isEmpty(obj) {
        return Object.keys(obj).length === 0;
    }

    function format(result) {
        if (result === null || result === undefined) return '无';
        if (typeof result === 'string') return result;
        try {
            return JSON.stringify(result, null, 2);
        } catch (e) {
            return String(result);
        }
    }

    function isError(result) {
        return result !== null && typeof result === 'object'
            && !Array.isArray(result) && 'error' in result;
    }

    function buildTable(rows) {
        if (!Array.isArray(rows) || rows.length === 0 || typeof rows[0] !== 'object') {
            return { kind: 'raw', text: format(rows) };
        }
        const columns = Object.keys(rows[0]);
        const data = rows.map(function (r) {
            const row = {};
            columns.forEach(function (c) {
                row[c] = stringifyVal(r[c]);
            });
            return row;
        });
        return { kind: 'table', columns, rows: data, summary: null };
    }

    function build(result) {
        if (result === null || result === undefined) {
            return { kind: 'raw', text: '空' };
        }
        const body = extractBody(result);
        if (Array.isArray(body)) {
            return buildTable(body);
        }
        if (typeof body === 'object' && body !== null) {
            const arrKey = Object.keys(body).find(function (k) {
                return Array.isArray(body[k]) && body[k].length > 0;
            });
            if (arrKey) {
                const summary = {};
                Object.keys(body).forEach(function (k) {
                    if (k !== arrKey) summary[k] = body[k];
                });
                const table = buildTable(body[arrKey]);
                table.summary = isEmpty(summary) ? null : summary;
                return table;
            }
            const pairs = Object.keys(body).map(function (k) {
                return { k, v: stringifyVal(body[k]) };
            });
            return { kind: 'kv', pairs };
        }
        return { kind: 'raw', text: stringifyVal(body) };
    }

    window.NexusStructured = { build, format, isError };
})();