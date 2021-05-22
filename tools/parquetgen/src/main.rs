use std::path::Path;
use std::{env, process};

mod error;
mod uni;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("Usage: pkg_uni_schema <dir>");
        process::exit(1);
    }
    let out_dir = Path::new(&args[1]);

    uni::write_tables(&out_dir)
}
