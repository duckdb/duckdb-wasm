import React from 'react';
import { GroupedBenchmarks } from './benchmark_reader';

import styles from './benchmark_table.module.css';
import warn from '../static/svg/icons/warn.svg';

const SYSTEMS = ['duckdb_sync', 'sqljs', 'arquero', 'lovefield'];

enum Metric {
    MEAN_TIME,
    FREQUENCY,
}

interface GroupHeaderProps {
    title: string;
}

const BenchmarkGroupHeader: React.FC<GroupHeaderProps> = (props: GroupHeaderProps) => (
    <>
        <div className={styles.row_group_title}>{props.title}</div>
        <div className={styles.row_group_anchor} />
        <div className={styles.row_group_column_header}>DuckDB-wasm</div>
        <div className={styles.row_group_column_header}>sql.js</div>
        <div className={styles.row_group_column_header}>Arquero</div>
        <div className={styles.row_group_column_header}>Lovefield</div>
    </>
);

interface GroupProps {
    id: number;
    bk: string;
    d: GroupedBenchmarks;
    title: string;
    m: Metric;
}

const BASE_COLOR_HUE = 56;
const BASE_COLOR_SATURATION = 1.0;
const BASE_COLOR_LIGHTNESS = 0.5;

const BenchmarkRow: React.FC<GroupProps> = (props: GroupProps) => {
    const elements: React.ReactElement[] = [];
    const values: (string | null)[] = [];
    const colors: (string | null)[] = [];
    const warnings: (string | null)[] = [];

    if (props.m == Metric.MEAN_TIME) {
        const entries = [];
        let minMeanTime = Number.POSITIVE_INFINITY;
        let maxMeanTime = 0.0;
        for (let i = 0; i < SYSTEMS.length; ++i) {
            const system = SYSTEMS[i];
            const entry = props.d.entries.get(`${props.bk}_${system}`);
            entries.push(entry);
            minMeanTime = Math.min(minMeanTime, entry?.meanTime || Number.POSITIVE_INFINITY);
            maxMeanTime = Math.max(maxMeanTime, entry?.meanTime || 0.0);
        }
        maxMeanTime = Math.min(minMeanTime * 4, maxMeanTime);
        for (const entry of entries) {
            if (entry === undefined) {
                values.push(null);
                colors.push(null);
                warnings.push(null);
                continue;
            }
            const cappedMeanTime = Math.min(entry.meanTime, maxMeanTime);
            const factor = (cappedMeanTime - minMeanTime) / (maxMeanTime - minMeanTime);
            values.push(`${(entry.meanTime / 1000).toFixed(3)} s`);
            colors.push(
                `hsl(${BASE_COLOR_HUE},${BASE_COLOR_SATURATION * 100}%,${
                    (BASE_COLOR_LIGHTNESS + 0.4 * factor) * 100
                }%)`,
            );
            warnings.push(entry.warning == '' ? null : entry.warning);
        }
    } else if (props.m == Metric.FREQUENCY) {
        const entries = [];
        let maxFrequency = 0.0;
        for (let i = 0; i < SYSTEMS.length; ++i) {
            const system = SYSTEMS[i];
            const entry = props.d.entries.get(`${props.bk}_${system}`);
            entries.push(entry);
            const meanTime = entry?.meanTime || 0.0;
            maxFrequency = Math.max(maxFrequency, meanTime == 0 ? 0 : 1 / meanTime);
        }
        for (const entry of entries) {
            if (entry === undefined) {
                values.push(null);
                colors.push(null);
                warnings.push(null);
                continue;
            }
            const freq = entry.meanTime == 0 ? 0 : 1 / entry.meanTime;
            const factor = 1 - freq / maxFrequency;
            values.push(`${freq.toFixed(3)} hz`);
            colors.push(
                `hsl(${BASE_COLOR_HUE},${BASE_COLOR_SATURATION * 100}%,${
                    (BASE_COLOR_LIGHTNESS + 0.4 * factor) * 100
                }%)`,
            );
            warnings.push(entry.warning == '' ? null : entry.warning);
        }
    }
    for (let i = 0; i < values.length; ++i) {
        const id = props.id * SYSTEMS.length + i;
        const value = values[i];
        const color = colors[i];
        const warning = warnings[i];
        if (value == null || color == null) {
            elements.push(
                <div key={id} className={styles.table_entry_missing}>
                    -
                </div>,
            );
        } else {
            elements.push(
                <div key={id} className={styles.table_entry} style={{ backgroundColor: color }}>
                    <div className={styles.table_entry_value}>{value}</div>
                    {warning && (
                        <div className={styles.table_entry_icon}>
                            <svg width="12px" height="12px">
                                <use xlinkHref={`${warn}#sym`} />
                            </svg>
                        </div>
                    )}
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
    data: GroupedBenchmarks;
}

export const BenchmarkTable: React.FC<Props> = (props: Props) => {
    return (
        <div className={styles.table}>
            <div className={styles.row_group_container}>
                <div className={styles.row_group}>
                    <BenchmarkGroupHeader key="tpch_05" title="TPCH 0.5" />
                    <BenchmarkRow id={91} bk="tpch_05_1" title="1" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={92} bk="tpch_05_2" title="2" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={93} bk="tpch_05_3" title="3" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={94} bk="tpch_05_4" title="4" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={95} bk="tpch_05_5" title="5" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={96} bk="tpch_05_6" title="6" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={97} bk="tpch_05_7" title="7" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={98} bk="tpch_05_8" title="8" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={99} bk="tpch_05_9" title="9" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={100} bk="tpch_05_10" title="10" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={101} bk="tpch_05_11" title="11" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={102} bk="tpch_05_12" title="12" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={103} bk="tpch_05_13" title="13" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={104} bk="tpch_05_14" title="14" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={105} bk="tpch_05_15" title="15" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={106} bk="tpch_05_16" title="16" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={107} bk="tpch_05_17" title="17" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={108} bk="tpch_05_18" title="18" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={109} bk="tpch_05_19" title="19" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={110} bk="tpch_05_20" title="20" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={111} bk="tpch_05_21" title="21" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={112} bk="tpch_05_22" title="22" d={props.data} m={Metric.MEAN_TIME} />
                </div>
            </div>
            <div className={styles.row_group_container}>
                <div className={styles.row_group}>
                    <BenchmarkGroupHeader key="tpch_025" title="TPCH 0.25" />
                    <BenchmarkRow id={61} bk="tpch_025_1" title="1" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={62} bk="tpch_025_2" title="2" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={63} bk="tpch_025_3" title="3" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={64} bk="tpch_025_4" title="4" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={65} bk="tpch_025_5" title="5" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={66} bk="tpch_025_6" title="6" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={67} bk="tpch_025_7" title="7" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={68} bk="tpch_025_8" title="8" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={69} bk="tpch_025_9" title="9" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={70} bk="tpch_025_10" title="10" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={71} bk="tpch_025_11" title="11" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={72} bk="tpch_025_12" title="12" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={73} bk="tpch_025_13" title="13" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={74} bk="tpch_025_14" title="14" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={75} bk="tpch_025_15" title="15" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={76} bk="tpch_025_16" title="16" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={77} bk="tpch_025_17" title="17" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={78} bk="tpch_025_18" title="18" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={79} bk="tpch_025_19" title="19" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={80} bk="tpch_025_20" title="20" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={81} bk="tpch_025_21" title="21" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={82} bk="tpch_025_22" title="22" d={props.data} m={Metric.MEAN_TIME} />
                </div>
            </div>
            <div className={styles.row_group_container}>
                <div className={styles.row_group}>
                    <BenchmarkGroupHeader key="tpch_01" title="TPCH 0.1" />
                    <BenchmarkRow id={31} bk="tpch_01_1" title="1" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={32} bk="tpch_01_2" title="2" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={33} bk="tpch_01_3" title="3" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={34} bk="tpch_01_4" title="4" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={35} bk="tpch_01_5" title="5" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={36} bk="tpch_01_6" title="6" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={37} bk="tpch_01_7" title="7" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={38} bk="tpch_01_8" title="8" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={39} bk="tpch_01_9" title="9" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={40} bk="tpch_01_10" title="10" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={41} bk="tpch_01_11" title="11" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={42} bk="tpch_01_12" title="12" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={43} bk="tpch_01_13" title="13" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={44} bk="tpch_01_14" title="14" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={45} bk="tpch_01_15" title="15" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={46} bk="tpch_01_16" title="16" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={47} bk="tpch_01_17" title="17" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={48} bk="tpch_01_18" title="18" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={49} bk="tpch_01_19" title="19" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={50} bk="tpch_01_20" title="20" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={51} bk="tpch_01_21" title="21" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={52} bk="tpch_01_22" title="22" d={props.data} m={Metric.MEAN_TIME} />
                </div>
            </div>
            <div className={styles.row_group_container}>
                <div className={styles.row_group}>
                    <BenchmarkGroupHeader key="tpch_001" title="TPCH 0.01" />
                    <BenchmarkRow id={1} bk="tpch_001_1" title="1" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={2} bk="tpch_001_2" title="2" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={3} bk="tpch_001_3" title="3" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={4} bk="tpch_001_4" title="4" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={5} bk="tpch_001_5" title="5" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={6} bk="tpch_001_6" title="6" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={7} bk="tpch_001_7" title="7" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={8} bk="tpch_001_8" title="8" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={9} bk="tpch_001_9" title="9" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={10} bk="tpch_001_10" title="10" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={11} bk="tpch_001_11" title="11" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={12} bk="tpch_001_12" title="12" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={13} bk="tpch_001_13" title="13" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={14} bk="tpch_001_14" title="14" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={15} bk="tpch_001_15" title="15" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={16} bk="tpch_001_16" title="16" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={17} bk="tpch_001_17" title="17" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={18} bk="tpch_001_18" title="18" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={19} bk="tpch_001_19" title="19" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={20} bk="tpch_001_20" title="20" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={21} bk="tpch_001_21" title="21" d={props.data} m={Metric.MEAN_TIME} />
                    <BenchmarkRow id={22} bk="tpch_001_22" title="22" d={props.data} m={Metric.MEAN_TIME} />
                </div>
            </div>
            <div className={styles.row_group_container}>
                <div className={styles.row_group}>
                    <BenchmarkGroupHeader key="tpch_001" title="Micro Benchmarks" />
                    <BenchmarkRow
                        id={1002}
                        bk="integer_sum_1000_10"
                        title="sum-i32-1k-1"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={1002}
                        bk="integer_sum_10000_10"
                        title="sum-i32-10k-10"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={1002}
                        bk="integer_sum_100000_10"
                        title="sum-i32-100k-10"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow id={1000} bk="regex_1000_20" title="regex-1k" d={props.data} m={Metric.FREQUENCY} />
                    <BenchmarkRow id={1000} bk="regex_10000_20" title="regex-10k" d={props.data} m={Metric.FREQUENCY} />
                    <BenchmarkRow
                        id={1000}
                        bk="regex_100000_20"
                        title="regex-100k"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_sort_1000_1_1"
                        title="sort-i32-1k"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_sort_10000_1_1"
                        title="sort-i32-10k"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_sort_100000_1_1"
                        title="sort-i32-100k"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_sort_1000_2_2"
                        title="sort-i32x2-1k"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_sort_10000_2_2"
                        title="sort-i32x2-10k"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_sort_100000_2_2"
                        title="sort-i32x2-100k"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_topk_1000_1_1_100"
                        title="top100-1k"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_topk_10000_1_1_100"
                        title="top100-10k"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_topk_100000_1_1_100"
                        title="top100-100k"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={1003}
                        bk="integer_join2_1000_10000_10_100"
                        title="leftdeep-2-s"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={1003}
                        bk="integer_join2_10000_100000_10_100"
                        title="leftdeep-2-m"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={1003}
                        bk="integer_join2_100000_100000_10_100"
                        title="leftdeep-2-l"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={1003}
                        bk="integer_join2_100000_1000000_10_100"
                        title="leftdeep-2-xl"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={1003}
                        bk="integer_join3_10_100_1000_10_10_10"
                        title="leftdeep-3-s"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_join3_100_1000_10000_10_10_100"
                        title="leftdeep-3-m"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_join3_1000_10000_100000_10_10_100"
                        title="leftdeep-3-l"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                    <BenchmarkRow
                        id={2}
                        bk="integer_join3_10000_100000_1000000_10_10_100"
                        title="leftdeep-3-xl"
                        d={props.data}
                        m={Metric.FREQUENCY}
                    />
                </div>
            </div>
        </div>
    );
};
