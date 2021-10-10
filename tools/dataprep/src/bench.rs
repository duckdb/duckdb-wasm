use chrono::serde::ts_seconds;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process;

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
        if !name.starts_with("bench") {
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

    println!("{:?}", reports);
    Ok(())
}
