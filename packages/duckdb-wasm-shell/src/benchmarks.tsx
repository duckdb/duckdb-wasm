import React from 'react';

import styles from './benchmarks.module.css';

type Props = Record<string, string>;

export const Benchmarks: React.FC<Props> = (props: Props) => {
    return <div className={styles.root}>foo</div>;
};
