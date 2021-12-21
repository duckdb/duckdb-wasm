import * as duckdb from "../src/";
import {Column, Vector} from "apache-arrow";

// The max interval in microsec from DuckDB is 83 years 3 months 999 days 00:16:39.999999, with months as 30 days.
// Note that due to Arrow JS not supporting the duration type, the castDurationToInterval option is used for intervals.
// This has a side-effect that while the value is in microseconds, it only has millisecond accuracy. This is
// because DuckDB emits intervals in milliseconds and the Arrow Time64 type does not support milliseconds as unit.
const MAX_INTERVAL_US = (((( 83 * (12*30) + 3 * 30 + 999) * 24) * 60 + 16) * 60 + 39) * 1000000 + 999000;

// JS Date at +/-8640000000000000ms
const MINIMUM_DATE_STR = '-271821-04-20';
const MINIMUM_DATE = new Date(Date.UTC(-271821, 3, 20));
const MAXIMUM_DATE_STR = '275760-09-13';
const MAXIMUM_DATE = new Date(Date.UTC(275760, 8, 13));

// All columns contain 3 values: [min_value, max_value, null]
type AnswerObjectType = {
    [key: string]: Array<any>;
};

interface AllTypesTest {
    name: string,
    query: string;
    answerMap: AnswerObjectType;
    answerCount: number
}

// These types currently do not work in DuckDB-WASM
// timestamp_xx and date_tz types will soon be fully supported by duckdb and should be added then.
// hugeint, dec_18_3, dec38_10 and uuid require JS BigInts for full support, which is currently not supported by ArrowJS
// dec_4_1 and dec_9_4 suffer from https://github.com/duckdb/duckdb-wasm/issues/477
const NOT_IMPLEMENTED_TYPES = ['timestamp_s', 'timestamp_ms', 'timestamp_ns', 'date_tz', 'timestamp_tz', 'hugeint', 'dec_4_1', 'dec_9_4',
    'dec_18_3', 'dec38_10', 'uuid'];

// These types are supported, but not the full range returned from the test_all_types() table function, here we define
// the limits we do expect to be supported.
const PARTIALLY_IMPLEMENTED_TYPES = ['ubigint', 'bigint', 'date', 'timestamp'];
const PARTIALLY_IMPLEMENTED_ANSWER_MAP: AnswerObjectType = {
    ubigint: [0, Number.MAX_SAFE_INTEGER, null],
    bigint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, null],
    date: [MINIMUM_DATE.valueOf(), MAXIMUM_DATE.valueOf(), null],
    timestamp: [MINIMUM_DATE.valueOf(), MAXIMUM_DATE.valueOf(), null],
}

// Subqueries that return the limits of the subset of the full range that is implemented
const PARTIALLY_IMPLEMENTED_TYPES_SUBSTITUTIONS = [
    `(SELECT array_extract([0::UINT64,${Number.MAX_SAFE_INTEGER}::UINT64,null::UINT64],i)) as ubigint`,
    `(SELECT array_extract([${Number.MIN_SAFE_INTEGER}::INT64,${Number.MAX_SAFE_INTEGER}::INT64,null],i)) as bigint`,
    `(SELECT array_extract(['${MINIMUM_DATE_STR}'::Date,'${MAXIMUM_DATE_STR}'::Date,null],i)) as date`,
    `(SELECT array_extract(['${MINIMUM_DATE_STR}'::Timestamp,'${MAXIMUM_DATE_STR}'::Timestamp,null],i)) as timestamp`,
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
    interval: [0, MAX_INTERVAL_US,null],

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

    map: ['{}', '{"key1":"🦆🦆🦆🦆🦆🦆","key2":"goose"}', null],
    blob: [Uint8Array.from([116,104,105,115,105,115,97,108,111,110,103,98,108,111,98,0,119,105,116,104,110,117,
        108,108,98,121,116,101,115]),Uint8Array.from([92,120,48,48,92,120,48,48,92,120,48,48,97]),null]
};

const REPLACE_COLUMNS = PARTIALLY_IMPLEMENTED_TYPES.concat(NOT_IMPLEMENTED_TYPES);
REPLACE_COLUMNS.map((x) => {
    FULLY_IMPLEMENTED_ANSWER_MAP['not_implemented'] = ['not_implemented', 'not_implemented', 'not_implemented']
})

const UNPACK = function (v: any) : any {
    if (v === null) return null;

    if (v instanceof Vector) {
        const ret = Array.from(v.toArray());
        for (let i = 0; i < ret.length; i++) {
            if (!v.isValid(i)) {
                ret[i] = null;
            }
        }
        return UNPACK(ret);
    } else if (v instanceof Array) {
        const ret : any = [];
        for (let i = 0; i < v.length; i++) {
            ret[i] = UNPACK(v[i]);
        }
        return ret;
    } else if (v instanceof Uint8Array) {
        return v;
    } else if (v instanceof Object) {
        return JSON.stringify(v.toJSON());
    }

    return v;
}

const GET_VALUE = function (x: any): any {
    if (typeof x?.valueOf === 'function') {
        return x.valueOf();
    } else {
        return x;
    }
}

const ALL_TYPES_TEST: AllTypesTest[] = [
    {
        name: 'fully supported types',
        query: `SELECT * REPLACE(${REPLACE_COLUMNS.map(x => `'not_implemented' as ${x}`).join(', ')})
                FROM test_all_types();`,
        answerMap: FULLY_IMPLEMENTED_ANSWER_MAP,
        answerCount: REPLACE_COLUMNS.length + Object.keys(FULLY_IMPLEMENTED_ANSWER_MAP).length - 1
    },
    {
        name: 'partially supported types',
        query: `SELECT ${PARTIALLY_IMPLEMENTED_TYPES_SUBSTITUTIONS.join(', ')}
                FROM range(0, 3) tbl(i)`,
        answerMap: PARTIALLY_IMPLEMENTED_ANSWER_MAP,
        answerCount: PARTIALLY_IMPLEMENTED_TYPES.length
    },
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
                    expect(col.get(2)).toEqual(test.answerMap[col.name][2]); // Null
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
                    expect(col.get(2)).toEqual(test.answerMap[col.name][2]); // Null
                }
            });
        }
    });
}
