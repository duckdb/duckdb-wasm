import * as React from 'react';
import * as arrow from 'apache-arrow';
import * as duckdb from '@duckdb/duckdb-wasm';
import * as rd from '@duckdb/react-duckdb';
import * as imm from 'immutable';

// We compute pivots with the following 2 queries:
// 1. Select distinct column pivots.
// 2. Group by with grouping sets for row groups and CASE WHEN column groups.
//    We materialize the second query in a temp table for scrolling and counting.

const MAX_PIVOT_COLUMNS = 100;

/// A pivot aggregation function
export enum PivotAggregationFunction {
    COUNT,
    SUM,
    AVG,
    MIN,
    MAX,
}

export interface PivotAggregate {
    /// The aggregation function
    func: PivotAggregationFunction;
    /// The expression
    expression: string;
    /// The attribute alias
    alias: string | null;
}

export interface PivotRowGrouping {
    /// The expression
    expression: string;
    /// The attribute alias
    alias: string;
}

interface PivotQuery {
    /// The query
    text: string;
    /// The column aliases
    columnAliases: string[];
    /// The column grouping sets
    columnGroupingSets: rd.TableSchemaColumnGroup[][];
    /// The row grouping sets
    rowGroupingSets: number[][];
    /// The number of data columns
    dataColumns: number;
}

export function buildColumnAggregation(
    table: rd.TableSchema,
    groupRowsBy: imm.List<PivotRowGrouping>,
    groupColumnsBy: imm.List<number>,
    columnValues: arrow.Table,
    aggregates: imm.List<PivotAggregate>,
): PivotQuery {
    if (columnValues.numCols != groupColumnsBy.count()) {
        throw new Error('unexpected number of column pivots');
    }
    const aggregateCount = aggregates.count();

    // Collect grouping sets for row pivoting
    const groupRowsByArray = groupRowsBy.toArray();
    const rowSubsets: string[][] = [[]];
    const rowSubsetIds: number[][] = [[]];
    for (let i = 0; i < groupRowsByArray.length; ++i) {
        const columns = [];
        const columnIds = [];
        for (let j = 0; j <= i; ++j) {
            columnIds.push(j);
            columns.push(groupRowsByArray[j].alias || groupRowsByArray[j].expression);
        }
        rowSubsets.push(columns);
        rowSubsetIds.push(columnIds);
    }
    const groupCols = groupRowsBy.map(g => `${g.expression} AS ${g.alias}`).join(',');
    const groupingSets = [];
    for (const subset of rowSubsets) {
        const groupingSet = subset.join(',');
        groupingSets.push(`(${groupingSet})`);
    }

    // Collect cases for column pivoting
    const pivotCases = [];
    const columnGroupingSets: rd.TableSchemaColumnGroup[][] = [[]];
    const columnAliases = groupRowsByArray.map(g => g.alias || g.expression);
    for (let instance = 0; instance < Math.min(columnValues.numRows, MAX_PIVOT_COLUMNS); instance += 1) {
        const predicates = [];
        const group_name: string[] = [];
        let columnAttrId = 0;
        for (const columnId of groupColumnsBy) {
            const attr_name = table.columnNames[columnId];
            const attr_type = table.columnTypes[columnId];
            const attr_values = columnValues.getChildAt(columnAttrId);
            columnAttrId += 1;
            const attr_value = attr_values!.get(instance);
            let attr_value_str;
            switch (attr_type.typeId) {
                case arrow.Type.Bool:
                case arrow.Type.Int:
                case arrow.Type.Int8:
                case arrow.Type.Int16:
                case arrow.Type.Int32:
                case arrow.Type.Int64:
                case arrow.Type.Uint8:
                case arrow.Type.Uint16:
                case arrow.Type.Uint32:
                case arrow.Type.Uint64:
                case arrow.Type.Float32:
                case arrow.Type.Float64:
                    attr_value_str = attr_value.toString();
                    predicates.push(`${attr_name} = ${attr_value_str}`);
                    break;
                case arrow.Type.Utf8:
                    attr_value_str = attr_value.toString();
                    predicates.push(`${attr_name} = '${attr_value_str}'`);
                    break;
            }
            group_name.push(attr_value_str);
        }
        columnGroupingSets[0].push({
            title: group_name.join(','),
            spanBegin: groupRowsByArray.length + instance * aggregateCount,
            spanSize: aggregateCount,
        });
        let i = 0;
        for (const aggregate of aggregates) {
            const attr = aggregate.expression;
            let func = '';
            switch (aggregate.func) {
                case PivotAggregationFunction.AVG:
                    func = 'avg';
                    break;
                case PivotAggregationFunction.SUM:
                    func = 'sum';
                    break;
                case PivotAggregationFunction.MIN:
                    func = 'min';
                    break;
                case PivotAggregationFunction.MAX:
                    func = 'max';
                    break;
                case PivotAggregationFunction.COUNT:
                    func = 'count';
                    break;
            }
            pivotCases.push(`${func}(CASE WHEN ${predicates.join(' AND ')} THEN ${attr} END) AS p_${instance}_${i}`);
            columnAliases.push(aggregate.alias || attr);
            i += 1;
        }
    }
    const orderBy = groupRowsBy.map(name => `${name.alias} DESC NULLS FIRST`).join(',');

    // Track pivot set depth
    const depthExpr = groupRowsBy.map(g => `(${g.alias} IS NOT NULL)::INTEGER`).join(' + ');
    const depthAlias = '__duckdb__nesting_depth';

    // Build query
    const query = `SELECT ${groupCols}, ${pivotCases}, (${depthExpr}) AS ${depthAlias} FROM ${rd.getQualifiedName(
        table,
    )} GROUP BY GROUPING SETS (${groupingSets}) ORDER BY ${orderBy}`;

    return {
        text: query,
        columnAliases,
        columnGroupingSets,
        rowGroupingSets: rowSubsetIds,
        dataColumns: columnAliases.length,
    };
}

