import * as React from 'react';
import classNames from 'classnames';
import { useLocation, Link } from 'react-router-dom';

import styles from './navbar.module.css';

import logo from '../../static/svg/logo/duckdb.svg';
import icon_shell from '../../static/svg/icons/shell.svg';
import icon_book from '../../static/svg/icons/book.svg';

type TabProps = { route: string; location: string; icon: string; external?: boolean };

const Tab: React.FC<TabProps> = (props: TabProps) => (
    <div
        key={props.route}
        className={classNames(styles.tab, {
            [styles.active]: props.location == props.route,
        })}
    >
        {props.external ? (
            <a href={props.route} target="blank">
                <div className={styles.tabButton}>
                    <svg className={styles.tabIcon} width="18px" height="18px">
                        <use xlinkHref={`${props.icon}#sym`} />
                    </svg>
                </div>
            </a>
        ) : (
            <Link to={props.route}>
                <div className={styles.tabButton}>
                    <svg className={styles.tabIcon} width="18px" height="18px">
                        <use xlinkHref={`${props.icon}#sym`} />
                    </svg>
                </div>
            </Link>
        )}
    </div>
);

type Props = Record<string, string>;

export const NavBar: React.FC<Props> = (_props: Props) => {
    const location = useLocation();
    return (
        <div className={styles.navbar}>
            <div className={styles.logo}>
                <svg width="32px" height="32px">
                    <use xlinkHref={`${logo}#sym`} />
                </svg>
            </div>
            <div className={styles.tabs}>
                <Tab route="./" location={location.pathname} icon={icon_shell} />
                <Tab route="docs/modules/index.html" location={location.pathname} icon={icon_book} external={true} />
            </div>
        </div>
    );
};

export function withNavBar<P>(Component: React.ComponentType<P>): React.FunctionComponent<P> {
    // eslint-disable-next-line react/display-name
    return (props: P) => {
        return (
            <div className={styles.container}>
                <div className={styles.page}>
                    <Component {...props} />
                </div>
                <NavBar />
            </div>
        );
    };
}
