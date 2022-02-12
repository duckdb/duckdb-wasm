import * as React from 'react';
import { Scrollbars, ScrollValues } from 'rc-scrollbars';
import { getMaxElementSize } from './max_element_size';

export interface PositionValues {
    clientWidth: number;
    clientHeight: number;
    horizontalScaling: number;
    verticalScaling: number;
    scrollWidth: number;
    scrollHeight: number;
    scrollLeft: number;
    scrollTop: number;
}

interface Props {
    className?: string;
    style?: React.CSSProperties;
    innerWidth: number;
    innerHeight: number;

    onScrollFrame?: (pos: PositionValues) => void;
    onScrollStop?: () => void;
}

interface State {
    adjustedInnerWidth: number;
    adjustedInnerHeight: number;
    horizontalScaling: number;
    verticalScaling: number;
    position: PositionValues | null;
}

const deriveStateFromProps = (props: Props, state: State): State => {
    const maxElementSize = getMaxElementSize();
    const adjustedWidth = Math.min(props.innerWidth, maxElementSize);
    const adjustedHeight = Math.min(props.innerHeight, maxElementSize);
    return {
        ...state,
        adjustedInnerWidth: adjustedWidth,
        adjustedInnerHeight: adjustedHeight,
        horizontalScaling: adjustedWidth > 0 ? props.innerWidth / adjustedWidth : 1.0,
        verticalScaling: adjustedHeight > 0 ? props.innerHeight / adjustedHeight : 1.0,
    };
};

/// Virtual scrollbars for large lists.
/// Implements the same position scaling as react-virtualized to bypass browser limitations.
///
/// Browsers have scroll offset limitations (eg Chrome stops scrolling at ~33.5M pixels where as Edge tops out at ~1.5M pixels).
/// After a certain position, the browser won't allow the user to scroll further (even via JavaScript scroll offset adjustments).
///
/// This component wraps a react scrollbar and exposes scale factors with the scroll events.
/// The scroll event widths and heights must be multiplied by these scale factors to receive the real lengths.
/// React-virtualized consumes the adjusted widths and heights without any scaling.
///
export const VirtualScrollbars: React.FC<Props> = (props: Props) => {
    const [state, setState] = React.useState<State>(() =>
        deriveStateFromProps(props, {
            adjustedInnerWidth: props.innerWidth,
            adjustedInnerHeight: props.innerHeight,
            horizontalScaling: 1.0,
            verticalScaling: 1.0,
            position: null,
        }),
    );
    React.useEffect(() => {
        setState(s => deriveStateFromProps(props, s));
    }, [props.innerHeight, props.innerHeight]);

    const onScrollFrame = (pos: ScrollValues) => {
        const p: PositionValues = {
            clientWidth: pos.clientWidth,
            clientHeight: pos.clientHeight,
            verticalScaling: state.verticalScaling,
            horizontalScaling: state.horizontalScaling,
            scrollWidth: pos.scrollWidth,
            scrollHeight: pos.scrollHeight,
            scrollLeft: pos.scrollLeft,
            scrollTop: pos.scrollTop,
        };
        setState({
            ...state,
            position: p,
        });
        props.onScrollFrame!(p);
    };

    return (
        <Scrollbars
            className={props.className}
            style={props.style}
            onScrollFrame={props.onScrollFrame ? onScrollFrame : undefined}
            onScrollStop={props.onScrollStop}
            autoHide
        >
            <div
                style={{
                    width: state.adjustedInnerWidth,
                    height: state.adjustedInnerHeight,
                }}
            />
        </Scrollbars>
    );
};
