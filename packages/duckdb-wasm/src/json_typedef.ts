import * as arrow from 'apache-arrow';

export interface SQLType {
    /// The logical type
    logicalType: string;
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
    fieldTypes?: SQLField[];
}

export function arrowToSQLType(type: arrow.DataType): SQLType {
    switch (type.typeId) {
        case arrow.Type.Binary:
            return { logicalType: 'binary' };
        case arrow.Type.Bool:
            return { logicalType: 'bool' };
        case arrow.Type.Date:
            return { logicalType: 'date' };
        case arrow.Type.DateDay:
            return { logicalType: 'date32[d]' };
        case arrow.Type.DateMillisecond:
            return { logicalType: 'date64[ms]' };
        case arrow.Type.Decimal: {
            const dec = type as arrow.Decimal;
            return { logicalType: 'decimal', precision: dec.precision, scale: dec.scale };
        }
        case arrow.Type.Float:
            return { logicalType: 'float' };
        case arrow.Type.Float16:
            return { logicalType: 'float16' };
        case arrow.Type.Float32:
            return { logicalType: 'float32' };
        case arrow.Type.Float64:
            return { logicalType: 'float64' };
        case arrow.Type.Int:
            return { logicalType: 'int32' };
        case arrow.Type.Int16:
            return { logicalType: 'int16' };
        case arrow.Type.Int32:
            return { logicalType: 'int32' };
        case arrow.Type.Int64:
            return { logicalType: 'int64' };
        case arrow.Type.Uint16:
            return { logicalType: 'uint16' };
        case arrow.Type.Uint32:
            return { logicalType: 'uint32' };
        case arrow.Type.Uint64:
            return { logicalType: 'uint64' };
        case arrow.Type.Uint8:
            return { logicalType: 'uint8' };
        case arrow.Type.IntervalDayTime:
            return { logicalType: 'interval[dt]' };
        case arrow.Type.IntervalYearMonth:
            return { logicalType: 'interval[m]' };
        case arrow.Type.List: {
            const list = type as arrow.List;
            return {
                logicalType: 'list',
                valueType: arrowToSQLType(list.valueType),
            };
        }
        case arrow.Type.FixedSizeBinary: {
            const bin = type as arrow.FixedSizeBinary;
            return { logicalType: 'fixedsizebinary', byteWidth: bin.byteWidth };
        }
        case arrow.Type.Null:
            return { logicalType: 'null' };
        case arrow.Type.Utf8:
            return { logicalType: 'utf8' };
        case arrow.Type.Struct: {
            const struct_ = type as arrow.Struct;
            return {
                logicalType: 'struct',
                fieldTypes: struct_.children.map(c => arrowToSQLField(c.name, c.type)),
            };
        }
        case arrow.Type.Map: {
            const map_ = type as arrow.Map_;
            return {
                logicalType: 'map',
                keyType: arrowToSQLType(map_.keyType),
                valueType: arrowToSQLType(map_.valueType),
            };
        }
        case arrow.Type.Time:
            return { logicalType: 'time[s]' };
        case arrow.Type.TimeMicrosecond:
            return { logicalType: 'time[us]' };
        case arrow.Type.TimeMillisecond:
            return { logicalType: 'time[ms]' };
        case arrow.Type.TimeNanosecond:
            return { logicalType: 'time[ns]' };
        case arrow.Type.TimeSecond:
            return { logicalType: 'time[s]' };
        case arrow.Type.Timestamp: {
            const ts = type as arrow.Timestamp;
            return { logicalType: 'timestamp', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampSecond: {
            const ts = type as arrow.TimestampSecond;
            return { logicalType: 'timestamp[s]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampMicrosecond: {
            const ts = type as arrow.TimestampMicrosecond;
            return { logicalType: 'timestamp[us]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampNanosecond: {
            const ts = type as arrow.TimestampNanosecond;
            return { logicalType: 'timestamp[ns]', timezone: ts.timezone || undefined };
        }
        case arrow.Type.TimestampMillisecond: {
            const ts = type as arrow.TimestampMillisecond;
            return { logicalType: 'timestamp[ms]', timezone: ts.timezone || undefined };
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
