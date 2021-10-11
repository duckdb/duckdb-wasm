import React from 'react';
import { GroupedBenchmarks } from './benchmark_reader';

import styles from './benchmark_table.module.css';

const SYSTEMS = ['duckdb_sync', 'sqljs', 'arquero', 'alasql', 'lovefield'];

interface GroupHeaderProps {
    title: string;
}

const BenchmarkGroupHeader: React.FC<GroupHeaderProps> = (props: GroupHeaderProps) => (
    <>
        <div className={styles.row_group_title}>{props.title}</div>
        <div className={styles.row_group_anchor} />
        <div className={styles.row_group_column_header}>DuckDB</div>
        <div className={styles.row_group_column_header}>sql.js</div>
        <div className={styles.row_group_column_header}>Arquero</div>
        <div className={styles.row_group_column_header}>AlaSQL</div>
        <div className={styles.row_group_column_header}>Lovefield</div>
    </>
);

interface GroupProps {
    id: number;
    benchmarkKey: string;
    benchmarks: GroupedBenchmarks;
    title: string;
}

const BASE_COLOR_HUE = 56;
const BASE_COLOR_SATURATION = 1.0;
const BASE_COLOR_LIGHTNESS = 0.5;

const BenchmarkRow: React.FC<GroupProps> = (props: GroupProps) => {
    const elements: React.ReactElement[] = [];

    // Get entries
    const entries = [];
    let minMeanTime = Number.POSITIVE_INFINITY;
    let maxMeanTime = 0.0;
    for (let i = 0; i < SYSTEMS.length; ++i) {
        const system = SYSTEMS[i];
        const entry = props.benchmarks.entries.get(`${props.benchmarkKey}_${system}`);
        entries.push(entry);
        minMeanTime = Math.min(minMeanTime, entry?.meanTime || Number.POSITIVE_INFINITY);
        maxMeanTime = Math.max(maxMeanTime, entry?.meanTime || 0.0);
    }
    const cappedMaxMeanTime = Math.min(minMeanTime * 10, maxMeanTime);

    for (let i = 0; i < entries.length; ++i) {
        const entry = entries[i];
        const id = props.id * SYSTEMS.length + i;

        const cappedMeanTime = Math.min(entry?.meanTime || 0, cappedMaxMeanTime);
        const factor = (cappedMeanTime - minMeanTime) / (cappedMaxMeanTime - minMeanTime);
        console.log(`${minMeanTime} ${maxMeanTime}`);
        const hue = BASE_COLOR_HUE;
        const saturation = BASE_COLOR_SATURATION;
        const lightness = BASE_COLOR_LIGHTNESS + 0.4 * factor;
        if (entry == undefined) {
            elements.push(
                <div key={id} className={styles.table_entry_missing}>
                    -
                </div>,
            );
        } else {
            elements.push(
                <div
                    key={id}
                    className={styles.table_entry}
                    style={{ backgroundColor: `hsl(${hue},${saturation * 100}%,${lightness * 100}%)` }}
                >
                    {(entry.meanTime / 1000).toFixed(3)} s
                </div>,
            );
        }
    }
    return (
        <>
            <div className={styles.row_header}>{props.title}</div>
            {elements}
        </>
    );
};

interface Props {
    benchmarks: GroupedBenchmarks;
}