export function buildRowAggregation(
    table: rd.TableSchema,
    groupRowsBy: imm.List<PivotRowGrouping>,
    aggregates: imm.List<PivotAggregate>,
): PivotQuery {
    // Collect grouping sets for row pivoting
    const groupRowsByArray = groupRowsBy.toArray();
    const rowSubsets: string[][] = [[]];
    const rowSubsetIds: number[][] = [[]];
    for (let i = 0; i < groupRowsByArray.length; ++i) {
        const columns = [];
        const columnIds = [];
        for (let j = 0; j <= i; ++j) {
            columnIds.push(j);
            columns.push(groupRowsByArray[j].alias || groupRowsByArray[j].expression);
        }
        rowSubsets.push(columns);
        rowSubsetIds.push(columnIds);
    }
    const groupCols = groupRowsBy.map(g => `${g.expression} AS ${g.alias}`).join(',');
    const groupingSets = [];
    for (const subset of rowSubsets) {
        const groupingSet = subset.join(',');
        groupingSets.push(`(${groupingSet})`);
    }

    // Collect attributes
    const aggregateValues = [];
    const columnAliases = groupRowsByArray.map(g => g.alias);
    let i = 0;
    for (const aggregate of aggregates) {
        const attr = aggregate.expression;
        let func = '';
        switch (aggregate.func) {
            case PivotAggregationFunction.AVG:
                func = 'avg';
                break;
            case PivotAggregationFunction.SUM:
                func = 'sum';
                break;
            case PivotAggregationFunction.MIN:
                func = 'min';
                break;
            case PivotAggregationFunction.MAX:
                func = 'max';
                break;
            case PivotAggregationFunction.COUNT:
                func = 'count';
                break;
        }
        const alias = aggregate.alias ?? `p_${i}`;
        aggregateValues.push(`${func}(${attr}) AS ${alias}`);
        columnAliases.push(aggregate.alias || attr);
        i += 1;
    }
    const orderBy = groupRowsBy.map(name => `${name.alias} DESC NULLS FIRST`).join(',');

    // Track pivot set depth
    const depthExpr = groupRowsBy.map(g => `(${g.alias} IS NOT NULL)::INTEGER`).join(' + ');
    const depthAlias = '__duckdb__nesting_depth';

    // Build query
    const query = `SELECT ${groupCols}, ${aggregateValues}, (${depthExpr}) AS ${depthAlias} FROM ${rd.getQualifiedName(
        table,
    )} GROUP BY GROUPING SETS (${groupingSets}) ORDER BY ${orderBy}`;

    return {
        text: query,
        columnAliases,
        columnGroupingSets: [],
        rowGroupingSets: rowSubsetIds,
        dataColumns: columnAliases.length,
    };
}

export const PIVOT_COLUMNS_EPOCH = React.createContext<number | null>(null);
const usePivotColumns = () => React.useContext(PIVOT_COLUMNS_EPOCH);

interface Props {
    /// The children
    children?: React.ReactElement;

    /// The temporary pivot table name
    name: string;
    /// The connection
    connection: duckdb.AsyncDuckDBConnection;
    /// The input data table
    table: rd.TableSchema | null;

    /// The pivot rows
    groupRowsBy: imm.List<PivotRowGrouping>;
    /// The pivot columns
    groupColumnsBy: imm.List<number>;
    /// The aggregates
    aggregates: imm.List<PivotAggregate>;
}

interface State {
    /// The name
    name: string | null;
    /// The input table
    inputTable: rd.TableSchema | null;
    /// The pivot table
    pivotTable: rd.TableSchema | null;

    /// The pivot rows
    groupRowsBy: imm.List<PivotRowGrouping> | null;
    /// The pivot columns
    groupColumnsBy: imm.List<number> | null;
    /// The aggregates
    aggregates: imm.List<PivotAggregate> | null;

    /// Stable table schema
    stalePivotMetadata: boolean;
    /// The epoch of the input column groups
    epochInputColumnGroups: number | null;
    /// The epoch of the input rows
    epochInputRows: number | null;
    /// The epoch of the own pivot table
    epochPivotTable: number;

    /// The column groups
    columnGroups: arrow.Table | null;
}

