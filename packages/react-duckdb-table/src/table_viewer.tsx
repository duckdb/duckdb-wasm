import * as React from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';
import { TableSchema } from './table_schema';
import { useTableSchema } from './table_schema_provider';
import { TableCardinalityProvider, TABLE_CARDINALITY } from './table_cardinality_provider';
import { SimpleScanProvider } from './simple_scan_provider';
import { ScanRequest, OrderSpecification, SCAN_RESULT, SCAN_STATISTICS } from './scan_provider';
import DataGrid from './data_grid';
import { formatBytes, formatThousands } from './format';

import styles from './table_viewer.module.css';

interface Props {
    /// The table schema
    table: TableSchema | null;
}

export const TableViewer: React.FC<Props> = (props: Props) => {
    const cardinality = React.useContext(TABLE_CARDINALITY);
    const data = React.useContext(SCAN_RESULT);
    const stats = React.useContext(SCAN_STATISTICS);
    if (props.table == null || data == null || cardinality == null) {
        return <div />;
    }
    return (
        <div className={styles.container}>
            <div className={styles.table}>
                <DataGrid />
            </div>
            <div className={styles.statsbar}>
                <div className={styles.bean}>
                    Scans: &sum; {formatThousands(stats!.resultRows)} rows, &sum; {formatBytes(stats!.resultBytes)},
                    &#8709; {Math.round((stats!.queryExecutionTotalMs / stats!.queryCount) * 100) / 100} ms
                </div>
                <div className={styles.bean}>Table: {formatThousands(cardinality || 0)} rows</div>
            </div>
        </div>
    );
};

interface WiredProps {
    /// The connection
    connection: duckdb.AsyncDuckDBConnection | null;
    /// The ordering (if any)
    ordering?: OrderSpecification[];
}

export const WiredTableViewer: React.FC<WiredProps> = (props: WiredProps) => {
    const table = useTableSchema();
    if (props.connection == null || table == null) {
        return <div />;
    }
    return (
        <TableCardinalityProvider connection={props.connection} table={table}>
            <SimpleScanProvider
                connection={props.connection}
                table={table}
                request={new ScanRequest().withRange(0, 128).withOrdering(props.ordering ?? null)}
            >
                <TableViewer table={table} />
            </SimpleScanProvider>
        </TableCardinalityProvider>
    );
};
