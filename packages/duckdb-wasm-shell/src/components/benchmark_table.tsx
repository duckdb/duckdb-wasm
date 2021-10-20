import React from 'react';
import cn from 'classnames';
import { GroupedBenchmarks } from '../model/benchmark_reader';
import { MiniBarChart } from './minibar_chart';
import { usePopperTooltip } from 'react-popper-tooltip';

import styles from './benchmark_table.module.css';
import warn from '../../static/svg/icons/warn.svg';

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
        <div className={styles.table_title}>{props.title}</div>
        <div className={styles.table_anchor} />
        <div className={styles.table_column_header}>DuckDB-wasm</div>
        <div className={styles.table_column_header}>sql.js</div>
        <div className={styles.table_column_header}>Arquero</div>
        <div className={styles.table_column_header}>Lovefield</div>
    </>
);

interface WithWarningProps {
    children: React.ReactFragment;
    warning: string;
    className: string;
}

const WithWarning: React.FC<WithWarningProps> = (props: WithWarningProps) => {
    const { getArrowProps, getTooltipProps, setTooltipRef, setTriggerRef, visible } = usePopperTooltip();
    return (
        <div ref={setTriggerRef} className={props.className}>
            {props.children}
            {visible && (
                <div
                    ref={setTooltipRef}
                    {...getTooltipProps({ className: cn('tooltip-container', styles.table_entry_tooltip) })}
                >
                    <div {...getArrowProps({ className: 'tooltip-arrow' })} />
                    {props.warning}
                </div>
            )}
        </div>
    );
};

interface GroupProps {
    id: number;
    bk: string;
    d: GroupedBenchmarks;
    title: string;
    m: Metric;
}

