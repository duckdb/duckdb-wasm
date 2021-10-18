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
                            <h1>DuckDB-wasm versus X</h1>
                            <p className={styles.tldr}>
                                TL;DR: Consider <b>DuckDB-wasm</b> for efficient SQL queries, for file formats such as
                                JSON, CSV, Arrow, Parquet, for partial file reads (locally & remote), for shared SQL
                                queries between client and server and for larger datasets. Consider an alternative for
                                simple queries on &lt;= 10k tuples or if bundle size and cold startup time are more
                                important than query performance.
                            </p>
                            <p className={styles.section_text}>
                                This page outlines advantages and disadvantages of the npm library
                                <a
                                    className={styles.section_link}
                                    target="_blank"
                                    href="https://www.npmjs.com/package/@duckdb/duckdb-wasm"
                                    rel="noreferrer"
                                >
                                    @duckdb/duckdb-wasm
                                </a>
                                . It compares the library with the projects
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
                                for your next data processing library in the web. All benchmarks are measured using
                                public GitHub Actions and are therefore affected by fluctuations. Feel free to modify
                                and extend our benchmarks
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
                            <h2>General Features</h2>
                            <p className={styles.section_text}>
                                DuckDB-wasm follows the philosophy of <i>bundling with batteries included</i> to
                                leverage the full potential of WebAssembly as an embedded database. DuckDB-wasm
                                implements many features that are necessary for efficient ad-hoc analytics in the
                                browser such as a full SQL frontend and automatic Web-Worker offloading. It also comes
                                with a powerful virtual filesystem specifically tailored to the browser that allows for
                                partially reading files either through HTTP range requests or the HTML 5 File APIs.
                                Additionally, DuckDB-wasm supports a variety of file formats out-of-the-box such as CSV,
                                JSON, Arrow and Parquet.
                            </p>
                            <p className={styles.section_text}>
                                The following table provides an overview of key features in DuckDB-wasm:
                            </p>
                            <FeatureTable className={styles.feature_table} />
                            <p className={styles.section_text}>
                                The broad function scope comes at the price of a larger bundle size. When using the
                                asynchronous version of DuckDB-wasm, the database requires approximately XX KB of
                                compressed javascript and a XX MB compressed WebAssembly Module. Modern browsers provide
                                some relief in regards to the large module size as WebAssembly can be instantiated in a
                                streaming fashion, which means that browsers can already compile the module while
                                downloading it. This can reduce the initial startup latency but won&apos;t eliminate the
                                bandwidth requirement with cold caches.
                            </p>
                            <p className={styles.section_text}>
                                DuckDB-wasm can therefore show its strengths in situations where this initial startup
                                latency can be concealed. DuckDB-wasm might not <i>yet</i> be the right tool for you, if
                                you&apos;re aiming for a smallest-possible duration until your website is fully
                                interactive. Reducing this latency is still subject of ongoing research, please share
                                your thoughts with us
                                <a
                                    className={styles.section_link}
                                    target="_blank"
                                    href="https://github.com/duckdb/duckdb-wasm/discussions"
                                    rel="noreferrer"
                                >
                                    here
                                </a>
                                .
                            </p>
                        </PageSection>
                        <PageSection>
                            <h2>TPC-H Benchmarks</h2>
                            <p className={styles.section_text}>
                                The biggest strength of DuckDB-wasm is its capability to run complex analytical queries
                                in the web browser or isolated environments such as WebAssembly CDN Workers. In the
                                past, these workloads have usually been pushed to more powerful database servers since
                                the language Javascript is not well equipped to evaluate complex queries efficiently.
                                Today, the WebAssembly MVP has landed in most browsers serves as a herald for disruptive
                                changes in this traditional client-server world. With WebAssembly, browsers are now
                                capable to perform many tasks themselves which allows for more decentralized data
                                processing.
                            </p>
                            <p className={styles.section_text}>
                                TPC-H is a decision support benchmark that is commonly used to benchmark relational
                                database systems. It contains 22 queries on 8 relations with a schema that can be found
                                <a
                                    className={styles.section_link}
                                    target="_blank"
                                    href="https://github.com/duckdb/duckdb/blob/master/tools/rest/frontend/images/tpch-schema.png"
                                    rel="noreferrer"
                                >
                                    here
                                </a>
                                . The benchmark can be resized using a single scale factor. A scale factor of 0.1 refers
                                to approximately 100 MB of combined data. Most of the 22 queries in TPC-H go beyond
                                simple scans or filters and introduce the additional challenge of general query
                                optimization.
                            </p>
                            <p className={styles.section_text}>
                                In the following benchmarks, we measured TPC-H queries at the scale factors 0.01, 0.1,
                                0.25 and 0.5. Sqljs is a WebAssembly version of SQLite and thus supports TPC-H out of
                                the box. Lovefield only supports a custom SQL-like API but optimizes query plans
                                internally. Yet, Lovefield does not support arithmetic operations and nested subqueries
                                within the plan which made it difficult to run some of the more complex TPC-H queries.
                                Arquero only provides a DataFrame-like API without any upfront optimization. We
                                therefore rebuilt the TPC-H queries in Arquero using the optimized plans produced by the
                                optimizer of a relational database. We include these manual plans to present the
                                interesting performance characteristics of Arquero and show that optimizing the plans by
                                hand is usually
                                <a
                                    className={styles.section_link}
                                    target="_blank"
                                    href="https://github.com/duckdb/duckdb-wasm/blob/master/packages/benchmarks/src/system/arquero_benchmarks.ts"
                                    rel="noreferrer"
                                >
                                    non-trivial
                                </a>
                                .
                            </p>
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
