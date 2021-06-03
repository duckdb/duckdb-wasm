pub mod bindings;
pub mod codes;
pub mod embed;
pub mod options;
pub mod print;
pub mod xterm;

use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}
