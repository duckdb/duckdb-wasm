import * as arrow from 'apache-arrow';
import * as React from 'react';
import * as scan from './scan_provider';
import {
    Grid,
    GridCellProps,
    GridCellRangeProps,
    defaultCellRangeRenderer,
    SizeAndPositionData,
    Index as ColumnIndex,
} from 'react-virtualized';
import { ScanRequest } from './scan_provider';
import { VirtualScrollbars, PositionValues } from './virtual_scrollbars';
import { ColumnRenderer, deriveColumnRenderers } from './data_grid_column';
import { SCAN_REQUESTER, SCAN_RESULT } from './scan_provider';
import { TABLE_CARDINALITY } from './table_cardinality_provider';
import { useTableSchema } from './table_schema_provider';

import styles from './data_grid.module.css';
import { withAutoSizer } from './autosizer';

const PIXEL_PER_CHAR = 8;
const VALUE_PADDING = 20;
const HEADER_PADDING = 32;
const HEADER_ROW_HEIGHT = 28;
const MAX_COLUMN_HEADER_STRETCH = 30;
const MAX_VALUE_STRETCH = 5;
const MIN_COLUMN_WIDTH = 30;
const RECOMPUTATION_THRESHOLD = 0.2;
const NESTING_FACTOR = 0.05;

type Props = {
    width: number;
    height: number;
};

type State = {
    data: scan.ScanResult | null;
    rowCount: number | null;
    columnRenderers: ColumnRenderer[];

    width: number;
    height: number;

    columnHeaderHeight: number;
    columnWidths: number[];
    columnWidthSum: number;
    columnNames: string[];
    rowHeaderWidth: number;
    rowHeight: number;

    scrollTop: number;
    scrollLeft: number;
    firstVisibleRow: number;
    visibleRows: number;
    overscanColumnCount: number;
    overscanRowCount: number;
};

interface NestingInfo {
    rowLevel: Int32Array;
    maxLevel: number;
}

/// Render a data cell nodata for data that is not yet avaialable
function renderDataCellNoData(props: GridCellProps): JSX.Element {
    return <div key={props.key} className={styles.nodata_cell} style={{ ...props.style }} />;
}

/// Render an available data cell.
/// Adopted from the defaultCellRangeRenderer of react-virtualized.
const renderAvailableDataCell = (
    columnRenderers: ColumnRenderer[],
    range: GridCellRangeProps,
    globalRowIndex: number,
    globalRowDatum: SizeAndPositionData,
    localRowIndex: number,
    columnIndex: number,
    columnDatum: SizeAndPositionData,
    canCacheStyle: boolean,
    nesting: NestingInfo | null,
): React.ReactNode => {
    const key = `${globalRowIndex}-${columnIndex}`;
    let style: React.CSSProperties;

    // Derive background color
    let background = undefined;
    if (nesting != null) {
        background = `rgba(0, 0, 0, ${NESTING_FACTOR * nesting.rowLevel[localRowIndex]})`;
    }

    // Cache style objects so shallow-compare doesn't re-render unnecessarily.
    if (
        canCacheStyle &&
        range.styleCache[key] &&
        (!background || range.styleCache[key].backgroundColor == background)
    ) {
        style = range.styleCache[key];
    } else {
        // In deferred mode, cells will be initially rendered before we know their size.
        // Don't interfere with CellMeasurer's measurements by setting an invalid size.
        if (range.deferredMeasurementCache && !range.deferredMeasurementCache.has(globalRowIndex, columnIndex)) {
            // Position not-yet-measured cells at top/left 0,0,
            // And give them width/height of 'auto' so they can grow larger than the parent Grid if necessary.
            // Positioning them further to the right/bottom influences their measured size.
            style = {
                position: 'absolute',
                left: 0,
                top: 0,
                width: 'auto',
                height: 'auto',
                backgroundColor: background,
            };
        } else {
            style = {
                position: 'absolute',
                left: columnDatum.offset + range.horizontalOffsetAdjustment,
                top: globalRowDatum.offset + range.verticalOffsetAdjustment,
                width: columnDatum.size,
                height: globalRowDatum.size,
                backgroundColor: background,
            };

            range.styleCache[key] = style;
        }
    }

    // Render cell without data
    if (columnIndex >= columnRenderers.length) {
        return <div key={key} className={styles.nodata_cell} style={style} />;
    }

    // Avoid re-creating cells while scrolling.
    let cell: React.ReactNode;
    if (
        (range.isScrollingOptOut || range.isScrolling) &&
        !range.horizontalOffsetAdjustment &&
        !range.verticalOffsetAdjustment
    ) {
        if (!range.cellCache[key]) {
            range.cellCache[key] = columnRenderers[columnIndex].renderCell(localRowIndex, key, style);
        }
        cell = range.cellCache[key];
    } else {
        cell = columnRenderers[columnIndex].renderCell(localRowIndex, key, style);
    }
    return cell;
};

