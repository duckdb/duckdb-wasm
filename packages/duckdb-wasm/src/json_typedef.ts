import * as arrow from 'apache-arrow';

export interface SQLType {
    /// The sql type
    sqlType: string;
    /// Is nullable?
    nullable?: boolean;
    /// Decimal precision
    precision?: number;
    /// Decimal scaling
    scale?: number;
    /// Timezone
    timezone?: string;
    /// Byte width (FixedSizeBinary)
    byteWidth?: number;
    /// Key type
    keyType?: SQLType;
    /// Value type
    valueType?: SQLType;
    /// Fields
    fields?: SQLField[];
}

export function arrowToSQLType(type: arrow.DataType): SQLType {
    switch (type.typeId) {
        case arrow.Type.Binary:
            return { sqlType: 'binary' };
        case arrow.Type.Bool:
            return { sqlType: 'bool' };
        case arrow.Type.Date:
            return { sqlType: 'date' };
        case arrow.Type.DateDay:
            return { sqlType: 'date32[d]' };
        case arrow.Type.DateMillisecond:
            return { sqlType: 'date64[ms]' };
        case arrow.Type.Decimal: {
            const dec = type as arrow.Decimal;
            return { sqlType: 'decimal', precision: dec.precision, scale: dec.scale };
        }
        case arrow.Type.Float:
            return { sqlType: 'float' };
        case arrow.Type.Float16:
            return { sqlType: 'float16' };
        case arrow.Type.Float32:
            return { sqlType: 'float32' };
        case arrow.Type.Float64:
            return { sqlType: 'float64' };
        case arrow.Type.Int:
            return { sqlType: 'int32' };
        case arrow.Type.Int16:
            return { sqlType: 'int16' };
        case arrow.Type.Int32:
            return { sqlType: 'int32' };
        case arrow.Type.Int64:
            return { sqlType: 'int64' };
        case arrow.Type.Uint16:
            return { sqlType: 'uint16' };
        case arrow.Type.Uint32:
            return { sqlType: 'uint32' };
        case arrow.Type.Uint64:
            return { sqlType: 'uint64' };
        case arrow.Type.Uint8:
            return { sqlType: 'uint8' };
        case arrow.Type.IntervalDayTime:
            return { sqlType: 'interval[dt]' };
        case arrow.Type.IntervalYearMonth:
            return { sqlType: 'interval[m]' };
        case arrow.Type.List: {
            const list = type as arrow.List;
            return {
                sqlType: 'list',
                valueType: arrowToSQLType(list.valueType),
            };
        }
        case arrow.Type.FixedSizeBinary: {
            const bin = type as arrow.FixedSizeBinary;
            return { sqlType: 'fixedsizebinary', byteWidth: bin.byteWidth };
        }
        case arrow.Type.Null:
            return { sqlType: 'null' };
        case arrow.Type.Utf8:
            return { sqlType: 'utf8' };
        case arrow.Type.Struct: {
            const struct_ = type as arrow.Struct;
            return {
                sqlType: 'struct',
                fields: struct_.children.map(c => arrowToSQLField(c.name, c.type)),
            };
        }
        case arrow.Type.Map: {
            const map_ = type as arrow.Map_;
            return {
                sqlType: 'map',
                keyType: arrowToSQLType(map_.keyType),
                valueType: arrowToSQLType(map_.valueType),
            };
        }
        case arrow.Type.Time:
            return { sqlType: 'time[s]' };
        case arrow.Type.TimeMicrosecond:
            return { sqlType: 'time[us]' };
        case arrow.Type.TimeMillisecond:
            return { sqlType: 'time[ms]' };
        case arrow.Type.TimeNanosecond:
            return { sqlType: 'time[ns]' };
        case arrow.Type.TimeSecond:
            return { sqlType: 'time[s]' };
        case arrow.Type.Timestamp: {
            const ts = type as arrow.Timestamp;
            return { sqlType: 'timestamp', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampSecond: {
            const ts = type as arrow.TimestampSecond;
            return { sqlType: 'timestamp[s]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampMicrosecond: {
            const ts = type as arrow.TimestampMicrosecond;
            return { sqlType: 'timestamp[us]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampNanosecond: {
            const ts = type as arrow.TimestampNanosecond;
            return { sqlType: 'timestamp[ns]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampMillisecond: {
            const ts = type as arrow.TimestampMillisecond;
            return { sqlType: 'timestamp[ms]', timezone: ts.timezone || undefined };
        }
    }
    throw new Error(`unsupported arrow type: ${type.toString()}`);
}

export type SQLField = SQLType & { name: string };

export function arrowToSQLField(name: string, type: arrow.DataType): SQLField {
    const t = arrowToSQLType(type) as SQLField;
    t.name = name;
    return t;
}
