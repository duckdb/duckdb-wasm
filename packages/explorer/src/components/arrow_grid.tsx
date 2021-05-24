import * as React from 'react';
import * as arrow from 'apache-arrow';
import cn from 'classnames';
import { Grid, GridCellProps, GridCellRangeProps, AutoSizer, SizeAndPositionData } from 'react-virtualized';
import { VirtualScrollbars, PositionValues } from './virtual_scrollbars';

import styles from './arrow_grid.module.css';

type Props = {
    className?: string;
    table: arrow.Table | null;
};

type State = {
    scrollTop: number;
    scrollLeft: number;
    firstVisibleRow: number;
    visibleRows: number;
    overscanColumnCount: number;
    overscanRowCount: number;
    rowHeight: number;
};

/// Render a data cell nodata for data that is not yet avaialable
function renderDataCellNoData(props: GridCellProps): JSX.Element {
    return <div key={props.key} className={styles.cell_nodata} style={{ ...props.style }} />;
}

export class ArrowGrid extends React.Component<Props, State> {
    protected _onScroll = this.onScroll.bind(this);
    protected _renderDataCellRange = this.renderAvailableDataCellRange.bind(this);
    protected _renderRowHeaderCell = this.renderRowHeaderCell.bind(this);
    protected _renderColumnHeaderCell = this.renderColumnHeaderCell.bind(this);

    constructor(props: Props) {
        super(props);
        this.state = {
            scrollTop: 0,
            scrollLeft: 0,
            firstVisibleRow: 0,
            visibleRows: 100,
            overscanColumnCount: 0,
            overscanRowCount: 10,
            rowHeight: 24,
        };
    }

    /// Get the column count
    public get columnCount(): number {
        return this.props.table!.numCols;
    }

    /// Get the row count
    public get rowCount(): number {
        return this.props.table!.length;
    }

    /// Render a cell of the static left sidebar
    protected renderRowHeaderCell(props: GridCellProps): JSX.Element {
        return (
            <div key={props.key} className={styles.cell_header_row} style={{ ...props.style }}>
                {props.rowIndex}
            </div>
        );
    }

    /// Render a cell of the header
    protected renderColumnHeaderCell(props: GridCellProps): JSX.Element {
        return (
            <div key={props.key} className={styles.cell_header_col} style={{ ...props.style }}>
                {this.props.table?.getColumnAt(props.columnIndex)?.name || '?'}
            </div>
        );
    }

    /// Scroll handler
    public onScroll(pos: PositionValues): void {
        const firstVisibleRow = Math.min(
            Math.trunc((pos.scrollTop * pos.verticalScaling) / this.state.rowHeight),
            this.rowCount!,
        );
        const maxVisibleRows = this.rowCount! - firstVisibleRow;
        const visibleRows = Math.min(Math.trunc(pos.clientHeight / this.state.rowHeight), maxVisibleRows);
        this.setState({
            ...this.state,
            scrollTop: pos.scrollTop,
            scrollLeft: pos.scrollLeft,
            firstVisibleRow: firstVisibleRow,
            visibleRows: visibleRows,
        });
    }

    /// Render an available data cell.
    /// Adopted from the defaultCellRangeRenderer of react-virtualized.
    public renderAvailableDataCell<T>(
        props: GridCellRangeProps,
        rowIndex: number,
        rowDatum: SizeAndPositionData,
        columnIndex: number,
        columnDatum: SizeAndPositionData,
        canCacheStyle: boolean,
        value: T,
        renderCell: (key: string, style: React.CSSProperties, v: T) => React.ReactNode,
    ): React.ReactNode {
        const key = `${rowIndex}-${columnIndex}`;
        let style: React.CSSProperties;

        // Cache style objects so shallow-compare doesn't re-render unnecessarily.
        if (canCacheStyle && props.styleCache[key]) {
            style = props.styleCache[key];
        } else {
            // In deferred mode, cells will be initially rendered before we know their size.
            // Don't interfere with CellMeasurer's measurements by setting an invalid size.
            if (props.deferredMeasurementCache && !props.deferredMeasurementCache.has(rowIndex, columnIndex)) {
                // Position not-yet-measured cells at top/left 0,0,
                // And give them width/height of 'auto' so they can grow larger than the parent Grid if necessary.
                // Positioning them further to the right/bottom influences their measured size.
                style = {
                    height: 'auto',
                    left: 0,
                    position: 'absolute',
                    top: 0,
                    width: 'auto',
                };
            } else {
                style = {
                    height: rowDatum.size,
                    left: columnDatum.offset + props.horizontalOffsetAdjustment,
                    position: 'absolute',
                    top: rowDatum.offset + props.verticalOffsetAdjustment,
                    width: columnDatum.size,
                };

                props.styleCache[key] = style;
            }
        }

        // Avoid re-creating cells while scrolling.
        let cell: React.ReactNode;
        if (
            (props.isScrollingOptOut || props.isScrolling) &&
            !props.horizontalOffsetAdjustment &&
            !props.verticalOffsetAdjustment
        ) {
            if (!props.cellCache[key]) {
                props.cellCache[key] = renderCell(key, style, value);
            }
            cell = props.cellCache[key];
        } else {
            cell = renderCell(key, style, value);
        }
        return cell;
    }

