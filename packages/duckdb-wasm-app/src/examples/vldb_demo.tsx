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
    select: (level: number) => void;
}

const LevelPicker: React.FC<LevelPickerProps> = (props: LevelPickerProps) => (
    <div className={styles.levels_container}>
        {[...Array(props.current)].map((_, i) => (
            <div
                key={i}
                className={styles.level_set}
                onClick={() => props.select(i == 1 && props.current == i ? 1 : i)}
            />
        ))}
        {[...Array(3 - props.current)].map((_, i) => (
            <div
                key={props.current + i}
                className={styles.level_unset}
                onClick={() => props.select(props.current + i + 1)}
            />
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
    channelLatency: number;
    serverLatency: number;
    batchSize: number;
    windowSize: number;
}

export const VLDBDemo: React.FC<DemoProps> = (props: DemoProps) => {
    const db = rd.useDuckDB()!;
    const conn = rd.useDuckDBConnection();
    const resolveDB = rd.useDuckDBResolver();
    const resolveConn = rd.useDuckDBConnectionDialer();
    const [setupDone, setSetupDone] = React.useState(false);
    const [state, setState] = React.useState<State>({
        schemaEpoch: 0,
        dataEpoch: 0,
    });
    const [settings, setSettings] = React.useState<DemoSettings>({
        insertInterval: 1,
        channelLatency: 0,
        serverLatency: 0,
        batchSize: 2,
        windowSize: 1,
    });
    const stockData = React.useRef(new StockDataSource());

    // Create connection if needed
    React.useEffect(() => {
        if (!db.resolving()) {
            console.log('resolving db');
            resolveDB();
        }
        if (db.value != null && conn == null) {
            resolveConn();
        }
    }, [db, conn]);

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
    const inserting = React.useRef(false);
    const inserterTimeout = React.useRef<any>(undefined);
    const inserter = React.useCallback(async () => {
        if (inserting.current) return;
        if (!conn) return;
        if (!setupDone) return;
        if (!isMounted.current) return;
        inserting.current = true;

        const insertInterval = INSERT_INTERVALS[settings.insertInterval];
        const channelLatency = CHANNEL_LATENCIES[settings.channelLatency];
        const serverLatency = SERVER_LATENCIES[settings.serverLatency];
        const batchSize = INSERT_BATCH_SIZES[settings.batchSize];
        const windowSize = WINDOW_SIZES[settings.windowSize];
        const secondsToKeep = (windowSize / batchSize) * insertInterval;

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
            inserterTimeout.current = setTimeout(
                () => inserter(),
                (insertInterval + channelLatency + serverLatency) * 1000,
            );
        }
    }, [conn, setupDone, settings]);

    // Kick the first insert
    React.useEffect(() => {
        if (!conn) return;
        if (!setupDone) return;
        clearTimeout(inserterTimeout.current);
        setTimeout(() => inserter(), 0);
    }, [conn, setupDone, settings]);

    if (conn == null || !setupDone) {
        return (
            <div className={styles.table_page}>
                <div className={styles.grid_container} />
            </div>
        );
    }

    const channelLatency = CHANNEL_LATENCIES[settings.channelLatency];
    const serverLatency = SERVER_LATENCIES[settings.serverLatency];
    return (
        <dnd.DndProvider backend={HTML5Backend}>
            <div className={styles.table_page}>
                <div className={styles.demo_header_container}>
                    <div className={styles.demo_setup}>
                        <div className={styles.demo_setup_config}>
                            <LevelPicker
                                current={settings.serverLatency}
                                select={i => setSettings(s => ({ ...s, serverLatency: i }))}
                            />
                            <div className={styles.level_label}>Server Latency</div>
                            <LevelPicker
                                current={settings.channelLatency}
                                select={i => setSettings(s => ({ ...s, channelLatency: i }))}
                            />
                            <div className={styles.level_label}>Channel Latency</div>
                            <LevelPicker
                                current={settings.insertInterval}
                                select={i => setSettings(s => ({ ...s, insertInterval: i }))}
                            />
                            <div className={styles.level_label}>Insert Interval</div>
                            <LevelPicker
                                current={settings.batchSize}
                                select={i => setSettings(s => ({ ...s, batchSize: i }))}
                            />
                            <div className={styles.level_label}>Batch Size</div>
                            <LevelPicker
                                current={settings.windowSize}
                                select={i => setSettings(s => ({ ...s, windowSize: i }))}
                            />
                            <div className={styles.level_label}>Window Size</div>
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
                        <div className={styles.demo_setup_perf}></div>
                        <div className={styles.demo_setup_perf}>{Math.round(channelLatency * 1000)} ms</div>
                        <div className={styles.demo_setup_perf}>{Math.round(serverLatency * 1000)} ms</div>
                    </div>
                </div>
                <rdt.TABLE_SCHEMA_EPOCH.Provider value={state.schemaEpoch}>
                    <rdt.TABLE_DATA_EPOCH.Provider value={state.dataEpoch}>
                        <rdt.PIVOT_COLUMNS_EPOCH.Provider value={0}>
                            <rdt.TableSchemaProvider name="stock_pivot_table">
                                <PivotExplorer />
                            </rdt.TableSchemaProvider>
                        </rdt.PIVOT_COLUMNS_EPOCH.Provider>
                    </rdt.TABLE_DATA_EPOCH.Provider>
                </rdt.TABLE_SCHEMA_EPOCH.Provider>
            </div>
        </dnd.DndProvider>
    );
};
