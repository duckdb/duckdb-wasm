import * as React from 'react';
import classNames from 'classnames';
import styles from './spinners.module.css';

interface IRectangleWaveSpinnerProps {
    color?: string;
    active: boolean;
}

export class RectangleWaveSpinner extends React.PureComponent<IRectangleWaveSpinnerProps> {
    public render(): React.ReactElement {
        const s = {
            backgroundColor: this.props.color || 'white',
        };
        return (
            <div className={styles.rw}>
                <div
                    className={classNames(styles.rw_rect_1, {
                        [styles.rw_rect_active]: this.props.active,
                    })}
                    style={s}
                />
                <div
                    className={classNames(styles.rw_rect_2, {
                        [styles.rw_rect_active]: this.props.active,
                    })}
                    style={s}
                />
                <div
                    className={classNames(styles.rw_rect_3, {
                        [styles.rw_rect_active]: this.props.active,
                    })}
                    style={s}
                />
                <div
                    className={classNames(styles.rw_rect_4, {
                        [styles.rw_rect_active]: this.props.active,
                    })}
                    style={s}
                />
                <div
                    className={classNames(styles.rw_rect_5, {
                        [styles.rw_rect_active]: this.props.active,
                    })}
                    style={s}
                />
            </div>
        );
    }
}