/// Render a data cell range that is backed by query results
const renderAvailableDataCellRange = (
    data: scan.ScanResult,
    columnRenderers: ColumnRenderer[],
    range: GridCellRangeProps,
    nesting: NestingInfo | null,
): React.ReactNode[] => {
    // Can use style cache?
    const areOffsetsAdjusted =
        range.columnSizeAndPositionManager.areOffsetsAdjusted() || range.rowSizeAndPositionManager.areOffsetsAdjusted();
    const canCacheStyle = !range.isScrolling && !areOffsetsAdjusted;

    // We render the cells column-wise to iterate over the query results more efficiently.
    // react-virtualized does this row-wise in their default render which kills our chunk iterator.
    const cells: React.ReactNode[] = [];
    for (let columnIndex = range.columnStartIndex; columnIndex <= range.columnStopIndex; columnIndex++) {
        const columnDatum = range.columnSizeAndPositionManager.getSizeAndPositionOfCell(columnIndex);

        // Render all rows
        const offset = range.rowStartIndex - data.request.begin;
        const limit = range.rowStopIndex - range.rowStartIndex + 1;
        let globalRowIndex = range.rowStartIndex;
        for (let localRowIndex = offset; localRowIndex < offset + limit; ++localRowIndex) {
            const globalRowDatum = range.rowSizeAndPositionManager.getSizeAndPositionOfCell(globalRowIndex);
            const cell = renderAvailableDataCell(
                columnRenderers,
                range,
                globalRowIndex,
                globalRowDatum,
                localRowIndex,
                columnIndex,
                columnDatum,
                canCacheStyle,
                nesting,
            );
            if (cell) {
                cells.push(cell);
            }
            ++globalRowIndex;
        }
    }
    return cells;
};

