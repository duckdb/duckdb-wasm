import * as React from 'react';
import cn from 'classnames';

import styles from './minibar_chart.module.css';

interface Props {
    className?: string;
    value: number;
}

export const MiniBarChart: React.FC<Props> = (props: Props): React.ReactElement => (
    <div className={cn(styles.container, props.className)}>
        <div className={styles.bar}>
            <div
                className={styles.bar_fill}
                style={{
                    width: Math.max(1.0) * props.value * 100 + '%',
                }}
            />
        </div>
    </div>
);
