use crate::error::Error;
use arrow::datatypes::{DataType, Field, Schema};
use parquet::{
    arrow::arrow_to_parquet_schema,
    column::writer::ColumnWriter,
    data_type::ByteArray,
    file::{
        properties::WriterProperties,
        writer::{FileWriter, SerializedFileWriter},
    },
};
use std::fs;
use std::path::Path;
use std::process;
use std::sync::Arc;

enum StaticColumnData {
    Integer(Vec<i32>),
    Varchar(Vec<&'static str>),
}

fn write_table(path: std::path::PathBuf, schema: Schema, data: Vec<StaticColumnData>) {
    let filename = path.file_name().unwrap().to_str().unwrap_or("?");
    print!("{:.<24} ", &filename);

    match || -> Result<(), Box<dyn std::error::Error>> {
        fs::remove_file(&path).ok();
        let parquet_schema = arrow_to_parquet_schema(&schema)?;
        let props = Arc::new(WriterProperties::builder().build());
        let file = fs::File::create(&path)?;

        let mut writer = SerializedFileWriter::new(file, parquet_schema.root_schema_ptr(), props)?;
        let mut row_group_writer = writer.next_row_group()?;
        let mut column_id = 0;

        while let Some(mut col_writer) = row_group_writer.next_column()? {
            if column_id >= data.len() {
                return Err(Error::new(format!(
                    "Schema contains more columns than provided. (expected {})",
                    data.len()
                )));
            }
            match (&data[column_id], &mut col_writer) {
                (StaticColumnData::Integer(ref v), ColumnWriter::Int32ColumnWriter(ref mut w)) => {
                    w.write_batch(v, None, None)?;
                }
                (
                    StaticColumnData::Varchar(ref v),
                    ColumnWriter::ByteArrayColumnWriter(ref mut w),
                ) => {
                    let buffer: Vec<ByteArray> = v.iter().map(|x| ByteArray::from(*x)).collect();
                    w.write_batch(&buffer, None, None)?;
                }
                (_, _) => {
                    return Err(Error::new(format!(
                        "Type mismatch for column {}",
                        column_id
                    )));
                }
            }
            row_group_writer.close_column(col_writer)?;
            column_id += 1;
        }
        writer.close_row_group(row_group_writer)?;
        writer.close()?;

        Ok(())
    }() {
        Ok(_) => println!("OK"),
        Err(e) => println!("ERR\n{}", e),
    }
}

pub fn write_tables(out_dir: &Path) {
    let out_dir_str = out_dir.to_str().unwrap_or("?");
    let out_metadata = fs::metadata(out_dir);
    if out_metadata.is_err() || !out_metadata.unwrap().is_dir() {
        println!("Invalid output directory: {}", out_dir_str);
        process::exit(1);
    }

    write_table(
        out_dir.join("professoren.parquet"),
        Schema::new(vec![
            Field::new("persnr", DataType::Int32, false),
            Field::new("name", DataType::Utf8, false),
            Field::new("rang", DataType::Utf8, false),
            Field::new("raum", DataType::Int32, false),
        ]),
        vec![
            StaticColumnData::Integer(vec![2125, 2126, 2127, 2133, 2134, 2136, 2137]),
            StaticColumnData::Varchar(vec![
                "Sokrates",
                "Russel",
                "Kopernikus",
                "Popper",
                "Augustinus",
                "Curie",
                "Kant",
            ]),
            StaticColumnData::Varchar(vec!["C4", "C4", "C3", "C3", "C3", "C4", "C4"]),
            StaticColumnData::Integer(vec![226, 232, 310, 52, 309, 36, 7]),
        ],
    );

    write_table(
        out_dir.join("studenten.parquet"),
        Schema::new(vec![
            Field::new("matrnr", DataType::Int32, false),
            Field::new("name", DataType::Utf8, false),
            Field::new("semester", DataType::Int32, false),
        ]),
        vec![
            StaticColumnData::Integer(vec![24002, 25403, 26120, 26830, 27550, 28106, 29120, 29555]),
            StaticColumnData::Varchar(vec![
                "Xenokrates",
                "Jonas",
                "Fichte",
                "Aristoxenos",
                "Schopenhauer",
                "Carnap",
                "Theophrastos",
                "Feuerbach",
            ]),
            StaticColumnData::Integer(vec![18, 12, 10, 8, 6, 3, 2, 2]),
        ],
    );

    write_table(
        out_dir.join("vorlesungen.parquet"),
        Schema::new(vec![
            Field::new("vorlnr", DataType::Int32, false),
            Field::new("titel", DataType::Utf8, false),
            Field::new("sws", DataType::Int32, false),
            Field::new("gelesenvon", DataType::Int32, false),
        ]),
        vec![
            StaticColumnData::Integer(vec![
                5001, 5041, 5043, 5049, 4052, 5052, 5216, 5259, 5022, 4630,
            ]),
            StaticColumnData::Varchar(vec![
                "Grundzüge",
                "Ethik",
                "Erkenntnistheorie",
                "Mäeutik",
                "Logik",
                "Wissenschaftstheorie",
                "Bioethik",
                "Der Wiener Kreis",
                "Glaube und Wissen",
                "Die 3 Kritiken",
            ]),
            StaticColumnData::Integer(vec![4, 4, 3, 2, 4, 3, 2, 2, 2, 4]),
            StaticColumnData::Integer(vec![
                2137, 2125, 2126, 2125, 2125, 2126, 2126, 2133, 2134, 2137,
            ]),
        ],
    );

    write_table(
        out_dir.join("vorraussetzen.parquet"),
        Schema::new(vec![
            Field::new("vorgaenger", DataType::Int32, false),
            Field::new("nachfolger", DataType::Int32, false),
        ]),
        vec![
            StaticColumnData::Integer(vec![5001, 5001, 5001, 5041, 5043, 5041, 5052]),
            StaticColumnData::Integer(vec![5041, 5043, 5049, 5216, 5052, 5052, 5259]),
        ],
    );

    write_table(
        out_dir.join("hoeren.parquet"),
        Schema::new(vec![
            Field::new("matrnr", DataType::Int32, false),
            Field::new("vorlnr", DataType::Int32, false),
        ]),
        vec![
            StaticColumnData::Integer(vec![
                26120, 27550, 27550, 28106, 28106, 28106, 28106, 29120, 29120, 29120, 29555, 25403,
            ]),
            StaticColumnData::Integer(vec![
                5001, 5001, 4052, 5041, 5052, 5216, 5259, 5001, 5041, 5049, 5022, 5022,
            ]),
        ],
    );

    write_table(
        out_dir.join("pruefen.parquet"),
        Schema::new(vec![
            Field::new("matrnr", DataType::Int32, false),
            Field::new("vorlnr", DataType::Int32, false),
            Field::new("persnr", DataType::Int32, false),
            Field::new("note", DataType::Int32, false),
        ]),
        vec![
            StaticColumnData::Integer(vec![28106, 25403, 27550]),
            StaticColumnData::Integer(vec![5001, 5041, 4630]),
            StaticColumnData::Integer(vec![2126, 2125, 2137]),
            StaticColumnData::Integer(vec![1, 2, 2]),
        ],
    );

    write_table(
        out_dir.join("assistenten.parquet"),
        Schema::new(vec![
            Field::new("persnr", DataType::Int32, false),
            Field::new("name", DataType::Utf8, false),
            Field::new("fachgebiet", DataType::Utf8, false),
            Field::new("boss", DataType::Int32, false),
        ]),
        vec![
            StaticColumnData::Integer(vec![3002, 3003, 3004, 3005, 3006, 3007]),
            StaticColumnData::Varchar(vec![
                "Platon",
                "Aristoteles",
                "Wittgenstein",
                "Rhetikus",
                "Newton",
                "Spinoza",
            ]),
            StaticColumnData::Varchar(vec![
                "Ideenlehre",
                "Syllogistik",
                "Sprachteorie",
                "Planetenbewegung",
                "Keplersche Gesetze",
                "Gott und Natur",
            ]),
            StaticColumnData::Integer(vec![2125, 2125, 2126, 2127, 2127, 2126]),
        ],
    );
}
