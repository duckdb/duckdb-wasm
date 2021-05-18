import * as React from 'react';
import classNames from 'classnames';
import { withRouter, RouteComponentProps, Link } from 'react-router-dom';
import Button from 'react-bootstrap/Button';

import styles from './navbar.module.css';

import logo from '../../static/svg/logo/duckdb.svg';
import icon_shell from '../../static/svg/icons/shell.svg';

function Tab(props: { route: string; location: string; icon: string }): React.ReactElement {
    return (
        <div
            key={props.route}
            className={classNames(styles.tab, {
                [styles.active]: props.location == props.route,
            })}
        >
            <Link to={props.route}>
                <Button variant="link">
                    <svg className={styles.tab_icon} width="20px" height="20px">
                        <use xlinkHref={`${props.icon}#sym`} />
                    </svg>
                </Button>
            </Link>
        </div>
    );
}
type Props = RouteComponentProps<Record<string, string | undefined>>;

class NavBarImpl extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return (
            <div className={styles.navbar}>
                <div className={styles.logo}>
                    <img src={logo} />
                </div>
                <div className={styles.tabs}>
                    <Tab route="/" location={this.props.location.pathname} icon={icon_shell} />
                </div>
            </div>
        );
    }
}

export const NavBar = withRouter(NavBarImpl);

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
