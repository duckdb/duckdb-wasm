import * as arrow from 'apache-arrow';
import * as duckdb from '@duckdb/duckdb-wasm';

/// A column group
export interface TableSchemaColumnGroup {
    /// The group title
    title: string;
    /// The begin of the column span
    spanBegin: number;
    /// The size of the column span
    spanSize: number;
}

/// A table metadatStorea
export interface TableSchema {
    /// The table schema
    readonly tableSchema: string;
    /// The table name
    readonly tableName: string;

    /// The column names
    readonly columnNames: string[];
    /// The column name indices
    readonly columnNameMapping: Map<string, number>;
    /// The column types
    readonly columnTypes: arrow.DataType[];
    /// The number of data columns.
    /// Allows to append compute metadata columns that are not rendered in the table viewer.
    readonly dataColumns: number;

    /// The column aliases (if any)
    readonly columnAliases: (string | null)[];
    /// The column grouping sets (if any)
    readonly columnGroupingSets: TableSchemaColumnGroup[][];
    /// The row grouping sets (if any)
    readonly rowGroupingSets: number[][];
}

/// Get raw qualified name
export function getQualifiedNameRaw(schema: string, name: string) {
    return `${schema || 'main'}.${name}`;
}
/// Get qualified name
export function getQualifiedName(table: TableSchema) {
    return `${table.tableSchema}.${table.tableName}`;
}

/// Collect table info
export async function collectTableSchema(
    conn: duckdb.AsyncDuckDBConnection,
    info: Partial<TableSchema> & { tableSchema?: string; tableName: string },
): Promise<TableSchema> {
    // Use DESCRIBE to find all column types
    const columnNames: string[] = [];
    const columnNameMapping: Map<string, number> = new Map();
    const columnTypes: arrow.DataType[] = [];
    const describe = await conn.query<{ Field: arrow.Utf8; Type: arrow.Utf8 }>(
        `DESCRIBE ${info.tableSchema || 'main'}.${info.tableName}`,
    );
    let column = 0;
    for (const row of describe) {
        columnNames.push(row!.Field!);
        columnNameMapping.set(row!.Field!, column++);
        const mapType = (type: string): arrow.DataType => {
            switch (type) {
                case 'BOOLEAN':
                    return new arrow.Bool();
                case 'TINYINT':
                    return new arrow.Int8();
                case 'SMALLINT':
                    return new arrow.Int16();
                case 'INTEGER':
                    return new arrow.Int32();
                case 'BIGINT':
                    return new arrow.Int64();
                case 'UTINYINT':
                    return new arrow.Uint8();
                case 'USMALLINT':
                    return new arrow.Uint16();
                case 'UINTEGER':
                    return new arrow.Uint32();
                case 'UBIGINT':
                    return new arrow.Uint64();
                case 'FLOAT':
                    return new arrow.Float32();
                case 'HUGEINT':
                    return new arrow.Decimal(32, 0);
                case 'DOUBLE':
                    return new arrow.Float64();
                case 'VARCHAR':
                    return new arrow.Utf8();
                case 'DATE':
                    return new arrow.DateDay();
                case 'TIME':
                    return new arrow.Time(arrow.TimeUnit.MILLISECOND, 32);
                case 'TIMESTAMP':
                    return new arrow.TimeNanosecond();
                default:
                    return new arrow.Null();
            }
        };
        columnTypes.push(mapType(row!.Type!));
    }
    const table: TableSchema = {
        ...info,
        tableSchema: info.tableSchema || 'main',
        columnNames,
        columnTypes,
        dataColumns: columnTypes.length,
        columnNameMapping,
        columnAliases: [],
        columnGroupingSets: [],
        rowGroupingSets: [],
    };

    return table;
}
