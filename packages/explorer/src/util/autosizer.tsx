import * as React from 'react';
import { AutoSizer } from 'react-virtualized';

interface AutoSizerProps {
    width: number;
    height: number;
}

export function withAutoSizer<
    ALL_PROPS extends AutoSizerProps,
    RAW_PROPS = Pick<ALL_PROPS, Exclude<keyof ALL_PROPS, keyof AutoSizerProps>>,
>(Component: React.ComponentClass<ALL_PROPS> | React.StatelessComponent<ALL_PROPS>): React.SFC<RAW_PROPS> {
    return function BoundComponent(props: RAW_PROPS) {
        return (
            <AutoSizer>
                {({ height, width }) => (
                    <Component
                        {...Object.assign({} as ALL_PROPS, props, {
                            width: width,
                            height: height,
                        })}
                    />
                )}
            </AutoSizer>
        );
    };
}

export { AutoSizer };
