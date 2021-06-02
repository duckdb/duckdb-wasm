use crate::xterm::{Terminal, TerminalAddon};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(module = "xterm-addon-unicode11")]
extern "C" {

    #[wasm_bindgen(extends = TerminalAddon)]
    pub type Unicode11Addon;

    #[wasm_bindgen(constructor)]
    pub fn new() -> Unicode11Addon;

    #[wasm_bindgen(method, method, js_name = "activate")]
    pub fn activate(this: &Unicode11Addon, terminal: Terminal);

    #[wasm_bindgen(method, method, js_name = "dispose")]
    pub fn dispose(this: &Unicode11Addon);

}