const BenchmarkRow: React.FC<GroupProps> = (props: GroupProps) => {
    const elements: React.ReactElement[] = [];
    const valueStrings: (string | null)[] = [];
    const valueFractions: number[] = [];
    const warnings: (string | null)[] = [];

    if (props.m == Metric.MEAN_TIME) {
        const entries = [];
        let minMeanTime = Number.POSITIVE_INFINITY;
        let maxMeanTime = 0.0;
        let maxFrequency = 0.0;
        for (let i = 0; i < SYSTEMS.length; ++i) {
            const system = SYSTEMS[i];
            const entry = props.d.entries.get(`${props.bk}_${system}`);
            const meanTime = entry?.meanTime || 0.0;
            entries.push(entry);
            minMeanTime = Math.min(minMeanTime, entry?.meanTime || Number.POSITIVE_INFINITY);
            maxMeanTime = Math.max(maxMeanTime, entry?.meanTime || 0.0);
            maxFrequency = Math.max(maxFrequency, meanTime == 0 ? 0 : 1 / meanTime);
        }
        for (const entry of entries) {
            if (entry === undefined) {
                valueFractions.push(0.0);
                valueStrings.push(null);
                warnings.push(null);
                continue;
            }
            valueFractions.push((entry?.meanTime == 0 ? 0 : 1 / entry?.meanTime) / maxFrequency);
            valueStrings.push(`${(entry.meanTime / 1000).toFixed(3)} s`);
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
                valueFractions.push(0.0);
                valueStrings.push(null);
                warnings.push(null);
                continue;
            }
            const freq = entry.meanTime == 0 ? 0 : 1 / entry.meanTime;
            valueFractions.push(freq / maxFrequency);
            valueStrings.push(`${freq.toFixed(2)} hz`);
            warnings.push(entry.warning == '' ? null : entry.warning);
        }
    }
    for (let i = 0; i < valueStrings.length; ++i) {
        const id = props.id * SYSTEMS.length + i;
        const fraction = valueFractions[i];
        const value = valueStrings[i];
        const warning = warnings[i];
        if (value == null) {
            elements.push(
                <div key={id} className={styles.table_entry_missing}>
                    -
                </div>,
            );
        } else if (warning) {
            elements.push(
                <WithWarning key={id} className={styles.table_entry} warning={warning!}>
                    <div className={styles.table_entry_value}>{value}</div>
                    <div className={styles.table_entry_icon}>
                        <svg width="12px" height="12px">
                            <use xlinkHref={`${warn}#sym`} />
                        </svg>
                    </div>
                    <MiniBarChart className={styles.table_entry_bar} value={fraction} />
                </WithWarning>,
            );
        } else {
            elements.push(
                <div key={id} className={styles.table_entry}>
                    <div className={styles.table_entry_value}>{value}</div>
                    <MiniBarChart className={styles.table_entry_bar} value={fraction} />
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

interface TableProps {
    className?: string;
    data: GroupedBenchmarks;
}

interface TPCHTableProps extends TableProps {
    scaleFactor: number;
}

export const BenchmarkTableTPCH: React.FC<TPCHTableProps> = (props: TPCHTableProps) => {
    const sf = props.scaleFactor.toString().replace(/\.|,/, '');
    const rows = [];
    for (let i = 1; i <= 22; ++i) {
        rows.push(
            <BenchmarkRow key={i} id={i} bk={`tpch_${sf}_${i}`} title={`${i}`} d={props.data} m={Metric.MEAN_TIME} />,
        );
    }
    return (
        <div className={cn(styles.table_container, props.className)}>
            <div className={styles.table}>
                <BenchmarkGroupHeader key={`tpch_${sf}`} title={`TPCH ${props.scaleFactor}`} />
                {rows}
            </div>
        </div>
    );
};

export const BenchmarkTableMicro: React.FC<TableProps> = (props: TableProps) => (
    <div className={cn(styles.table_container, props.className)}>
        <div className={styles.table}>
            <BenchmarkGroupHeader key="micro" title="Micro Benchmarks" />
            <BenchmarkRow id={1} bk="integer_sum_1000_10" title="sum-i32-1k-1" d={props.data} m={Metric.FREQUENCY} />
            <BenchmarkRow id={2} bk="integer_sum_10000_10" title="sum-i32-10k-10" d={props.data} m={Metric.FREQUENCY} />
            <BenchmarkRow
                id={3}
                bk="integer_sum_100000_10"
                title="sum-i32-100k-10"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow id={4} bk="regex_1000_20" title="regex-1k" d={props.data} m={Metric.FREQUENCY} />
            <BenchmarkRow id={5} bk="regex_10000_20" title="regex-10k" d={props.data} m={Metric.FREQUENCY} />
            <BenchmarkRow id={6} bk="regex_100000_20" title="regex-100k" d={props.data} m={Metric.FREQUENCY} />
            <BenchmarkRow id={7} bk="integer_sort_1000_1_1" title="sort-i32-1k" d={props.data} m={Metric.FREQUENCY} />
            <BenchmarkRow id={8} bk="integer_sort_10000_1_1" title="sort-i32-10k" d={props.data} m={Metric.FREQUENCY} />
            <BenchmarkRow
                id={9}
                bk="integer_sort_100000_1_1"
                title="sort-i32-100k"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={10}
                bk="integer_sort_1000_2_2"
                title="sort-i32x2-1k"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={11}
                bk="integer_sort_10000_2_2"
                title="sort-i32x2-10k"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={12}
                bk="integer_sort_100000_2_2"
                title="sort-i32x2-100k"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={13}
                bk="integer_topk_1000_1_1_100"
                title="top100-1k"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={14}
                bk="integer_topk_10000_1_1_100"
                title="top100-10k"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={15}
                bk="integer_topk_100000_1_1_100"
                title="top100-100k"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={16}
                bk="integer_join2_1000_10000_10_100"
                title="leftdeep-2-s"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={17}
                bk="integer_join2_10000_100000_10_100"
                title="leftdeep-2-m"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={18}
                bk="integer_join2_100000_100000_10_100"
                title="leftdeep-2-l"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={19}
                bk="integer_join2_100000_1000000_10_100"
                title="leftdeep-2-xl"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={20}
                bk="integer_join3_10_100_1000_10_10_10"
                title="leftdeep-3-s"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={21}
                bk="integer_join3_100_1000_10000_10_10_100"
                title="leftdeep-3-m"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={22}
                bk="integer_join3_1000_10000_100000_10_10_100"
                title="leftdeep-3-l"
                d={props.data}
                m={Metric.FREQUENCY}
            />
            <BenchmarkRow
                id={23}
                bk="integer_join3_10000_100000_1000000_10_10_100"
                title="leftdeep-3-xl"
                d={props.data}
                m={Metric.FREQUENCY}
            />
        </div>
    </div>
);
