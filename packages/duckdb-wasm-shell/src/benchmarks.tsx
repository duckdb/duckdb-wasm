import * as arrow from 'apache-arrow';
import React from 'react';
import styles from './benchmarks.module.css';
import { BenchmarkType, readBenchmarks, groupBenchmarks, GroupedBenchmarks } from './benchmark_reader';

const DATA_URL = 'https://shell.duckdb.org/data/benchmarks.arrow';

enum LoadingStatus {
    PENDING,
    INFLIGHT,
    FAILED,
    SUCCEEDED,
}

type Props = Record<string, string>;

interface State {
    status: LoadingStatus;
    table: arrow.Table<BenchmarkType> | null;
    benchmarks: GroupedBenchmarks;
}

export const Benchmarks: React.FC<Props> = (props: Props) => {
    const [state, setState] = React.useState<State>({
        status: LoadingStatus.PENDING,
        table: null,
        benchmarks: {
            benchmarks: new Map(),
            systems: new Map(),
            entries: new Map(),
        },
    });

    const fetch_data = async () => {
        const data = await fetch(DATA_URL);
        const buffer = await data.arrayBuffer();
        setState(s => {
            const table = arrow.Table.from(new Uint8Array(buffer));
            const entries = readBenchmarks(table);
            const grouped = groupBenchmarks(entries);
            console.log(grouped);
            return {
                ...s,
                status: LoadingStatus.SUCCEEDED,
                table: arrow.Table.from(new Uint8Array(buffer)),
                benchmarks: grouped,
            };
        });
    };

    if (state.status == LoadingStatus.PENDING && state.table == null) {
        setState(s => ({
            ...s,
            status: LoadingStatus.INFLIGHT,
        }));
        fetch_data();
    }
    return <div className={styles.root}>foo</div>;
};
