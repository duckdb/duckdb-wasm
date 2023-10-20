use clap::{self, ArgMatches};
use clap::{App, Arg};
use std::fs;
use std::path::{Path, PathBuf};
use std::process;

mod bench;
mod error;
mod tpch;
mod uni;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let matches = App::new("Data Preparation")
        .version("0.1")
        .author("Andre Kohn. <kohn.a@outlook.com>")
        .subcommand(
            App::new("uni")
                .help("Generates parquet files for the university schema")
                .arg(
                    Arg::new("out")
                        .short('o')
                        .takes_value(true)
                        .required(true)
                        .help("Directory where the parquet files are written"),
                ),
        )
        .subcommand(
            App::new("merge-benchmarks")
                .help("Merges benchmark reports")
                .arg(
                    Arg::new("reports")
                        .short('r')
                        .long("reports")
                        .takes_value(true)
                        .required(true)
                        .help("Report directory"),
                ),
        )
        .subcommand(
            App::new("tpch")
                .help("Generates arrow & parquet files from the TPCH TBL files")
                .arg(
                    Arg::new("in")
                        .long("in")
                        .takes_value(true)
                        .required(true)
                        .help("Directory with generated tbl files"),
                )
                .arg(
                    Arg::new("out-arrow")
                        .long("out-arrow")
                        .takes_value(true)
                        .required(true)
                        .help("Directory where the arrow files are written"),
                )
                .arg(
                    Arg::new("out-parquet")
                        .long("out-parquet")
                        .takes_value(true)
                        .required(true)
                        .help("Directory where the parquet files are written"),
                ),
        )
        .get_matches();

    let require_dir_arg = |matches: &ArgMatches, arg_name: &str| {
        let arg = matches.value_of(arg_name).unwrap();
        let arg_path = Path::new(&arg);
        let metadata = fs::metadata(&arg_path);
        if metadata.is_err() || !metadata.unwrap().is_dir() {
            println!("Invalid output directory: {}", arg);
            process::exit(1);
        }
        PathBuf::from(arg_path)
    };

    if let Some(matches) = matches.subcommand_matches("uni") {
        let out_dir = require_dir_arg(matches, "out");
        uni::write_tables(&out_dir);
        process::exit(0);
    }

    if let Some(matches) = matches.subcommand_matches("tpch") {
        let out_parquet_dir = require_dir_arg(matches, "out-parquet");
        let out_arrow_dir = require_dir_arg(matches, "out-arrow");
        let in_dir = require_dir_arg(matches, "in");
        tpch::convert_tbls(&in_dir, &out_parquet_dir, &out_arrow_dir)?;
        process::exit(0);
    }

    if let Some(matches) = matches.subcommand_matches("merge-benchmarks") {
        let report_dir = require_dir_arg(matches, "reports");
        bench::merge_benchmark_reports(&report_dir)?;
        process::exit(0);
    }

    Ok(())
}