export const DataGrid: React.FC<Props> = (props: Props) => {
    const table = useTableSchema();
    const data = React.useContext(SCAN_RESULT);
    const requestData = React.useContext(SCAN_REQUESTER);
    const rowCount = React.useContext(TABLE_CARDINALITY) || 0;
    const tableHeader = React.useRef<Grid>(null);
    const tableBody = React.useRef<Grid>(null);

    const columnHeaderRows = 1 + (table?.columnGroupingSets?.length ?? 0);
    const columnHeaderHeight = columnHeaderRows * HEADER_ROW_HEIGHT;

    const [state, setState] = React.useState<State>({
        data: null,
        rowCount: null,
        columnRenderers: [],

        width: 0,
        height: 0,

        columnHeaderHeight,
        columnWidths: [],
        columnWidthSum: 0,
        columnNames: [],
        rowHeight: 28,
        rowHeaderWidth: 0,

        scrollTop: 0,
        scrollLeft: 0,
        firstVisibleRow: 0,
        visibleRows: 100,
        overscanColumnCount: 0,
        overscanRowCount: 10,
    });

    /// Scroll handler
    const onScroll = React.useCallback(
        (pos: PositionValues): void => {
            const firstVisibleRow = Math.min(
                Math.trunc((pos.scrollTop * pos.verticalScaling) / state.rowHeight),
                rowCount,
            );
            const maxVisibleRows = rowCount - firstVisibleRow;
            const visibleRows = Math.min(Math.trunc(pos.clientHeight / state.rowHeight), maxVisibleRows);
            setState(s => ({
                ...s,
                scrollTop: pos.scrollTop,
                scrollLeft: pos.scrollLeft,
                firstVisibleRow: firstVisibleRow,
                visibleRows: visibleRows,
            }));
        },
        [state.rowHeight],
    );

    /// Scroll stop handler
    const onScrollStop = React.useCallback(() => {
        if (requestData == null) return;
        const ofs = state.firstVisibleRow;
        const count = state.visibleRows;
        const end = Math.min(ofs + count, rowCount);
        requestData(
            new ScanRequest().withRange(ofs, end - ofs, 128).withOrdering(state.data?.request.ordering || null),
        );
    }, [state.firstVisibleRow, state.visibleRows, state.data, requestData]);

    /// Render a data cell range
    const renderDataCellRange = React.useCallback(
        (range: GridCellRangeProps): React.ReactNode[] => {
            // XXX StopIndex is apparently included !!!
            const propRows = range.rowStopIndex - range.rowStartIndex + 1;

            // No data provided?
            // Render as missing.
            if (!state.data || !table) {
                return defaultCellRangeRenderer(range);
            }

            // Is there a nesting depth column?
            const nesting_col = state.data.result.schema.fields.findIndex(f => f.name === '__duckdb__nesting_depth');
            let nesting: NestingInfo | null = null;
            if (nesting_col !== -1) {
                nesting = {
                    rowLevel: state.data.result.getChildAt<arrow.Int>(nesting_col)!.toArray() as Int32Array,
                    maxLevel: table.rowGroupingSets?.reduce((l, s) => Math.max(l, s.length), 0),
                };
            }

            // Range is fully included?
            const req = state.data.request;
            if (req.includesRange(range.rowStartIndex, propRows)) {
                return renderAvailableDataCellRange(state.data, state.columnRenderers, range, nesting);
            }

            // Does not intersect with the range?
            if (!req.intersectsRange(range.rowStartIndex, propRows)) {
                return defaultCellRangeRenderer(range);
            }

            const dataBegin = Math.min(req.begin, rowCount);
            const dataEnd = Math.min(req.end, rowCount);
            const prevRowStart = range.rowStartIndex;
            const prevRowStop = range.rowStopIndex + 1;

            // Render missing cells at the beginning
            let before: React.ReactNode[] = [];
            if (prevRowStart < dataBegin) {
                range.rowStartIndex = prevRowStart;
                range.rowStopIndex = dataBegin - 1;
                before = defaultCellRangeRenderer(range);
            }

            // Render missing cells at the end
            let after: React.ReactNode[] = [];
            if (prevRowStop >= dataEnd) {
                range.rowStartIndex = dataEnd;
                range.rowStopIndex = prevRowStop;
                after = defaultCellRangeRenderer(range);
            }

            // Render available cells
            let available: React.ReactNode[] = [];
            if (dataBegin < dataEnd) {
                range.rowStartIndex = Math.max(prevRowStart, dataBegin);
                range.rowStopIndex = Math.min(prevRowStop, dataEnd - 1);
                available = renderAvailableDataCellRange(state.data, state.columnRenderers, range, nesting);
            }

            // Concatenate the cells
            range.rowStartIndex = prevRowStart;
            range.rowStopIndex = prevRowStop;
            return before.concat(available).concat(after);
        },
        [state?.data, state?.columnRenderers],
    );

    /// Get the width of a column
    const getColumnWidth = React.useCallback(
        (idx: ColumnIndex): number => {
            return idx.index < state.columnWidths.length ? state.columnWidths[idx.index] : 0;
        },
        [state.columnWidths],
    );

    // Derive the grid state
    React.useEffect(() => {
        // Data and dimensions are the same?
        if (data === state.data && props.width == state.width && props.height == state.height) {
            return;
        }

        // No data available?
        if (!data || !table) {
            setState(s => ({
                ...s,

                data: null,
                rowCount: rowCount,
                columnRenderers: [],

                width: props.width,
                height: props.height,
                columnHeaderHeight,
                columnWidths: [],
                columnWidthSum: 0,
                columnNames: [],
                rowHeaderWidth: 0,
            }));
            return;
        }

        // Derive the column renderers if the data changed
        let columnRenderers = [...state.columnRenderers];
        if (data !== state.data) {
            columnRenderers = deriveColumnRenderers(table, data!);
        }

        // Compute the column widths
        const columnWidths: number[] = [];
        const columnNames: string[] = [];
        let columnWidthSum = 0;
        for (const renderer of columnRenderers) {
            const info = renderer.getLayoutInfo();
            let required =
                Math.min(info.valueMaxWidth, info.valueAvgWidth + MAX_VALUE_STRETCH) * PIXEL_PER_CHAR + VALUE_PADDING;
            const header = info.headerWidth * PIXEL_PER_CHAR + HEADER_PADDING;
            if (header > required) {
                required = Math.min(header, required + MAX_COLUMN_HEADER_STRETCH);
            }
            required = Math.ceil(required);
            columnWidths.push(required);
            columnWidthSum += required;
            columnNames.push(renderer.getColumnName());
        }

        // If we the table does not fill the entire space, we resize every cell by a single growth factor
        if (columnWidthSum < props.width) {
            const enlarge = (props.width - columnWidthSum) / columnWidths.length;
            columnWidthSum = 0;
            for (let i = 0; i < columnWidths.length; ++i) {
                columnWidths[i] = columnWidths[i] + enlarge;
                columnWidthSum += columnWidths[i];
            }
        }

        // Update column widths?
        let updateColumnWidths = columnWidths.length != state.columnWidths.length;
        if (!updateColumnWidths) {
            for (let i = 0; i < columnWidths.length; ++i) {
                updateColumnWidths ||=
                    Math.abs(columnWidths[i] / state.columnWidths[i] - 1.0) > RECOMPUTATION_THRESHOLD;
            }
        }

        setState(s => ({
            ...s,

            data,
            rowCount,
            columnRenderers,

            width: props.width,
            height: props.width,
            columnHeaderHeight,
            columnWidths: updateColumnWidths ? columnWidths : state.columnWidths,
            columnWidthSum: updateColumnWidths ? columnWidthSum : state.columnWidthSum,
            columnNames,
        }));

        // Update grid
        if (updateColumnWidths) {
            tableHeader.current?.recomputeGridSize();
            tableBody.current?.recomputeGridSize();
        }
    }, [table, data, rowCount, ...Object.values(props)]);

    // Data is missing?
    if (table == null || data == null || requestData == null || rowCount == null) {
        return <div />;
    }

    // Render the column grouping set headers
    const headerRows = [];
    for (let i = 0, cid = 0; i < table.columnGroupingSets.length; ++i) {
        const groupingSet = table.columnGroupingSets[i];
        const headerRow = [];
        let offset = -state.scrollLeft;

        // Render each column grouping as separate header row
        for (let j = 0; j < groupingSet.length; ++j) {
            const group = groupingSet[j];

            // Build filler
            if (cid < group.spanBegin) {
                let fillerWidth = 0;
                for (; cid < group.spanBegin; ++cid) {
                    fillerWidth += state.columnWidths[cid] ?? MIN_COLUMN_WIDTH;
                }
                headerRow.push(
                    <div
                        key={i * state.columnWidths.length + cid}
                        className={styles.header_filler}
                        style={{
                            position: 'absolute',
                            left: offset,
                            top: i * HEADER_ROW_HEIGHT,
                            height: HEADER_ROW_HEIGHT,
                            width: fillerWidth,
                        }}
                    />,
                );
                offset += fillerWidth;
            }

            // Build column group
            let groupWidth = 0;
            for (; cid < group.spanBegin + group.spanSize; ++cid) {
                groupWidth += state.columnWidths[cid] ?? MIN_COLUMN_WIDTH;
            }
            headerRow.push(
                <div
                    key={i * state.columnWidths.length + cid}
                    className={styles.header_cell}
                    style={{
                        position: 'absolute',
                        left: offset,
                        top: i * HEADER_ROW_HEIGHT,
                        height: HEADER_ROW_HEIGHT,
                        width: groupWidth,
                    }}
                >
                    <span className={styles.header_cell_label}>{group.title}</span>
                </div>,
            );
            offset += groupWidth;
        }

        // Build filler
        if (cid < table.dataColumns) {
            let fillerWidth = 0;
            for (; cid < table.dataColumns; ++cid) {
                fillerWidth += state.columnWidths[cid] ?? MIN_COLUMN_WIDTH;
            }
            headerRow.push(
                <div
                    key={i * state.columnWidths.length + cid}
                    className={styles.header_filler}
                    style={{
                        position: 'absolute',
                        left: offset,
                        top: i * HEADER_ROW_HEIGHT,
                        height: HEADER_ROW_HEIGHT,
                        width: fillerWidth,
                    }}
                />,
            );
            offset += fillerWidth;
        }

        // Append the header row
        headerRows.push(
            <div key={i} className={styles.header_row}>
                {headerRow}
            </div>,
        );
    }

    // Render the bottom most, ungrouped column headers
    const headerRow = [];
    for (let i = 0, offset = -state.scrollLeft; i < state.columnRenderers.length; ++i) {
        const width = state.columnWidths[i] ?? MIN_COLUMN_WIDTH;
        headerRow.push(
            <div
                key={i}
                className={styles.header_cell}
                style={{
                    position: 'absolute',
                    left: offset,
                    top: table.columnGroupingSets.length * HEADER_ROW_HEIGHT,
                    height: HEADER_ROW_HEIGHT,
                    width: width,
                }}
            >
                <span className={styles.header_cell_label}>{state.columnRenderers[i].getColumnName()}</span>
            </div>,
        );
        offset += width;
    }
    headerRows.push(
        <div key={table.columnGroupingSets.length} className={styles.header_row}>
            {headerRow}
        </div>,
    );

    // Render the table
    const bodyHeight = props.height - state.columnHeaderHeight;
    const bodyWidth = props.width;
    return (
        <div
            className={styles.grid_container}
            style={{
                display: 'grid',
                gridTemplateRows: `${state.columnHeaderHeight}px ${bodyHeight}px`,
                gridTemplateColumns: `${bodyWidth}px`,
            }}
        >
            <Grid
                ref={tableBody}
                className={styles.grid_body}
                width={bodyWidth - 2}
                height={bodyHeight - 2}
                columnWidth={getColumnWidth}
                columnCount={table.dataColumns}
                rowHeight={state.rowHeight}
                rowCount={state.rowCount || 0}
                scrollTop={state.scrollTop}
                scrollLeft={state.scrollLeft}
                overscanColumnCount={state.overscanColumnCount}
                overscanRowCount={state.overscanRowCount}
                cellRenderer={renderDataCellNoData}
                cellRangeRenderer={renderDataCellRange}
                dataRef={state.data}
            />
            <VirtualScrollbars
                className={styles.grid_body_scrollbars}
                style={{
                    width: bodyWidth,
                    height: bodyHeight,
                }}
                innerWidth={state.columnWidthSum}
                innerHeight={(state.rowCount || 0) * state.rowHeight}
                onScrollFrame={onScroll}
                onScrollStop={onScrollStop}
            />
            <div className={styles.grid_header}>{headerRows}</div>
        </div>
    );
};

export default withAutoSizer(DataGrid);
