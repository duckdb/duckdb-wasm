pub mod arrow_stream;
pub mod duckdb;
pub mod error;
pub mod shell;
pub mod shell_api;
pub mod shell_options;
pub mod term_codes;
pub mod xterm;

use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}