    /// Render a data cell range that is backed by query results
    public renderAvailableDataCellRange(props: GridCellRangeProps): React.ReactNode[] {
        const cells: React.ReactNode[] = [];

        // Can use style cache?
        const areOffsetsAdjusted =
            props.columnSizeAndPositionManager.areOffsetsAdjusted() ||
            props.rowSizeAndPositionManager.areOffsetsAdjusted();
        const canCacheStyle = !props.isScrolling && !areOffsetsAdjusted;

        // We render the cells column-wise to iterate over the query results more efficiently.
        // react-virtualized does this row-wise in their default render which kills our chunk iterator.
        for (let columnIndex = props.columnStartIndex; columnIndex <= props.columnStopIndex; columnIndex++) {
            const columnDatum = props.columnSizeAndPositionManager.getSizeAndPositionOfCell(columnIndex);

            const offset = props.rowStartIndex;
            const limit = props.rowStopIndex - props.rowStartIndex + 1;
            let rowIndex = props.rowStartIndex;

            for (const value of this.props.table!.getColumnAt(columnIndex)!.slice(offset, offset + limit)) {
                const rowDatum = props.rowSizeAndPositionManager.getSizeAndPositionOfCell(rowIndex);
                const cell = this.renderAvailableDataCell(
                    props,
                    rowIndex,
                    rowDatum,
                    columnIndex,
                    columnDatum,
                    canCacheStyle,
                    value.toString(),
                    (key, style, v) => (
                        <div key={key} className={styles.cell_data} style={{ ...style }}>
                            {v}
                        </div>
                    ),
                );
                if (cell) {
                    cells.push(cell);
                }
                ++rowIndex;
            }
        }
        return cells;
    }

    /// Compute the column width
    protected computeColumnWidth(clientWidth: number, rowHeaderWidth: number): number {
        const available = clientWidth - rowHeaderWidth;
        let equalWidths = available;
        if (this.columnCount > 0) equalWidths = available / this.columnCount;
        const minWidth = 80;
        return Math.max(equalWidths, minWidth);
    }

    /// Render the table
    public render(): React.ReactElement {
        return (
            <div className={cn(styles.container, this.props.className)}>
                <AutoSizer>
                    {({ width, height }) => {
                        const columnHeaderHeight = 24;
                        const rowHeaderWidth = 28;
                        const columnWidth = this.computeColumnWidth(width, rowHeaderWidth);
                        const bodyHeight = height - columnHeaderHeight;
                        const bodyWidth = width - rowHeaderWidth;
                        return (
                            <div
                                className={styles.grid_container}
                                style={{
                                    display: 'grid',
                                    gridTemplateRows: `${columnHeaderHeight}px ${bodyHeight}px`,
                                    gridTemplateColumns: `${rowHeaderWidth}px ${bodyWidth}px`,
                                }}
                            >
                                <Grid
                                    className={styles.grid_body}
                                    width={bodyWidth - 2}
                                    height={bodyHeight - 2}
                                    columnWidth={columnWidth}
                                    columnCount={this.columnCount}
                                    rowHeight={this.state.rowHeight}
                                    rowCount={this.rowCount}
                                    scrollTop={this.state.scrollTop}
                                    scrollLeft={this.state.scrollLeft}
                                    overscanColumnCount={this.state.overscanColumnCount}
                                    overscanRowCount={this.state.overscanRowCount}
                                    cellRenderer={renderDataCellNoData}
                                    cellRangeRenderer={this._renderDataCellRange}
                                    dataRef={this.props.table}
                                />
                                <VirtualScrollbars
                                    className={styles.grid_body_scrollbars}
                                    style={{
                                        width: bodyWidth,
                                        height: bodyHeight,
                                    }}
                                    innerWidth={this.columnCount * columnWidth}
                                    innerHeight={this.rowCount * this.state.rowHeight}
                                    onScrollFrame={this._onScroll}
                                />
                                <div className={styles.cell_anchor} />
                                <Grid
                                    className={styles.grid_left}
                                    width={rowHeaderWidth}
                                    height={bodyHeight}
                                    columnWidth={rowHeaderWidth}
                                    columnCount={1}
                                    rowHeight={this.state.rowHeight}
                                    rowCount={this.rowCount}
                                    scrollTop={this.state.scrollTop}
                                    overscanColumnCount={this.state.overscanColumnCount}
                                    overscanRowCount={this.state.overscanRowCount}
                                    cellRenderer={this._renderRowHeaderCell}
                                />
                                <Grid
                                    className={styles.grid_header}
                                    width={bodyWidth}
                                    height={columnHeaderHeight}
                                    columnWidth={columnWidth}
                                    columnCount={this.columnCount}
                                    rowHeight={columnHeaderHeight}
                                    rowCount={1}
                                    scrollLeft={this.state.scrollLeft}
                                    cellRenderer={this._renderColumnHeaderCell}
                                />
                            </div>
                        );
                    }}
                </AutoSizer>
            </div>
        );
    }
}

export default ArrowGrid;
