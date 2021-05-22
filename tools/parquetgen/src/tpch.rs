use arrow::datatypes::{DataType, Field, Schema, TimeUnit};
//use arrow::csv::ReaderBuilder;
use parquet::arrow::arrow_to_parquet_schema;
use std::fs;
use std::path::PathBuf;
use std::process;
use std::sync::Arc;

fn convert_tbl(
    tbl_file_path: PathBuf,
    out_file_path: PathBuf,
    schema: Arc<Schema>,
) -> Result<(), Box<dyn std::error::Error>> {
    let tbl_md = fs::metadata(&tbl_file_path);
    if tbl_md.is_err() || !tbl_md.unwrap().is_dir() {
        println!("Tbl does not exist: {}", tbl_file_path.to_str().unwrap());
        process::exit(1);
    }
    let _parquet_schema = arrow_to_parquet_schema(&schema)?;

    // Create csv reader
    let tbl_file = fs::File::open(tbl_file_path)?;
    let reader = arrow::csv::ReaderBuilder::new()
        .with_delimiter('|' as u8)
        .with_schema(schema.clone())
        .with_batch_size(1024)
        .build(tbl_file)?;

    // Stream to parquet writer
    let parquet_file = fs::File::create(out_file_path)?;
    let mut writer = parquet::arrow::ArrowWriter::try_new(parquet_file, schema.clone(), None)?;

    // Write all batches
    for batch in reader {
        writer.write(&batch?)?;
    }
    return Ok(());
}

pub fn convert_tbls(
    tbl_dir: &PathBuf,
    out_dir: &PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    convert_tbl(
        tbl_dir.join("lineitem.tbl"),
        out_dir.join("lineitem.parquet"),
        Arc::new(Schema::new(vec![
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
        ])),
    )?;
    convert_tbl(
        tbl_dir.join("supplier.tbl"),
        out_dir.join("supplier.parquet"),
        Arc::new(Schema::new(vec![
            Field::new("s_suppkey", DataType::Int32, false),
            Field::new("s_name", DataType::Utf8, false),
            Field::new("s_address", DataType::Utf8, false),
            Field::new("s_nationkey", DataType::Int32, false),
            Field::new("s_phone", DataType::Utf8, false),
            Field::new("s_acctbal", DataType::Decimal(12, 2), false),
            Field::new("s_comment", DataType::Utf8, false),
        ])),
    )?;
    convert_tbl(
        tbl_dir.join("customer.tbl"),
        out_dir.join("customer.parquet"),
        Arc::new(Schema::new(vec![
            Field::new("c_custkey", DataType::Int32, false),
            Field::new("c_name", DataType::Utf8, false),
            Field::new("c_address", DataType::Utf8, false),
            Field::new("c_nationkey", DataType::Int32, false),
            Field::new("c_phone", DataType::Utf8, false),
            Field::new("c_acctbal", DataType::Decimal(12, 2), false),
            Field::new("c_mktsegment", DataType::Utf8, false),
            Field::new("c_comment", DataType::Utf8, false),
        ])),
    )?;
    convert_tbl(
        tbl_dir.join("part.tbl"),
        out_dir.join("part.parquet"),
        Arc::new(Schema::new(vec![
            Field::new("p_partkey", DataType::Int32, false),
            Field::new("p_name", DataType::Utf8, false),
            Field::new("p_mfgr", DataType::Utf8, false),
            Field::new("p_brand", DataType::Utf8, false),
            Field::new("p_type", DataType::Utf8, false),
            Field::new("p_size", DataType::Int32, false),
            Field::new("p_container", DataType::Utf8, false),
            Field::new("p_retailprice", DataType::Decimal(12, 2), false),
            Field::new("p_comment", DataType::Utf8, false),
        ])),
    )?;
    convert_tbl(
        tbl_dir.join("partsupp.tbl"),
        out_dir.join("partsupp.parquet"),
        Arc::new(Schema::new(vec![
            Field::new("ps_partkey", DataType::Int32, false),
            Field::new("ps_suppkey", DataType::Int32, false),
            Field::new("ps_availqty", DataType::Int32, false),
            Field::new("ps_supplycost", DataType::Decimal(12, 2), false),
            Field::new("ps_comment", DataType::Utf8, false),
        ])),
    )?;
    convert_tbl(
        tbl_dir.join("region.tbl"),
        out_dir.join("region.parquet"),
        Arc::new(Schema::new(vec![
            Field::new("r_regionkey", DataType::Int32, false),
            Field::new("r_name", DataType::Utf8, false),
            Field::new("r_comment", DataType::Utf8, false),
        ])),
    )?;
    convert_tbl(
        tbl_dir.join("nation.tbl"),
        out_dir.join("nation.parquet"),
        Arc::new(Schema::new(vec![
            Field::new("n_nationkey", DataType::Int32, false),
            Field::new("n_name", DataType::Utf8, false),
            Field::new("n_regionkey", DataType::Int32, false),
            Field::new("n_comment", DataType::Utf8, false),
        ])),
    )?;
    return Ok(());
}