export const BenchmarkTable: React.FC<Props> = (props: Props) => {
    return (
        <div className={styles.table}>
            <div className={styles.row_group_container}>
                <div className={styles.row_group}>
                    <BenchmarkGroupHeader key="tpch_001" title="TPCH 0.001" />
                    <BenchmarkRow id={1} benchmarkKey="tpch_001_1" title="1" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={2} benchmarkKey="tpch_001_2" title="2" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={3} benchmarkKey="tpch_001_3" title="3" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={4} benchmarkKey="tpch_001_4" title="4" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={5} benchmarkKey="tpch_001_5" title="5" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={6} benchmarkKey="tpch_001_6" title="6" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={7} benchmarkKey="tpch_001_7" title="7" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={8} benchmarkKey="tpch_001_8" title="8" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={9} benchmarkKey="tpch_001_9" title="9" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={10} benchmarkKey="tpch_001_10" title="10" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={11} benchmarkKey="tpch_001_11" title="11" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={12} benchmarkKey="tpch_001_12" title="12" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={13} benchmarkKey="tpch_001_13" title="13" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={14} benchmarkKey="tpch_001_14" title="14" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={15} benchmarkKey="tpch_001_15" title="15" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={16} benchmarkKey="tpch_001_16" title="16" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={17} benchmarkKey="tpch_001_17" title="17" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={18} benchmarkKey="tpch_001_18" title="18" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={19} benchmarkKey="tpch_001_19" title="19" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={20} benchmarkKey="tpch_001_20" title="20" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={21} benchmarkKey="tpch_001_21" title="21" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={22} benchmarkKey="tpch_001_22" title="22" benchmarks={props.benchmarks} />
                </div>
            </div>
            <div className={styles.row_group_container}>
                <div className={styles.row_group}>
                    <BenchmarkGroupHeader key="tpch_01" title="TPCH 0.01" />
                    <BenchmarkRow id={31} benchmarkKey="tpch_01_1" title="1" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={32} benchmarkKey="tpch_01_2" title="2" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={33} benchmarkKey="tpch_01_3" title="3" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={34} benchmarkKey="tpch_01_4" title="4" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={35} benchmarkKey="tpch_01_5" title="5" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={36} benchmarkKey="tpch_01_6" title="6" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={37} benchmarkKey="tpch_01_7" title="7" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={38} benchmarkKey="tpch_01_8" title="8" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={39} benchmarkKey="tpch_01_9" title="9" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={40} benchmarkKey="tpch_01_10" title="10" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={41} benchmarkKey="tpch_01_11" title="11" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={42} benchmarkKey="tpch_01_12" title="12" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={43} benchmarkKey="tpch_01_13" title="13" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={44} benchmarkKey="tpch_01_14" title="14" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={45} benchmarkKey="tpch_01_15" title="15" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={46} benchmarkKey="tpch_01_16" title="16" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={47} benchmarkKey="tpch_01_17" title="17" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={48} benchmarkKey="tpch_01_18" title="18" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={49} benchmarkKey="tpch_01_19" title="19" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={50} benchmarkKey="tpch_01_20" title="20" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={51} benchmarkKey="tpch_01_21" title="21" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={52} benchmarkKey="tpch_01_22" title="22" benchmarks={props.benchmarks} />
                </div>
            </div>
            <div className={styles.row_group_container}>
                <div className={styles.row_group}>
                    <BenchmarkGroupHeader key="tpch_025" title="TPCH 0.025" />
                    <BenchmarkRow id={61} benchmarkKey="tpch_025_1" title="1" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={62} benchmarkKey="tpch_025_2" title="2" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={63} benchmarkKey="tpch_025_3" title="3" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={64} benchmarkKey="tpch_025_4" title="4" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={65} benchmarkKey="tpch_025_5" title="5" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={66} benchmarkKey="tpch_025_6" title="6" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={67} benchmarkKey="tpch_025_7" title="7" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={68} benchmarkKey="tpch_025_8" title="8" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={69} benchmarkKey="tpch_025_9" title="9" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={70} benchmarkKey="tpch_025_10" title="10" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={71} benchmarkKey="tpch_025_11" title="11" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={72} benchmarkKey="tpch_025_12" title="12" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={73} benchmarkKey="tpch_025_13" title="13" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={74} benchmarkKey="tpch_025_14" title="14" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={75} benchmarkKey="tpch_025_15" title="15" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={76} benchmarkKey="tpch_025_16" title="16" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={77} benchmarkKey="tpch_025_17" title="17" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={78} benchmarkKey="tpch_025_18" title="18" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={79} benchmarkKey="tpch_025_19" title="19" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={80} benchmarkKey="tpch_025_20" title="20" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={81} benchmarkKey="tpch_025_21" title="21" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={82} benchmarkKey="tpch_025_22" title="22" benchmarks={props.benchmarks} />
                </div>
            </div>
            <div className={styles.row_group_container}>
                <div className={styles.row_group}>
                    <BenchmarkGroupHeader key="tpch_05" title="TPCH 0.05" />
                    <BenchmarkRow id={91} benchmarkKey="tpch_05_1" title="1" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={92} benchmarkKey="tpch_05_2" title="2" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={93} benchmarkKey="tpch_05_3" title="3" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={94} benchmarkKey="tpch_05_4" title="4" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={95} benchmarkKey="tpch_05_5" title="5" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={96} benchmarkKey="tpch_05_6" title="6" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={97} benchmarkKey="tpch_05_7" title="7" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={98} benchmarkKey="tpch_05_8" title="8" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={99} benchmarkKey="tpch_05_9" title="9" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={100} benchmarkKey="tpch_05_10" title="10" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={101} benchmarkKey="tpch_05_11" title="11" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={102} benchmarkKey="tpch_05_12" title="12" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={103} benchmarkKey="tpch_05_13" title="13" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={104} benchmarkKey="tpch_05_14" title="14" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={105} benchmarkKey="tpch_05_15" title="15" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={106} benchmarkKey="tpch_05_16" title="16" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={107} benchmarkKey="tpch_05_17" title="17" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={108} benchmarkKey="tpch_05_18" title="18" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={109} benchmarkKey="tpch_05_19" title="19" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={110} benchmarkKey="tpch_05_20" title="20" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={111} benchmarkKey="tpch_05_21" title="21" benchmarks={props.benchmarks} />
                    <BenchmarkRow id={112} benchmarkKey="tpch_05_22" title="22" benchmarks={props.benchmarks} />
                </div>
            </div>
        </div>
    );
};
