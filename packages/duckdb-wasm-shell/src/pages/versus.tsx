import * as arrow from 'apache-arrow';
import React from 'react';
import { PageSection } from '../components/page_structure';
import { BenchmarkType, readBenchmarks, groupBenchmarks, GroupedBenchmarks } from '../model/benchmark_reader';
import { BenchmarkTableTPCH, BenchmarkTableMicro } from '../components/benchmark_table';
import { FeatureTable } from '../components/feature_table';
import { RectangleWaveSpinner } from '../components/spinners';

import styles from './versus.module.css';

const DATA_URL = 'https://shell.duckdb.org/data/benchmarks.arrow?35';

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

export const Versus: React.FC<Props> = (props: Props) => {
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
    }

    switch (state.status) {
        case LoadingStatus.PENDING:
        case LoadingStatus.INFLIGHT:
            return (
                <div className={styles.root_spinner}>
                    <RectangleWaveSpinner active />
                </div>
            );
        case LoadingStatus.FAILED:
            return <div className={styles.root}>failed</div>;
        case LoadingStatus.SUCCEEDED:
            return (
                <div className={styles.root}>
                    <div className={styles.content}>
                        <PageSection>
                            <h1>DuckDB versus X</h1>
                            <p className={styles.tldr}>
                                TL;DR: Consider <b>DuckDB-wasm</b> for efficient SQL queries, for file formats such as
                                JSON, CSV, Arrow, Parquet, for partial file reads (locally & remote), for shared SQL
                                queries between client and server and for larger datasets. Consider an alternative for
                                simple queries on &lt;= 10k tuples or if bundle size and cold startup time are more
                                important than query performance.
                            </p>
                            <p className={styles.section_text}>
                                This page outlines advantages and disadvantages of
                                <a
                                    className={styles.section_link}
                                    target="_blank"
                                    href="https://www.npmjs.com/package/@duckdb/duckdb-wasm"
                                    rel="noreferrer"
                                >
                                    @duckdb/duckdb-wasm
                                </a>
                                . It compares the npm library with the projects
                                <a
                                    className={styles.section_link}
                                    target="_blank"
                                    href="https://github.com/sql-js/sql.js"
                                    rel="noreferrer"
                                >
                                    sql.js
                                </a>
                                ,
                                <a
                                    className={styles.section_link}
                                    target="_blank"
                                    href="https://github.com/uwdata/arquero"
                                    rel="noreferrer"
                                >
                                    arquero
                                </a>
                                &nbsp;and
                                <a
                                    className={styles.section_link}
                                    target="_blank"
                                    href="https://https://github.com/google/lovefield"
                                    rel="noreferrer"
                                >
                                    lovefield
                                </a>
                                &nbsp;based on features, several microbenchmarks and the TPC-H benchmark at the scale
                                factors 0.01, 0.1, 0.25 and 0.5. It is meant to guide you through the selection process
                                for your next data processing library in the web. Feel free to modify or extend our
                                benchmarks
                                <a
                                    className={styles.section_link}
                                    target="_blank"
                                    href="https://github.com/duckdb/duckdb-wasm/tree/master/packages/benchmarks"
                                    rel="noreferrer"
                                >
                                    here
                                </a>
                                .
                            </p>
                        </PageSection>
                        <PageSection>
                            <h2>Feature Matrix</h2>
                            <p className={styles.section_text}>todo</p>
                            <FeatureTable />
                        </PageSection>
                        <PageSection>
                            <h2>TPC-H Benchmarks</h2>
                            <p className={styles.section_text}>todo</p>
                            <BenchmarkTableTPCH data={state.benchmarks!} scaleFactor={0.5} />
                            <BenchmarkTableTPCH data={state.benchmarks!} scaleFactor={0.25} />
                            <BenchmarkTableTPCH data={state.benchmarks!} scaleFactor={0.1} />
                            <BenchmarkTableTPCH data={state.benchmarks!} scaleFactor={0.01} />
                        </PageSection>
                        <PageSection>
                            <h2>Microbenchmarks</h2>
                            <p className={styles.section_text}>todo</p>
                            <BenchmarkTableMicro data={state.benchmarks!} />
                        </PageSection>
                    </div>
                </div>
            );
    }
};
