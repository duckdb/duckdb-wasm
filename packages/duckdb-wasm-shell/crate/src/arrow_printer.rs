// The contents of this file were derived from the arrow pretty printer.
// https://github.com/apache/arrow-rs/blob/45acc62c1c07b1eb55512a0d42628542211996d3/arrow/src/util/pretty.rs

// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

//! Utilities for printing record batches. Note this module is not
//! available unless `feature = "prettyprint"` is enabled.

use arrow::datatypes::DataType;
use arrow::record_batch::RecordBatch;

use crate::comfy;
pub use crate::comfy::presets::ASCII_BORDERS_NO_HORIZONTAL;
pub use crate::comfy::presets::UTF8_BORDERS_NO_HORIZONTAL;
pub use crate::comfy::ContentArrangement;
use crate::comfy::{Cell, Row, Table};

use arrow::error::Result;

use arrow::util::display::array_value_to_string;

///! Create a visual representation of record batches
pub fn pretty_format_batches(
    results: &[RecordBatch],
    table_width: u16,
    presets: &str,
) -> Result<String> {
    Ok(create_table(results, table_width, presets)?.to_string())
}

fn get_column_alignment(column: &arrow::array::ArrayRef) -> comfy::CellAlignment {
    match column.data_type() {
        DataType::Boolean
        | DataType::Int8
        | DataType::Int16
        | DataType::Int32
        | DataType::Int64
        | DataType::UInt8
        | DataType::UInt16
        | DataType::UInt32
        | DataType::UInt64
        | DataType::Float16
        | DataType::Float32
        | DataType::Float64
        | DataType::Decimal128(_, _) => comfy::CellAlignment::Right,
        _ => comfy::CellAlignment::Left,
    }
}

///! Convert a series of record batches into a table
fn create_table(results: &[RecordBatch], table_width: u16, presets: &str) -> Result<Table> {
    let mut table = Table::new();
    table.load_preset(presets);
    table.set_table_width(table_width);
    table.set_content_arrangement(ContentArrangement::Dynamic);

    if results.is_empty() {
        return Ok(table);
    }

    let schema = results[0].schema();

    let mut header = Vec::new();
    for field in schema.fields() {
        header.push(Cell::new(field.name().as_str()));
    }
    table.set_header(Row::from(header));

    for batch in results {
        for row in 0..batch.num_rows() {
            let mut cells = Vec::new();
            for col in 0..batch.num_columns() {
                let column = batch.column(col);
                let cell = Cell::new(&array_value_to_string(column, row)?);
                cells.push(cell.set_alignment(get_column_alignment(column)));
            }
            table.add_row(Row::from(cells));
        }
    }

    Ok(table)
}

#[cfg(test)]
mod tests {
    use arrow::{
        array::{
            self, new_null_array, Array, ArrayRef, Date32Array, Date64Array, PrimitiveBuilder,
            StringBuilder, StringDictionaryBuilder, Time32MillisecondArray, Time32SecondArray,
            Time64MicrosecondArray, Time64NanosecondArray, TimestampMicrosecondArray,
            TimestampMillisecondArray, TimestampNanosecondArray, TimestampSecondArray,
        },
        datatypes::{DataType, Field, Int32Type, Schema},
    };

    use super::*;
    use arrow::array::{DecimalBuilder, Int32Array};
    use std::sync::Arc;

    #[test]
    fn test_pretty_format_batches() -> Result<()> {
        // define a schema.
        let schema = Arc::new(Schema::new(vec![
            Field::new("a", DataType::Utf8, true),
            Field::new("b", DataType::Int32, true),
        ]));

        // define data.
        let batch = RecordBatch::try_new(
            schema,
            vec![
                Arc::new(array::StringArray::from(vec![
                    Some("a"),
                    Some("b"),
                    None,
                    Some("d"),
                ])),
                Arc::new(array::Int32Array::from(vec![
                    Some(1),
                    None,
                    Some(10),
                    Some(100),
                ])),
            ],
        )?;

        let table = pretty_format_batches(&[batch], 100, ASCII_BORDERS_NO_HORIZONTAL)?;

        let expected = vec![
            "+---+-----+",
            "| a | b   |",
            "+===+=====+",
            "| a |   1 |",
            "| b |     |",
            "|   |  10 |",
            "| d | 100 |",
            "+---+-----+",
        ];

        let actual: Vec<&str> = table.lines().collect();

        assert_eq!(expected, actual, "Actual result:\n{}", table);

        Ok(())
    }