export const PivotTableProvider: React.FC<Props> = (props: Props) => {
    const epochInputColumnGroups = usePivotColumns();
    const epochInputRows = rd.useTableDataEpoch();
    const [state, setState] = React.useState<State>({
        name: null,
        inputTable: null,
        pivotTable: null,
        groupRowsBy: null,
        groupColumnsBy: null,
        aggregates: null,
        stalePivotMetadata: false,
        epochInputColumnGroups: null,
        epochInputRows: null,
        epochPivotTable: 0,
        columnGroups: null,
    });
    const updating = React.useRef<boolean>(false);

    // Drop temp table on unmount
    React.useEffect(
        () => () => {
            if (props.connection) {
                props.connection.query(`DROP TABLE IF EXISTS ${props.name}`);
            }
        },
        [],
    );

    // Update pivot table
    React.useEffect(() => {
        if (!props.connection || !props.table || updating.current) {
            return;
        }
        if (props.groupRowsBy.isEmpty() || props.aggregates.isEmpty()) {
            return;
        }
        // Clear column groups?
        if (
            props.table !== state.inputTable ||
            props.groupColumnsBy !== state.groupColumnsBy ||
            epochInputColumnGroups !== state.epochInputColumnGroups
        ) {
            if (props.groupColumnsBy.isEmpty()) {
                setState(s => ({
                    ...s,
                    name: props.name,
                    inputTable: props.table,
                    groupColumnsBy: props.groupColumnsBy,
                    stalePivotMetadata: true,
                    epochInputColumnGroups: epochInputColumnGroups,
                    columnGroups: null,
                }));
            } else {
                updating.current = true;
                const cols = props.groupColumnsBy.map(id => props.table!.columnNames[id]).join(',');
                const query = `SELECT DISTINCT ${cols} FROM ${rd.getQualifiedName(props.table)} ORDER BY ${cols}`;
                const updateColumnGroups = async (epoch: number | null) => {
                    const result = await props.connection.query(query);
                    updating.current = false;
                    setState(s => ({
                        ...s,
                        name: props.name,
                        inputTable: props.table,
                        groupColumnsBy: props.groupColumnsBy,
                        stalePivotMetadata: true,
                        epochInputColumnGroups: epoch,
                        columnGroups: result || null,
                    }));
                };
                updateColumnGroups(epochInputColumnGroups).catch(e => console.error(e));
            }
            return;
        }

        // Update table?
        const stalePivotMetadata =
            state.stalePivotMetadata ||
            props.groupRowsBy !== state.groupRowsBy ||
            props.aggregates !== state.aggregates;
        if (stalePivotMetadata || epochInputRows != state.epochInputRows) {
            updating.current = true;
            const query =
                state.groupColumnsBy == null || state.groupColumnsBy.isEmpty() || state.columnGroups == null
                    ? buildRowAggregation(state.inputTable, props.groupRowsBy, props.aggregates)
                    : buildColumnAggregation(
                          state.inputTable,
                          props.groupRowsBy,
                          state.groupColumnsBy,
                          state.columnGroups,
                          props.aggregates,
                      );
            const queryText = `
                BEGIN TRANSACTION;
                DROP TABLE IF EXISTS ${props.name};
                CREATE TABLE ${props.name} AS ${query.text};
                COMMIT;
            `;
            const createPivotTable = async (epoch: number | null) => {
                // XXX temp describe?
                await props.connection.query(queryText);

                // Need to refresh the table metadata?
                let metadata = state.pivotTable;
                if (stalePivotMetadata) {
                    metadata = await rd.collectTableSchema(props.connection, {
                        tableSchema: '',
                        tableName: props.name,
                    });
                    metadata = {
                        ...metadata,
                        columnGroupingSets: query.columnGroupingSets,
                        columnAliases: query.columnAliases,
                        rowGroupingSets: query.rowGroupingSets,
                        dataColumns: metadata.dataColumns - 1,
                    };
                }

                // Set new state
                updating.current = false;
                setState(s => ({
                    ...s,
                    pivotTable: metadata,
                    groupRowsBy: props.groupRowsBy,
                    aggregates: props.aggregates,
                    stalePivotMetadata: false,
                    epochInputRows: epoch,
                    epochPivotTable: state.epochPivotTable + 1,
                    ownEpochRows: epoch,
                }));
            };
            createPivotTable(epochInputRows).catch(e => console.error(e));
            return;
        }
    }, [
        state,
        props.name,
        props.connection,
        props.table,
        props.groupColumnsBy,
        props.groupRowsBy,
        props.aggregates,
        epochInputColumnGroups,
        epochInputRows,
    ]);

    // Stale metadata?
    // Print nothing since queries might run against a table that gets deleted.
    if (state.stalePivotMetadata) {
        return <div />;
    }

    // Schema outdated?
    return (
        <rd.TABLE_SCHEMA_EPOCH.Provider value={state.epochPivotTable}>
            <rd.TABLE_DATA_EPOCH.Provider value={state.epochPivotTable}>
                <rd.TABLE_METADATA.Provider value={state.pivotTable}>{props.children}</rd.TABLE_METADATA.Provider>
            </rd.TABLE_DATA_EPOCH.Provider>
        </rd.TABLE_SCHEMA_EPOCH.Provider>
    );
};
