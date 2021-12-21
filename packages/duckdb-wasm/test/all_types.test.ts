import * as duckdb from "../src/";
import {Column, Vector} from "apache-arrow";

type answer_map_entry_t = Array<any>;

type AnswerObjectType = {
    [key: string]: answer_map_entry_t;
};

// JS has a range of +- 8640000000000000 ms
const minimum_date_string = '-271821-04-20';
const minimum_date = new Date(Date.UTC(-271821, 3, 20));
const maximum_date_string = '275760-09-13';
const maximum_date = new Date(Date.UTC(275760, 8, 13));

interface AllTypesTest {
    name: string,
    query: string;
    answerMap: AnswerObjectType;
    answerCount: number
}

// These type currently do not work in DuckDB-WASM
// Note that timestamp_[m/n]s, timestamp_tz and date_tz types are working, but do do not support full range and are only
// partially supported by DuckDB and therefore omitted for now.
const NOT_IMPLEMENTED_TYPES = ['timestamp_s', 'timestamp_ms', 'timestamp_ns', 'date_tz', 'timestamp_tz', 'hugeint', 'dec_4_1', 'dec_9_4',
    'dec_18_3', 'dec38_10', 'blob', 'uuid', 'interval'];

// These type are supported, but not the full range returned from the test_all_types() table function, here we define
// the limits we do expect to be supported.
const PARTIALLY_IMPLEMENTED_TYPES = ['ubigint', 'bigint', 'date', 'timestamp'];
const PARTIALLY_IMPLEMENTED_ANSWER_MAP: AnswerObjectType = {
    ubigint: [0, Number.MAX_SAFE_INTEGER, null],
    bigint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, null],
    date: [minimum_date.valueOf(), maximum_date.valueOf(), null],
    timestamp: [minimum_date.valueOf(), maximum_date.valueOf(), null],
}

// Subqueries that return the limits of the subset of the full range that is implemented
const PARTIALLY_IMPLEMENTED_TYPES_SUBSTITUTIONS = [
    `(SELECT array_extract([0::UINT64,${Number.MAX_SAFE_INTEGER}::UINT64,null::UINT64],i)) as ubigint`,
    `(SELECT array_extract([${Number.MIN_SAFE_INTEGER}::INT64,${Number.MAX_SAFE_INTEGER}::INT64,null],i)) as bigint`,
    `(SELECT array_extract(['${minimum_date_string}'::Date,'${maximum_date_string}'::Date,null],i)) as date`,
    `(SELECT array_extract(['${minimum_date_string}'::Timestamp,'${maximum_date_string}'::Timestamp,null],i)) as timestamp`,
];

// Types that are fully supported.
const FULLY_IMPLEMENTED_ANSWER_MAP: AnswerObjectType = {
    bool: [false, true, null],
    tinyint: [-128, 127, null],
    smallint: [-32768, 32767, null],
    int: [-2147483648, 2147483647, null],
    utinyint: [0, 255, null],
    usmallint: [0, 65535, null],
    uint: [0, 4294967295, null],

    // Note that we multiply by thousand (and add 999 for the max) because the value returned by DuckDB is in microseconds,
    // whereas the Date object is in milliseconds.
    time: [0, (new Date('1970-01-01T23:59:59.999+00:00')).valueOf() * 1000 + 999, null],
    time_tz: [0, new Date('1970-01-01T23:59:59.999+00:00').valueOf() * 1000 + 999, null],

    float: [-3.4028234663852886e+38, 3.4028234663852886e+38, null],
    double: [-1.7976931348623157e+308, 1.7976931348623157e+308, null],
    varchar: ['🦆🦆🦆🦆🦆🦆', 'goose', null],
    small_enum: ['DUCK_DUCK_ENUM', 'GOOSE', null],
    medium_enum: ['enum_0', 'enum_299', null],
    large_enum: ['enum_0', 'enum_69999', null],

    int_array: [[],[42, 999, null, null, -42], null],
    varchar_array: [[], ['🦆🦆🦆🦆🦆🦆', 'goose', null, ''], null],
    nested_int_array:  [[], [[], [42, 999, null, null, -42], null, [], [42, 999, null, null, -42]], null],

    struct: ['{"a":null,"b":null}','{"a":42,"b":"🦆🦆🦆🦆🦆🦆"}', null],
    struct_of_arrays: ['{"a":null,"b":null}','{"a":[42,999,null,null,-42],"b":["🦆🦆🦆🦆🦆🦆","goose",null,""]}', null],
    array_of_structs: [[], ['{"a":null,"b":null}', '{"a":42,"b":"🦆🦆🦆🦆🦆🦆"}',null], null],

    map: ['{}', '{"key1":"🦆🦆🦆🦆🦆🦆","key2":"goose"}', null]
};

