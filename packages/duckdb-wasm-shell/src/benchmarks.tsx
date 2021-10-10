import * as arrow from 'apache-arrow';
import React from 'react';
import styles from './benchmarks.module.css';

const DATA_URL = 'https://shell.duckdb.org/data/benchmarks.arrow';

type Props = Record<string, string>;

enum LoadingStatus {
    PENDING,
    INFLIGHT,
    FAILED,
    SUCCEEDED,
}

interface State {
    status: LoadingStatus;
    table: arrow.Table | null;
}

export const Benchmarks: React.FC<Props> = (props: Props) => {
    const [state, setState] = React.useState<State>({
        status: LoadingStatus.PENDING,
        table: null,
    });

    const fetch_data = async () => {
        const data = await fetch(DATA_URL);
        const buffer = await data.arrayBuffer();
        setState(s => ({
            ...s,
            status: LoadingStatus.SUCCEEDED,
            table: arrow.Table.from(new Uint8Array(buffer)),
        }));
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
