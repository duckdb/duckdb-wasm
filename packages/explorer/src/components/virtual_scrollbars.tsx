import * as React from 'react';
import { Scrollbars, positionValues } from 'react-custom-scrollbars';
import { getMaxElementSize } from '../util/max_element_size';

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
export class VirtualScrollbars extends React.Component<Props, State> {
    _onScrollFrame = this.onScrollFrame.bind(this);
    _onScrollStop = this.onScrollStop.bind(this);
    _maxElementSize = getMaxElementSize();

    constructor(props: Props) {
        super(props);
        this.state = VirtualScrollbars.getDerivedStateFromProps(props, {
            adjustedInnerWidth: this.props.innerWidth,
            adjustedInnerHeight: this.props.innerHeight,
            horizontalScaling: 1.0,
            verticalScaling: 1.0,
            position: null,
        });
    }

    static getDerivedStateFromProps(props: Props, state: State): State {
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
    }

    protected onScrollFrame(pos: positionValues): void {
        const p: PositionValues = {
            clientWidth: pos.clientWidth,
            clientHeight: pos.clientHeight,
            verticalScaling: this.state.verticalScaling,
            horizontalScaling: this.state.horizontalScaling,
            scrollWidth: pos.scrollWidth,
            scrollHeight: pos.scrollHeight,
            scrollLeft: pos.scrollLeft,
            scrollTop: pos.scrollTop,
        };
        this.setState({
            ...this.state,
            position: p,
        });
        if (this.props.onScrollFrame) {
            this.props.onScrollFrame(p);
        }
    }

    protected onScrollStop(): void {
        if (this.props.onScrollStop) {
            this.props.onScrollStop();
        }
    }

    public render(): React.ReactElement {
        return (
            <Scrollbars
                className={this.props.className}
                style={this.props.style}
                onScrollFrame={this._onScrollFrame}
                onScrollStop={this._onScrollStop}
                autoHide
            >
                <div
                    style={{
                        width: this.state.adjustedInnerWidth,
                        height: this.state.adjustedInnerHeight,
                    }}
                />
            </Scrollbars>
        );
    }
}
