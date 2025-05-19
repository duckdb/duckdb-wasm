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
        const table = arrow.tableFromIPC(new Uint8Array(buffer));
        setState(s => {
            const entries = readBenchmarks(table);
            const grouped = groupBenchmarks(entries);
            console.log(grouped);
            return {
                ...s,
                status: LoadingStatus.SUCCEEDED,
                table: table,
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
                            <h1>DuckDB-Wasm versus X</h1>
                            <p className={styles.tldr}>
                                TL;DR: Consider <b>DuckDB-Wasm</b> for efficient SQL queries, for file formats such as
                                JSON, CSV, Arrow, Parquet, for partial file reads (locally & remote), for shared SQL
                                queries between client and server and for larger datasets. Consider an alternative for
                                simple queries on &lt;= 10k tuples or if bundle size and cold startup time are more
                                important than query performance.
                            </p>
                            <p className={styles.section_text}>
                                This page outlines advantages and disadvantages of the npm library
                                <a
                                    className={styles.link}
                                    target="_blank"
                                    href="https://www.npmjs.com/package/@motherduck/duckdb-wasm"
                                    rel="noreferrer"
                                >
                                    @motherduck/duckdb-wasm
                                </a>
                                . It compares the library with the projects
                                <a
                                    className={styles.link}
                                    target="_blank"
                                    href="https://github.com/sql-js/sql.js"
                                    rel="noreferrer"
                                >
                                    sql.js
                                </a>
                                ,
                                <a
                                    className={styles.link}
                                    target="_blank"
                                    href="https://github.com/uwdata/arquero"
                                    rel="noreferrer"
                                >
                                    arquero
                                </a>
                                &nbsp;and
                                <a
                                    className={styles.link}
                                    target="_blank"
                                    href="https://github.com/google/lovefield"
                                    rel="noreferrer"
                                >
                                    lovefield
                                </a>
                                &nbsp;based on features, several microbenchmarks and the TPC-H benchmark at the scale
                                factors 0.01, 0.1, 0.25 and 0.5. It is meant to guide you through the selection process
                                of your next data processing library for the web. All benchmarks are measured using
                                public GitHub Actions and are therefore affected by fluctuations. Feel free to modify
                                and extend our benchmarks
                                <a
                                    className={styles.link}
                                    target="_blank"
                                    href="https://github.com/duckdb/duckdb-wasm/tree/main/packages/benchmarks"
                                    rel="noreferrer"
                                >
                                    here
                                </a>
                                .
                            </p>
                        </PageSection>
                        <PageSection>
                            <h2 className={styles.header2}>General Features</h2>
                            <p className={styles.section_text}>
                                DuckDB-Wasm follows the philosophy of <i>bundling with batteries included</i> to
                                leverage the full potential of WebAssembly as an embedded database. DuckDB-wasm
                                implements many features that are necessary for efficient ad-hoc analytics in the
                                browser such as a full SQL frontend and automatic Web-Worker offloading. It also comes
                                with a powerful virtual filesystem specifically tailored to the browser that allows for
                                partially reading files either through HTTP range requests or the HTML 5 File APIs.
                                Additionally, DuckDB-Wasm supports a variety of file formats out-of-the-box such as CSV,
                                JSON, Arrow and Parquet.
                            </p>
                            <p className={styles.section_text}>
                                The following table provides an overview of key features in DuckDB-Wasm:
                            </p>
                            <FeatureTable className={styles.feature_table} />
                            <p className={styles.section_text}>
                                The broad function scope comes at the price of a larger bundle size. When using the
                                synchronous version of DuckDB-Wasm, the database requires approximately 68 KB of
                                compressed Javascript and a 2.5 MB brotli compressed WebAssembly Module. Modern browsers reduce
                                the impact of the large module sizes by instantiating WebAssembly in a streaming
                                fashion. Browsers start compiling WebAssembly modules while downloading them which can
                                reduce the initial startup latency but won&apos;t eliminate the bandwidth requirement
                                with cold caches.
                            </p>
                            <p className={styles.section_text}>
                                DuckDB-Wasm can therefore show its strengths in situations where this initial startup
                                latency can be concealed. DuckDB-Wasm might not <i>yet</i> be the right tool for you, if
                                you&apos;re aiming for a smallest-possible duration until your website is fully
                                interactive. Reducing this latency is still subject of ongoing research, please share
                                your thoughts with us
                                <a
                                    className={styles.link}
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
                            <h2 className={styles.header2}>TPC-H Benchmarks</h2>
                            <p className={styles.section_text}>
                                The biggest strength of DuckDB-Wasm is its capability to run complex analytical queries
                                in the web browser or in isolated environments such as WebAssembly CDN Workers. In the
                                past, these workloads have usually been pushed to more powerful database servers since
                                the language Javascript is not well equipped to evaluate complex queries efficiently.
                                Today, the WebAssembly MVP has landed in most browsers and serves as a herald for
                                disruptive changes in this traditional client-server world. With WebAssembly, browsers
                                are now capable to perform many tasks themselves which allows for more decentralized
                                data processing.
                            </p>
                            <p className={styles.section_text}>
                                TPC-H is a decision support benchmark that is commonly used to benchmark relational
                                database systems. It contains 22 queries on 8 relations with a schema that can be found
                                <a
                                    className={styles.link}
                                    target="_blank"
                                    href="https://github.com/duckdb/duckdb/blob/main/tools/rest/frontend/images/tpch-schema.png"
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
                                In the following benchmarks, we measure TPC-H queries at the scale factors 0.01, 0.1,
                                0.25 and 0.5. Sqljs is a WebAssembly version of SQLite and thus supports TPC-H out of
                                the box. Lovefield only supports a custom SQL-like API but optimizes query plans
                                internally. Yet, Lovefield does not support arithmetic operations and nested subqueries
                                within the plan which makes it difficult to run some of the more complex TPC-H queries.
                                Arquero only provides a DataFrame-like API without any upfront optimization. We
                                therefore manually crafted the TPC-H queries in Arquero using the optimized plans
                                produced by the optimizer of a relational database. We include these plans to present
                                the interesting performance characteristics of Arquero and show that optimizing the
                                plans by hand is usually
                                <a
                                    className={styles.link}
                                    target="_blank"
                                    href="https://github.com/duckdb/duckdb-wasm/blob/main/packages/benchmarks/src/system/arquero_benchmarks.ts"
                                    rel="noreferrer"
                                >
                                    non-trivial
                                </a>
                                .
                            </p>
                            <BenchmarkTableTPCH
                                className={styles.tpch_table}
                                data={state.benchmarks!}
                                scaleFactor={0.5}
                            />
                            <BenchmarkTableTPCH
                                className={styles.tpch_table}
                                data={state.benchmarks!}
                                scaleFactor={0.25}
                            />
                            <BenchmarkTableTPCH
                                className={styles.tpch_table}
                                data={state.benchmarks!}
                                scaleFactor={0.1}
                            />
                            <BenchmarkTableTPCH
                                className={styles.tpch_table}
                                data={state.benchmarks!}
                                scaleFactor={0.01}
                            />
                            <p className={styles.section_text}>
                                The benchmarks show that DuckDB-Wasm outperforms the competition by a factor of 10 - 100
                                on larger data sizes. They also show that this relative speedup shrinks on smaller scale
                                factors. On scale factor 0.01 (10MB), all three alternatives are able to compete for a
                                small subset of the queries. This is caused by the interface design of DuckDB-Wasm that
                                always materializes input and output as Arrow IPC streams. If the query performs only
                                very little work, the overhead through this serialization and copying can outweigh the
                                increased processing efficiency.
                            </p>
                        </PageSection>
                        <PageSection>
                            <h2 className={styles.header2}>Microbenchmarks</h2>
                            <p className={styles.section_text}>
                                TPC-H is unrealistically complex, you might say? We&apos;d like to argue that the
                                absence of more demanding analytical processing in the browser is rooted in the
                                ingrained limitations of Javascript that were only lifted very recently. Nevertheless,
                                we want to dedicate this section to a few less complex microbenchmarks that demonstrate
                                pros and cons of the measured systems.
                            </p>
                            <p className={styles.section_text}>
                                The following table lists seven microbenchmarks that were scaled at least three times.
                                We observe consistently accross all of them that DuckDB-Wasm loses against libraries
                                like Arquero if the data contains only 1000 rows. Tasks like adding up a single native
                                integer array are simple enough that the overhead of the WebAssembly interaction will
                                easily eat up any performance benefits. The situation becomes even worse in the regex
                                microbenchmark since WebAssembly additionally has to pay for UTF-8/16 conversions.
                                Sorting and Top-K on the other hand is an interesting case for WebAssembly since sorting
                                fast is
                                <a
                                    className={styles.link}
                                    target="_blank"
                                    href="https://duckdb.org/2021/08/27/external-sorting.html"
                                    rel="noreferrer"
                                >
                                    non-trivial
                                </a>
                                and arguably better implemented in C++. The last two benchmarks first filter very few
                                integers of a small relation and then join them with either one or two additional
                                slightly larger relations.
                            </p>
                            <BenchmarkTableMicro className={styles.micro_table} data={state.benchmarks!} />
                            <p className={styles.section_text}>
                                These micro benchmarks show that there is also <i>no such thing as free lunch</i> in the
                                browser. We are paying for the increased processing efficiency in WebAssembly with a
                                sightly less efficient evaluation on very small input. Our recommendation is therefore
                                to use DuckDB-Wasm if you need SQL, the features or the raw speed on medium to large
                                data sizes. Stick to existing frameworks if your dataset is very small or if your
                                queries only contain simple scans and filters.
                            </p>
                        </PageSection>
                    </div>
                </div>
            );
    }
};
