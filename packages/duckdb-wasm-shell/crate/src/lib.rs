pub mod arrow_printer;
pub mod arrow_reader;
pub mod comfy;
pub mod console;
pub mod duckdb;
pub mod error;
pub mod key_event;
pub mod platform;
pub mod prompt_buffer;
pub mod shell;
pub mod shell_api;
pub mod shell_options;
pub mod shell_runtime;
pub mod utils;
pub mod vt100;
pub mod xterm;

use wasm_bindgen::prelude::*;

use console::DEFAULT_LOGGER;

#[wasm_bindgen(start)]
pub fn main() {
    log::set_logger(&DEFAULT_LOGGER).unwrap();
    log::set_max_level(log::LevelFilter::Info);
}