const REPLACE_COLUMNS = PARTIALLY_IMPLEMENTED_TYPES.concat(NOT_IMPLEMENTED_TYPES);
REPLACE_COLUMNS.map((x) => {
    FULLY_IMPLEMENTED_ANSWER_MAP['not_implemented'] = ['not_implemented', 'not_implemented', 'not_implemented']
})

// Recursively unpack v
const UNPACK = function (v: any) : any {
    // console.info('------ new');
    // console.info(v);
    if (v === null) return null;
    if (v instanceof Vector) {
        // console.info('Vector');
        const ret = Array.from(v.toArray());
        for (let i = 0; i < ret.length; i++) {
            if (!v.isValid(i)) {
                ret[i] = null;
            }
        }
        // console.info(ret);
        return UNPACK(ret);
    } else if (v instanceof Array) {
        // console.info('Arr');
        const ret : any = [];
        for (let i = 0; i < v.length; i++) {
            ret[i] = UNPACK(v[i]);
        }
        // console.info(ret);
        return ret;
    }  else if (v instanceof Object) {
        // console.info('Obj');
        // console.info(JSON.stringify(v.toJSON()));
        return JSON.stringify(v.toJSON());
    }
    return v;
}

const GET_VALUE = function (x: any): any {
    if (x === null) {
        return null;
    } else if (typeof x?.valueOf === 'function') {
        return x.valueOf();
    } else if (typeof x?.toArray === 'function') {
        return x.toArray();
    } else {
        return x;
    }
}

const ALL_TYPES_TEST: AllTypesTest[] = [
    {
        name: 'Fully implemented',
        query: `SELECT * REPLACE(${REPLACE_COLUMNS.map(x => `'not_implemented' as ${x}`).join(', ')})
                FROM test_all_types();`,
        answerMap: FULLY_IMPLEMENTED_ANSWER_MAP,
        answerCount: REPLACE_COLUMNS.length + Object.keys(FULLY_IMPLEMENTED_ANSWER_MAP).length - 1
    },
    {
        name: 'Partially implemented',
        query: `SELECT ${PARTIALLY_IMPLEMENTED_TYPES_SUBSTITUTIONS.join(', ')}
                FROM range(0, 3) tbl(i)`,
        answerMap: PARTIALLY_IMPLEMENTED_ANSWER_MAP,
        answerCount: PARTIALLY_IMPLEMENTED_TYPES.length
    },
    // {
    //     name: 'type',
    //     query: `SELECT type from test_all_types()`,
    //     answerMap: {type: [null,null,null]},
    //     answerCount: 1
    // }
];

export function testAllTypes(db: () => duckdb.DuckDBBindings): void {
    let conn: duckdb.DuckDBConnection | null;

    beforeEach(() => {
        db().flushFiles();
    });

    afterEach(() => {
        if (conn) {
            conn.close();
            conn = null;
        }
        db().flushFiles();
        db().dropFiles();
    });
    describe('Test All Types', () => {
        for (const test of ALL_TYPES_TEST) {
            it(test.name, () => {
                conn = db().connect();
                const results = conn.query(test.query);
                expect(results.numCols).toEqual(test.answerCount);

                for (let i = 0; i < results.numCols; i++) {
                    const col = results.getColumnAt(i) as Column;

                    expect(UNPACK(GET_VALUE(col.get(0)))).toEqual(test.answerMap[col.name][0]); // Min
                    expect(UNPACK(GET_VALUE(col.get(1)))).toEqual(test.answerMap[col.name][1]); // Max
                    expect(GET_VALUE(col.get(2))).toEqual(test.answerMap[col.name][2]); // Null
                }
            });
        }
    });
}

export function testAllTypesAsync(db: () => duckdb.AsyncDuckDB): void {
    let conn: duckdb.AsyncDuckDBConnection | null = null;

    beforeEach(async () => {
        await db().flushFiles();
    });
    afterEach(async () => {
        if (conn) {
            await conn.close();
            conn = null;
        }
        await db().flushFiles();
        await db().dropFiles();
    });

    describe('Test All Types Async', () => {
        for (const test of ALL_TYPES_TEST) {
            it(test.name, async () => {
                conn = await db().connect();
                const results = await conn.query(test.query);
                expect(results.numCols).toEqual(test.answerCount);

                for (let i = 0; i < results.numCols; i++) {
                    const col = results.getColumnAt(i) as Column;

                    expect(UNPACK(GET_VALUE(col.get(0)))).toEqual(test.answerMap[col.name][0]); // Min
                    expect(UNPACK(GET_VALUE(col.get(1)))).toEqual(test.answerMap[col.name][1]); // Max
                    expect(GET_VALUE(col.get(2))).toEqual(test.answerMap[col.name][2]); // Null
                }
            });
        }
    });
}
