import * as React from 'react';

import styles from './banner.module.css';

type Props = Record<string, string>;

class Banner extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return (
            <div className={styles.banner_bar}>
                <div className={styles.banner_text}>CAUTION: Alpha-quality software in the wild! Talk to us</div>
                <div className={styles.banner_link}>here</div>
            </div>
        );
    }
}

export function withBanner<P>(Component: React.ComponentType<P>): React.FunctionComponent<P> {
    // eslint-disable-next-line react/display-name
    return (props: P) => {
        return (
            <div className={styles.container}>
                <Banner />
                <div className={styles.page}>
                    <Component {...props} />
                </div>
            </div>
        );
    };
}
