import * as arrow from 'apache-arrow';

/// Create a sql create statement.
/// This function and the generated sql statement are never benchmarked directly.
export function sqlCreate(table: string, fields: arrow.Field[], keys: string[][] = []): string {
    let sql = `CREATE TABLE IF NOT EXISTS ${table} (`;
    for (const f of fields) {
        sql += f.name + ' ';
        switch (f.typeId) {
            case arrow.Type.Int:
                sql += 'INTEGER';
                break;
            case arrow.Type.Float:
                sql += 'FLOAT';
                break;
            case arrow.Type.Utf8:
                sql += 'TEXT';
                break;
            case arrow.Type.Date:
                sql += 'DATE';
                break;
            default:
                throw 'Type not implemented: ' + f.typeId;
        }
        sql += ',';
    }
    if (keys.length > 0) {
        sql += 'PRIMARY KEY (';
        for (let i = 0; i < keys[0].length; i++) {
            if (i > 0) sql += ',';
            sql += keys[0][i];
        }
        sql += '),';
    }
    return sql.substr(0, sql.length - 1) + ')';
}

/// Create a naive sql insert statement.
/// This function and the generated sql statement are never benchmarked directly.
export function* sqlInsert(table: string, fields: arrow.Field[], columns: any[][]): Generator<string, any, unknown> {
    const MAX_VALUES_PER_STATEMENT = 1000;
    for (let i = 0; i < columns[0].length; ) {
        let query = `INSERT INTO ${table} VALUES `;
        const n = Math.min(MAX_VALUES_PER_STATEMENT, columns[0].length - i);
        for (let j = 0; j < n; ++j) {
            if (j > 0) query += ',';
            query += '(';
            for (let k = 0; k < fields.length; ++k) {
                if (k > 0) query += ',';
                const f = fields[k];
                switch (f.typeId) {
                    case arrow.Type.Int:
                    case arrow.Type.Float:
                        query += columns[k][i + j];
                        break;
                    case arrow.Type.Utf8:
                        query += "'" + columns[k][i + j] + "'";
                        break;
                    case arrow.Type.Date:
                        query += "'" + columns[k][i + j].toISOString().slice(0, 19).replace('T', ' ') + "'";
                        break;
                    default:
                        throw 'Type not implemented: ' + f.typeId;
                }
            }
            query += ')';
        }
        yield query;
        i += n;
    }
}