    #[test]
    fn test_pretty_format_null() {
        let schema = Arc::new(Schema::new(vec![
            Field::new("a", DataType::Utf8, true),
            Field::new("b", DataType::Int32, true),
            Field::new("c", DataType::Null, true),
        ]));

        let num_rows = 4;
        let arrays = schema
            .fields()
            .iter()
            .map(|f| new_null_array(f.data_type(), num_rows))
            .collect();

        // define data (null)
        let batch = RecordBatch::try_new(schema, arrays).unwrap();

        let table = pretty_format_batches(&[batch], 100, ASCII_BORDERS_NO_HORIZONTAL).unwrap();

        let expected = vec![
            "+---+---+---+",
            "| a | b | c |",
            "+===+===+===+",
            "|   |   |   |",
            "|   |   |   |",
            "|   |   |   |",
            "|   |   |   |",
            "+---+---+---+",
        ];

        let actual: Vec<&str> = table.lines().collect();

        assert_eq!(expected, actual, "Actual result:\n{:#?}", table);
    }

    #[test]
    fn test_pretty_format_dictionary() -> Result<()> {
        // define a schema.
        let field_type = DataType::Dictionary(Box::new(DataType::Int32), Box::new(DataType::Utf8));
        let schema = Arc::new(Schema::new(vec![Field::new("d1", field_type, true)]));

        let keys_builder = PrimitiveBuilder::<Int32Type>::new(10);
        let values_builder = StringBuilder::new(10);
        let mut builder = StringDictionaryBuilder::new(keys_builder, values_builder);

        builder.append("one")?;
        builder.append_null()?;
        builder.append("three")?;
        let array = Arc::new(builder.finish());

        let batch = RecordBatch::try_new(schema, vec![array])?;

        let table = pretty_format_batches(&[batch], 100, ASCII_BORDERS_NO_HORIZONTAL)?;

        let expected = vec![
            "+-------+",
            "| d1    |",
            "+=======+",
            "| one   |",
            "|       |",
            "| three |",
            "+-------+",
        ];

        let actual: Vec<&str> = table.lines().collect();

        assert_eq!(expected, actual, "Actual result:\n{}", table);

        Ok(())
    }

    /// Generate an array with type $ARRAYTYPE with a numeric value of
    /// $VALUE, and compare $EXPECTED_RESULT to the output of
    /// formatting that array with `pretty_format_batches`
    macro_rules! check_datetime {
        ($ARRAYTYPE:ident, $VALUE:expr, $EXPECTED_RESULT:expr) => {
            let mut builder = $ARRAYTYPE::builder(10);
            builder.append_value($VALUE).unwrap();
            builder.append_null().unwrap();
            let array = builder.finish();

            let schema = Arc::new(Schema::new(vec![Field::new(
                "f",
                array.data_type().clone(),
                true,
            )]));
            let batch = RecordBatch::try_new(schema, vec![Arc::new(array)]).unwrap();

            let table = pretty_format_batches(&[batch], 100, ASCII_BORDERS_NO_HORIZONTAL)
                .expect("formatting batches");

            let expected = $EXPECTED_RESULT;
            let actual: Vec<&str> = table.lines().collect();

            assert_eq!(expected, actual, "Actual result:\n\n{:#?}\n\n", actual);
        };
    }

    #[test]
    fn test_pretty_format_timestamp_second() {
        let expected = vec![
            "+---------------------+",
            "| f                   |",
            "+=====================+",
            "| 1970-05-09 14:25:11 |",
            "|                     |",
            "+---------------------+",
        ];
        check_datetime!(TimestampSecondArray, 11111111, expected);
    }

    #[test]
    fn test_pretty_format_timestamp_millisecond() {
        let expected = vec![
            "+-------------------------+",
            "| f                       |",
            "+=========================+",
            "| 1970-01-01 03:05:11.111 |",
            "|                         |",
            "+-------------------------+",
        ];
        check_datetime!(TimestampMillisecondArray, 11111111, expected);
    }

    #[test]
    fn test_pretty_format_timestamp_microsecond() {
        let expected = vec![
            "+----------------------------+",
            "| f                          |",
            "+============================+",
            "| 1970-01-01 00:00:11.111111 |",
            "|                            |",
            "+----------------------------+",
        ];
        check_datetime!(TimestampMicrosecondArray, 11111111, expected);
    }

    #[test]
    fn test_pretty_format_timestamp_nanosecond() {
        let expected = vec![
            "+-------------------------------+",
            "| f                             |",
            "+===============================+",
            "| 1970-01-01 00:00:00.011111111 |",
            "|                               |",
            "+-------------------------------+",
        ];
        check_datetime!(TimestampNanosecondArray, 11111111, expected);
    }

