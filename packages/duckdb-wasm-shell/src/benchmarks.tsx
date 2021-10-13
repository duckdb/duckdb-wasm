import * as arrow from 'apache-arrow';
import React from 'react';
import styles from './benchmarks.module.css';
import { BenchmarkType, readBenchmarks, groupBenchmarks, GroupedBenchmarks } from './benchmark_reader';
import { BenchmarkTable } from './benchmark_table';

const DATA_URL = 'https://shell.duckdb.org/data/benchmarks.arrow?31';

enum LoadingStatus {
    PENDING,
    INFLIGHT,
    FAILED,
    SUCCEEDED,
}

type Props = Record<string, string>;

interface State {
    status: LoadingStatus;
    benchmarkTable: arrow.Table<BenchmarkType> | null;
    benchmarks: GroupedBenchmarks | null;
}

export const Benchmarks: React.FC<Props> = (props: Props) => {
    const [state, setState] = React.useState<State>({
        status: LoadingStatus.PENDING,
        benchmarkTable: null,
        benchmarks: null,
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

    if (state.status == LoadingStatus.PENDING) {
        setState(s => ({
            ...s,
            status: LoadingStatus.INFLIGHT,
        }));
        fetch_data();
        return <div className={styles.root}>loading</div>;
    }
    if (state.benchmarks == null || state.status == LoadingStatus.FAILED) {
        return <div className={styles.root}>failed</div>;
    }
    return (
        <div className={styles.root}>
            <BenchmarkTable data={state.benchmarks!} />
        </div>
    );
};
