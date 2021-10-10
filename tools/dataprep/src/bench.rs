use arrow::datatypes::{DataType, Field, Schema};
use chrono::serde::ts_seconds;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::Path;
use std::process;
use std::sync::Arc;

#[derive(Serialize, Deserialize, Debug)]
pub struct BenchmarkReport {
    name: String,
    benchmark: String,
    system: String,
    tags: Vec<String>,
    #[serde(with = "ts_seconds")]
    timestamp: DateTime<Utc>,
    parameters: Vec<f64>,
    cycles: u64,
    samples: u64,
    hz: f64,
    #[serde(rename = "meanTime")]
    mean_time: f64,
    #[serde(rename = "standardDeviation")]
    standard_deviation: f64,
    #[serde(rename = "maxTime")]
    max_time: f64,
    #[serde(rename = "minTime")]
    min_time: f64,
    #[serde(rename = "runTime")]
    run_time: f64,
    #[serde(rename = "totalTime")]
    total_time: f64,
}

pub fn merge_benchmark_reports(report_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let mut path_buffer = report_dir.to_path_buf();
    let mut reports = Vec::new();
    for path in fs::read_dir(report_dir)? {
        let entry = match path {
            Err(e) => {
                println!("error reading directory: {}", e);
                process::exit(-1);
            }
            Ok(entry) => entry,
        };
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.starts_with("bench") || !name.ends_with(".json") {
            println!("[ SKIP ] {}", name);
            continue;
        }

        path_buffer.push(entry.file_name());

        println!("[ RUN  ] {}", name);
        let file = fs::File::open(&path_buffer)?;
        let mut r: Vec<BenchmarkReport> = serde_json::from_reader(file)?;
        reports.append(&mut r);
        println!("[ OK   ] {}", name);

        path_buffer.pop();
    }

    path_buffer.push("benchmarks.arrow");
    if path_buffer.exists() {
        println!("[ RUN  ] Removing old report");
        fs::remove_file(&path_buffer)?;
        println!("[ OK   ] Removing old report");
    }

    println!("[ RUN  ] Writing new report");

    // Build the arrow schema
    let schema = Arc::new(Schema::new(vec![
        Field::new("timestamp", DataType::Float64, false),
        Field::new("name", DataType::Utf8, false),
        Field::new("benchmark", DataType::Utf8, false),
        Field::new("system", DataType::Utf8, false),
        Field::new(
            "tags",
            DataType::List(Box::new(Field::new("item", DataType::Utf8, true))),
            false,
        ),
        Field::new(
            "parameters",
            DataType::List(Box::new(Field::new("item", DataType::Float64, true))),
            false,
        ),
        Field::new("cycles", DataType::Float64, false),
        Field::new("samples", DataType::Float64, false),
        Field::new("hz", DataType::Float64, false),
        Field::new("mean_time", DataType::Float64, false),
        Field::new("standard_deviation", DataType::Float64, false),
        Field::new("max_time", DataType::Float64, false),
        Field::new("min_time", DataType::Float64, false),
        Field::new("run_time", DataType::Float64, false),
        Field::new("total_time", DataType::Float64, false),
    ]));

    // Create arrow writer
    let mut arrow_file = fs::File::create(path_buffer)?;
    let mut arrow_writer = arrow::ipc::writer::FileWriter::try_new(&mut arrow_file, &schema)?;

    let mut name: Vec<String> = Vec::new();
    let mut benchmark: Vec<String> = Vec::new();
    let mut system: Vec<String> = Vec::new();
    let mut tags =
        arrow::array::ListBuilder::new(arrow::array::StringBuilder::new(reports.len() * 20));
    let mut params =
        arrow::array::ListBuilder::new(arrow::array::Float64Builder::new(reports.len() * 20));
    let mut timestamp = arrow::array::Float64Array::builder(reports.len());
    let mut cycles = arrow::array::Float64Array::builder(reports.len());
    let mut samples = arrow::array::Float64Array::builder(reports.len());
    let mut hz = arrow::array::Float64Array::builder(reports.len());
    let mut mean_time = arrow::array::Float64Array::builder(reports.len());
    let mut stddev = arrow::array::Float64Array::builder(reports.len());
    let mut max_time = arrow::array::Float64Array::builder(reports.len());
    let mut min_time = arrow::array::Float64Array::builder(reports.len());
    let mut run_time = arrow::array::Float64Array::builder(reports.len());
    let mut total_time = arrow::array::Float64Array::builder(reports.len());

    for mut report in reports {
        name.push(report.name);
        benchmark.push(report.benchmark);
        system.push(report.system);
        for tag in report.tags.drain(..) {
            tags.values().append_value(tag)?;
        }
        tags.append(true)?;
        for param in report.parameters.drain(..) {
            params.values().append_value(param)?;
        }
        params.append(true)?;
        timestamp.append_value(report.timestamp.timestamp() as f64)?;
        cycles.append_value(report.cycles as f64)?;
        samples.append_value(report.samples as f64)?;
        hz.append_value(report.hz as f64)?;
        mean_time.append_value(report.mean_time as f64)?;
        stddev.append_value(report.standard_deviation as f64)?;
        max_time.append_value(report.max_time as f64)?;
        min_time.append_value(report.min_time as f64)?;
        run_time.append_value(report.run_time as f64)?;
        total_time.append_value(report.total_time as f64)?;
    }

    let batch = arrow::record_batch::RecordBatch::try_new(
        schema,
        vec![
            Arc::new(timestamp.finish()),
            Arc::new(arrow::array::StringArray::from_iter_values(name.iter())),
            Arc::new(arrow::array::StringArray::from_iter_values(
                benchmark.iter(),
            )),
            Arc::new(arrow::array::StringArray::from_iter_values(system.iter())),
            Arc::new(tags.finish()),
            Arc::new(params.finish()),
            Arc::new(cycles.finish()),
            Arc::new(samples.finish()),
            Arc::new(hz.finish()),
            Arc::new(mean_time.finish()),
            Arc::new(stddev.finish()),
            Arc::new(max_time.finish()),
            Arc::new(min_time.finish()),
            Arc::new(run_time.finish()),
            Arc::new(total_time.finish()),
        ],
    )?;
    arrow_writer.write(&batch)?;
    arrow_writer.finish()?;
    drop(arrow_writer);
    arrow_file.flush()?;

    println!("[ OK   ] Writing new report");
    Ok(())
}
