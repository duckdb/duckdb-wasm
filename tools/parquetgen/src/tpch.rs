use arrow::datatypes::{DataType, Field, Schema, TimeUnit};
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
            Field::new("l_orderkey", DataType::Int32, false),
            Field::new("l_partkey", DataType::Int32, false),
            Field::new("l_suppkey", DataType::Int32, false),
            Field::new("l_linenumber", DataType::Int32, false),
            Field::new("l_quantity", DataType::Decimal(12, 2), false),
            Field::new("l_extendedprice", DataType::Decimal(12, 2), false),
            Field::new("l_discount", DataType::Decimal(12, 2), false),
            Field::new("l_tax", DataType::Decimal(12, 2), false),
            Field::new("l_returnflag", DataType::Utf8, false),
            Field::new("l_linestatus", DataType::Utf8, false),
            Field::new(
                "l_shipdate",
                DataType::Timestamp(TimeUnit::Second, None),
                false,
            ),
            Field::new(
                "l_commitdate",
                DataType::Timestamp(TimeUnit::Second, None),
                false,
            ),
            Field::new(
                "l_receiptdate",
                DataType::Timestamp(TimeUnit::Second, None),
                false,
            ),
            Field::new("l_shipinstruct", DataType::Utf8, false),
            Field::new("l_shipmode", DataType::Utf8, false),
            Field::new("l_comment", DataType::Utf8, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("supplier.tbl"),
        Schema::new(vec![
            Field::new("s_suppkey", DataType::Int32, false),
            Field::new("s_name", DataType::Utf8, false),
            Field::new("s_address", DataType::Utf8, false),
            Field::new("s_nationkey", DataType::Int32, false),
            Field::new("s_phone", DataType::Utf8, false),
            Field::new("s_acctbal", DataType::Decimal(12, 2), false),
            Field::new("s_comment", DataType::Utf8, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("customer.tbl"),
        Schema::new(vec![
            Field::new("c_custkey", DataType::Int32, false),
            Field::new("c_name", DataType::Utf8, false),
            Field::new("c_address", DataType::Utf8, false),
            Field::new("c_nationkey", DataType::Int32, false),
            Field::new("c_phone", DataType::Utf8, false),
            Field::new("c_acctbal", DataType::Decimal(12, 2), false),
            Field::new("c_mktsegment", DataType::Utf8, false),
            Field::new("c_comment", DataType::Utf8, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("part.tbl"),
        Schema::new(vec![
            Field::new("p_partkey", DataType::Int32, false),
            Field::new("p_name", DataType::Utf8, false),
            Field::new("p_mfgr", DataType::Utf8, false),
            Field::new("p_brand", DataType::Utf8, false),
            Field::new("p_type", DataType::Utf8, false),
            Field::new("p_size", DataType::Int32, false),
            Field::new("p_container", DataType::Utf8, false),
            Field::new("p_retailprice", DataType::Decimal(12, 2), false),
            Field::new("p_comment", DataType::Utf8, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("partsupp.tbl"),
        Schema::new(vec![
            Field::new("ps_partkey", DataType::Int32, false),
            Field::new("ps_suppkey", DataType::Int32, false),
            Field::new("ps_availqty", DataType::Int32, false),
            Field::new("ps_supplycost", DataType::Decimal(12, 2), false),
            Field::new("ps_comment", DataType::Utf8, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("region.tbl"),
        Schema::new(vec![
            Field::new("r_regionkey", DataType::Int32, false),
            Field::new("r_name", DataType::Utf8, false),
            Field::new("r_comment", DataType::Utf8, false),
        ]),
        out_dir,
    )?;
    convert_tbl(
        tbl_dir.join("nation.tbl"),
        Schema::new(vec![
            Field::new("n_nationkey", DataType::Int32, false),
            Field::new("n_name", DataType::Utf8, false),
            Field::new("n_regionkey", DataType::Int32, false),
            Field::new("n_comment", DataType::Utf8, false),
        ]),
        out_dir,
    )?;
    return Ok(());
}
