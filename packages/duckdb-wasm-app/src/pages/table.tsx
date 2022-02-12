import * as rd from '@duckdb/react-duckdb';
import React from 'react';

import styles from './table.module.css';

interface Props {
    className?: string;
}

export const TableViewer: React.FC<Props> = (props: Props) => {
    const db = rd.useDuckDB();
    const dbLauncher = rd.useDuckDBLauncher();
    React.useEffect(() => {
        dbLauncher();
    });

    if (db == null) {
        return (
            <div className={styles.table_page}>
                <div className={styles.grid_container} />
            </div>
        );
    }
    return <div>todo</div>;
};
