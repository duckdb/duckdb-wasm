import * as arrow from 'apache-arrow';
import * as rd from '@duckdb/react-duckdb';
import * as rdt from '@duckdb/react-duckdb-table';
import * as dnd from 'react-dnd';
import React from 'react';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PivotExplorer } from './pivot_explorer';

import styles from './pivot_demo.module.css';
import { StockDataSource } from './stock_data';

import icon_pivot from '../../static/svg/icons/pivot.svg';
import icon_cloud from '../../static/svg/icons/cloud.svg';

const INSERT_INTERVAL = 0.2;
const INSERT_BATCH_SIZE = 100;
const ROWS_TO_KEEP = 4000;
const SECONDS_TO_KEEP = (ROWS_TO_KEEP / INSERT_BATCH_SIZE) * INSERT_INTERVAL;

interface DemoProps {
    className?: string;
}

interface State {
    schemaEpoch: number | null;
    dataEpoch: number | null;
}

export const PivotDemo: React.FC<DemoProps> = (props: DemoProps) => {
    const conn = rd.useDuckDBConnection();
    const connDialer = rd.useDuckDBConnectionDialer();
    const [setupDone, setSetupDone] = React.useState(false);
    const [state, setState] = React.useState<State>({
        schemaEpoch: 0,
        dataEpoch: 0,
    });
    const stockData = React.useRef(new StockDataSource());

    // Create connection if needed
    React.useEffect(() => {
        if (conn == null) {
            connDialer();
        }
    }, [conn]);

    // Detect unmount
    const isMounted = React.useRef(true);
    React.useEffect(() => {
        return () => void (isMounted.current = false);
    }, []);

    // Setup the table
    React.useEffect(() => {
        if (!conn) return;
        if (setupDone) return;
        const setup = async () => {
            await conn.query('DROP TABLE IF EXISTS stock_pivot_table');
            await conn.query(`
                CREATE TABLE stock_pivot_table (
                    name VARCHAR NOT NULL,
                    client VARCHAR NOT NULL,
                    last_update TIMESTAMP NOT NULL,
                    change DOUBLE NOT NULL,
                    bid DOUBLE NOT NULL,
                    ask DOUBLE NOT NULL,
                    volume DOUBLE NOT NULL
                )
            `);
            setSetupDone(true);
        };
        setup();
    }, [conn]);

    // Prepare the inserter
    const inserter = React.useCallback(async () => {
        if (!conn) return;
        if (!setupDone) return;
        if (!isMounted.current) return;

        // Insert the next batch
        const table = new arrow.Table([stockData.current.genBatch(INSERT_BATCH_SIZE)]);
        await conn.insertArrowTable(table, {
            name: 'stock_pivot_table',
            create: false,
        });
        await conn.query(`
            DELETE FROM stock_pivot_table
            WHERE last_update < date_trunc('second', now() - INTERVAL ${SECONDS_TO_KEEP} SECOND)
        `);

        // Schedule again
        if (isMounted.current) {
            setState(s => ({
                schemaEpoch: s.schemaEpoch,
                dataEpoch: (s.dataEpoch || 0) + 1,
            }));
            setTimeout(() => inserter(), INSERT_INTERVAL * 1000);
        }
    }, [conn, setupDone]);

    // Kick the first insert
    React.useEffect(() => {
        if (!conn) return;
        if (!setupDone) return;
        setTimeout(() => inserter(), 0);
    }, [conn, setupDone]);

    if (conn == null || !setupDone) {
        return (
            <div className={styles.table_page}>
                <div className={styles.grid_container} />
            </div>
        );
    }
    return (
        <dnd.DndProvider backend={HTML5Backend}>
            <div className={styles.table_page}>
                <div className={styles.demo_header_container}>
                    <div className={styles.demo_setup}>
                        <div className={styles.demo_setup_icon_container}>
                            <svg className={styles.demo_setup_icon} width="40px" height="40px">
                                <use xlinkHref={`${icon_pivot}#sym`} />
                            </svg>
                        </div>
                        <div className={styles.demo_setup_channel} />
                        <div className={styles.demo_setup_icon_container}>
                            <svg className={styles.demo_setup_icon} width="40px" height="40px">
                                <use xlinkHref={`${icon_cloud}#sym`} />
                            </svg>
                        </div>
                        <div className={styles.demo_setup_perf}>0 ms</div>
                        <div className={styles.demo_setup_perf}>0 ms</div>
                        <div className={styles.demo_setup_perf}>0 ms</div>
                    </div>
                </div>
                <rd.TABLE_SCHEMA_EPOCH.Provider value={state.schemaEpoch}>
                    <rd.TABLE_DATA_EPOCH.Provider value={state.dataEpoch}>
                        <rdt.PIVOT_COLUMNS_EPOCH.Provider value={0}>
                            <rd.DuckDBTableSchemaProvider name="stock_pivot_table">
                                <PivotExplorer />
                            </rd.DuckDBTableSchemaProvider>
                        </rdt.PIVOT_COLUMNS_EPOCH.Provider>
                    </rd.TABLE_DATA_EPOCH.Provider>
                </rd.TABLE_SCHEMA_EPOCH.Provider>
            </div>
        </dnd.DndProvider>
    );
};
