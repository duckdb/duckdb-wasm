pub mod bindings;
pub mod codes;
pub mod print;
pub mod shell;
pub mod shell_embedding;
pub mod shell_options;
pub mod xterm;

use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}