    #[test]
    fn test_pretty_format_date_32() {
        let expected = vec![
            "+------------+",
            "| f          |",
            "+============+",
            "| 1973-05-19 |",
            "|            |",
            "+------------+",
        ];
        check_datetime!(Date32Array, 1234, expected);
    }

    #[test]
    fn test_pretty_format_date_64() {
        let expected = vec![
            "+------------+",
            "| f          |",
            "+============+",
            "| 2005-03-18 |",
            "|            |",
            "+------------+",
        ];
        check_datetime!(Date64Array, 1111111100000, expected);
    }

    #[test]
    fn test_pretty_format_time_32_second() {
        let expected = vec![
            "+----------+",
            "| f        |",
            "+==========+",
            "| 00:18:31 |",
            "|          |",
            "+----------+",
        ];
        check_datetime!(Time32SecondArray, 1111, expected);
    }

    #[test]
    fn test_pretty_format_time_32_millisecond() {
        let expected = vec![
            "+--------------+",
            "| f            |",
            "+==============+",
            "| 03:05:11.111 |",
            "|              |",
            "+--------------+",
        ];
        check_datetime!(Time32MillisecondArray, 11111111, expected);
    }

    #[test]
    fn test_pretty_format_time_64_microsecond() {
        let expected = vec![
            "+-----------------+",
            "| f               |",
            "+=================+",
            "| 00:00:11.111111 |",
            "|                 |",
            "+-----------------+",
        ];
        check_datetime!(Time64MicrosecondArray, 11111111, expected);
    }

    #[test]
    fn test_pretty_format_time_64_nanosecond() {
        let expected = vec![
            "+--------------------+",
            "| f                  |",
            "+====================+",
            "| 00:00:00.011111111 |",
            "|                    |",
            "+--------------------+",
        ];
        check_datetime!(Time64NanosecondArray, 11111111, expected);
    }

    #[test]
    fn test_int_display() -> Result<()> {
        let array = Arc::new(Int32Array::from(vec![6, 3])) as ArrayRef;
        let actual_one = array_value_to_string(&array, 0).unwrap();
        let expected_one = "6";

        let actual_two = array_value_to_string(&array, 1).unwrap();
        let expected_two = "3";
        assert_eq!(actual_one, expected_one);
        assert_eq!(actual_two, expected_two);
        Ok(())
    }

    #[test]
    fn test_decimal_display() -> Result<()> {
        let capacity = 10;
        let precision = 10;
        let scale = 2;

        let mut builder = DecimalBuilder::new(capacity, precision, scale);
        builder.append_value(101).unwrap();
        builder.append_null().unwrap();
        builder.append_value(200).unwrap();
        builder.append_value(3040).unwrap();

        let dm = Arc::new(builder.finish()) as ArrayRef;

        let schema = Arc::new(Schema::new(vec![Field::new(
            "f",
            dm.data_type().clone(),
            true,
        )]));

        let batch = RecordBatch::try_new(schema, vec![dm])?;

        let table = pretty_format_batches(&[batch], 100, ASCII_BORDERS_NO_HORIZONTAL)?;

        let expected = vec![
            "+-------+",
            "| f     |",
            "+=======+",
            "|  1.01 |",
            "|       |",
            "|  2.00 |",
            "| 30.40 |",
            "+-------+",
        ];

        let actual: Vec<&str> = table.lines().collect();
        assert_eq!(expected, actual, "Actual result:\n{}", table);

        Ok(())
    }

    #[test]
    fn test_decimal_display_zero_scale() -> Result<()> {
        let capacity = 10;
        let precision = 5;
        let scale = 0;

        let mut builder = DecimalBuilder::new(capacity, precision, scale);
        builder.append_value(101).unwrap();
        builder.append_null().unwrap();
        builder.append_value(200).unwrap();
        builder.append_value(3040).unwrap();

        let dm = Arc::new(builder.finish()) as ArrayRef;

        let schema = Arc::new(Schema::new(vec![Field::new(
            "f",
            dm.data_type().clone(),
            true,
        )]));

        let batch = RecordBatch::try_new(schema, vec![dm])?;

        let table = pretty_format_batches(&[batch], 100, ASCII_BORDERS_NO_HORIZONTAL)?;
        let expected = vec![
            "+------+", "| f    |", "+======+", "|  101 |", "|      |", "|  200 |", "| 3040 |",
            "+------+",
        ];

        let actual: Vec<&str> = table.lines().collect();
        assert_eq!(expected, actual, "Actual result:\n{}", table);

        Ok(())
    }
}
