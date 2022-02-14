import * as arrow from 'apache-arrow';
import * as rd from '@duckdb/react-duckdb';
import * as rdt from '@duckdb/react-duckdb-table';
import * as dnd from 'react-dnd';
import React from 'react';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { PivotExplorer } from './pivot_explorer';

import styles from './vldb_demo.module.css';
import { StockDataSource } from './stock_data';

import icon_pivot from '../../static/svg/icons/pivot.svg';
import icon_cloud from '../../static/svg/icons/cloud.svg';

const INSERT_INTERVALS = [0.1, 0.2, 0.5, 1.0];
const CHANNEL_LATENCIES = [0, 0.03, 0.1, 0.2];
const SERVER_LATENCIES = [0, 0.1, 0.5, 1.0];
const INSERT_BATCH_SIZES = [10, 100, 1000, 10000];
const WINDOW_SIZES = [1000, 10000, 100000, 1000000];

interface LevelPickerProps {
    current: number;
}

const LevelPicker: React.FC<LevelPickerProps> = (props: LevelPickerProps) => (
    <div className={styles.levels_container}>
        {[...Array(props.current)].map((_, i) => (
            <div key={i} className={styles.level_set} />
        ))}
        {[...Array(3 - props.current)].map((_, i) => (
            <div key={props.current + i} className={styles.level_unset} />
        ))}
    </div>
);

interface DemoProps {
    className?: string;
}

interface State {
    schemaEpoch: number | null;
    dataEpoch: number | null;
}

interface DemoSettings {
    insertInterval: number;
    channelLatencies: number;
    serverLatencies: number;
    batchSize: number;
    windowSize: number;
}

export const VLDBDemo: React.FC<DemoProps> = (props: DemoProps) => {
    const conn = rd.useDuckDBConnection();
    const connDialer = rd.useDuckDBConnectionDialer();
    const [setupDone, setSetupDone] = React.useState(false);
    const [state, setState] = React.useState<State>({
        schemaEpoch: 0,
        dataEpoch: 0,
    });
    const [settings, setSettings] = React.useState<DemoSettings>({
        insertInterval: 1,
        channelLatencies: 0,
        serverLatencies: 0,
        batchSize: 2,
        windowSize: 1,
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

    const insertInterval = INSERT_INTERVALS[settings.insertInterval];
    const channelLatency = CHANNEL_LATENCIES[settings.channelLatencies];
    const serverLatency = SERVER_LATENCIES[settings.serverLatencies];
    const batchSize = INSERT_BATCH_SIZES[settings.batchSize];
    const windowSize = WINDOW_SIZES[settings.windowSize];
    const secondsToKeep = (windowSize / batchSize) * insertInterval;

    // Prepare the inserter
    const inserting = React.useRef(false);
    const inserter = React.useCallback(async () => {
        if (inserting.current) return;
        if (!conn) return;
        if (!setupDone) return;
        if (!isMounted.current) return;
        inserting.current = true;

        // Insert the next batch
        const table = new arrow.Table([stockData.current.genBatch(batchSize)]);
        await conn.insertArrowTable(table, {
            name: 'stock_pivot_table',
            create: false,
        });
        await conn.query(`
            DELETE FROM stock_pivot_table
            WHERE last_update < date_trunc('second', now() - INTERVAL ${secondsToKeep} SECOND)
        `);
        inserting.current = false;

        // Schedule again
        if (isMounted.current) {
            setState(s => ({
                schemaEpoch: s.schemaEpoch,
                dataEpoch: (s.dataEpoch || 0) + 1,
            }));
            setTimeout(() => inserter(), (insertInterval + channelLatency + serverLatency) * 1000);
        }
    }, [conn, setupDone, settings]);

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
                        <div className={styles.demo_setup_config}>
                            <LevelPicker current={0} />
                            <div className={styles.level_label}>Server Latency</div>
                            <div className={styles.level_label}>{Math.round(serverLatency * 1000)} ms</div>
                            <LevelPicker current={0} />
                            <div className={styles.level_label}>Channel Latency</div>
                            <div className={styles.level_label}>{Math.round(channelLatency * 1000)} ms</div>
                            <LevelPicker current={1} />
                            <div className={styles.level_label}>Insert Interval</div>
                            <div className={styles.level_label}>{Math.round(insertInterval * 1000)} ms</div>
                            <LevelPicker current={2} />
                            <div className={styles.level_label}>Batch Size</div>
                            <div className={styles.level_label}>{batchSize}</div>
                            <LevelPicker current={2} />
                            <div className={styles.level_label}>Window Size</div>
                            <div className={styles.level_label}>{windowSize}</div>
                        </div>
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
