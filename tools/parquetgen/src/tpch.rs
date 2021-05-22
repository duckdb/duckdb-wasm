use arrow::datatypes::{DataType, Field, Schema};
//use arrow::csv::ReaderBuilder;
use parquet::arrow::arrow_to_parquet_schema;
use std::fs;
use std::path::PathBuf;
use std::process;

fn convert_tbl(
    tbl_file: PathBuf,
    schema: Schema,
    _out_dir: &PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    let tbl_md = fs::metadata(&tbl_file);
    if tbl_md.is_err() || !tbl_md.unwrap().is_dir() {
        println!("Tbl does not exist: {}", tbl_file.to_str().unwrap());
        process::exit(1);
    }
    let _parquet_schema = arrow_to_parquet_schema(&schema)?;

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
        Schema::new(vec![
            Field::new("l_partkey", DataType::Int32, false),
            Field::new("l_partkey", DataType::Int32, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("supplier.tbl"),
        Schema::new(vec![
            Field::new("l_partkey", DataType::Int32, false),
            Field::new("l_partkey", DataType::Int32, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("customer.tbl"),
        Schema::new(vec![
            Field::new("l_partkey", DataType::Int32, false),
            Field::new("l_partkey", DataType::Int32, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("part.tbl"),
        Schema::new(vec![
            Field::new("l_partkey", DataType::Int32, false),
            Field::new("l_partkey", DataType::Int32, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("partsupp.tbl"),
        Schema::new(vec![
            Field::new("l_partkey", DataType::Int32, false),
            Field::new("l_partkey", DataType::Int32, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("region.tbl"),
        Schema::new(vec![
            Field::new("l_partkey", DataType::Int32, false),
            Field::new("l_partkey", DataType::Int32, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("nation.tbl"),
        Schema::new(vec![
            Field::new("l_partkey", DataType::Int32, false),
            Field::new("l_partkey", DataType::Int32, false),
        ]),
        out_dir,
    )?;
    return Ok(());
}
