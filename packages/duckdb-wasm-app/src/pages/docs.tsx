import React from 'react';
import * as duckdb from '@duckdb/duckdb-wasm';
import styles from './docs.module.css';

export const Docs = (): React.ReactElement => (
    <div
        className={styles.root}
        dangerouslySetInnerHTML={{
            __html: `<iframe style="width:100%; height:100%" src='docs/index.html?version=${duckdb.PACKAGE_VERSION}' />`,
        }}
    />
);

export default Docs;
