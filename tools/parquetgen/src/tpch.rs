//use arrow::csv::ReaderBuilder;
use parquet::schema::parser::parse_message_type;
use parquet::{arrow::parquet_to_arrow_schema, schema::types::SchemaDescriptor};
use std::fs;
use std::path::PathBuf;
use std::process;
use std::sync::Arc;

fn convert_tbl(
    tbl_file: PathBuf,
    schema_str: &'static str,
    _out_dir: &PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    let tbl_md = fs::metadata(&tbl_file);
    if tbl_md.is_err() || !tbl_md.unwrap().is_dir() {
        println!("Tbl does not exist: {}", tbl_file.to_str().unwrap());
        process::exit(1);
    }
    let schema = Arc::new(parse_message_type(&schema_str)?);
    let schema_desc = SchemaDescriptor::new(schema.clone());
    let _arrow_schema = parquet_to_arrow_schema(&schema_desc, &None);

    // Create csv reader

    // Stream to parquet writer

    return Ok(());
}

pub fn convert_tbls(
    tbl_dir: &PathBuf,
    out_dir: &PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    convert_tbl(
        tbl_dir.join("lineitem.tbl"),
        "
        message schema {
            required int32 l_orderkey;
            required int32 l_partkey;
            required int32 l_suppkey;
            required int32 l_linenumber;
        }
    ",
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("supplier.tbl"),
        "
        message schema {
        }
    ",
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("customer.tbl"),
        "
        message schema {
        }
    ",
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("part.tbl"),
        "
        message schema {
        }
    ",
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("partsupp.tbl"),
        "
        message schema {
        }
    ",
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("region.tbl"),
        "
        message schema {
        }
    ",
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("nation.tbl"),
        "
        message schema {
        }
    ",
        out_dir,
    )?;
    return Ok(());
}
