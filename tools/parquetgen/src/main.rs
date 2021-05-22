use clap::{self, ArgMatches};
use clap::{App, Arg};
use std::fs;
use std::path::{Path, PathBuf};
use std::process;

mod error;
mod tpch;
mod uni;

fn main() {
    let matches = App::new("Parquet Generator")
        .version("0.1")
        .author("Andre Kohn. <kohn.a@outlook.com>")
        .subcommand(
            App::new("uni")
                .about("Generates parquet files for the university schema")
                .arg(
                    Arg::new("out")
                        .short('o')
                        .takes_value(true)
                        .required(true)
                        .about("Directory where the parquet files are written"),
                ),
        )
        .subcommand(
            App::new("tpch")
                .about("Generates parquet files for the university schema")
                .arg(
                    Arg::new("out")
                        .short('o')
                        .takes_value(true)
                        .required(true)
                        .about("Directory where the parquet files are written"),
                )
                .arg(
                    Arg::new("in")
                        .short('i')
                        .takes_value(true)
                        .required(true)
                        .about("Directory with generated tbl files"),
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
        return PathBuf::from(arg_path);
    };

    if let Some(ref matches) = matches.subcommand_matches("uni") {
        let out_dir = require_dir_arg(&matches, "out");
        uni::write_tables(&out_dir);
        process::exit(0);
    }

    if let Some(ref matches) = matches.subcommand_matches("uni") {
        let out_dir = require_dir_arg(&matches, "out");
        let in_dir = require_dir_arg(&matches, "in");
        tpch::convert_tbls(&in_dir, &out_dir);
        process::exit(0);
    }
}
