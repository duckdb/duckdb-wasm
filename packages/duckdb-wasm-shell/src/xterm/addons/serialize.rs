use crate::xterm::{Terminal, TerminalAddon};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(module = "xterm-addon-serialize")]
extern "C" {

    #[wasm_bindgen(extends = TerminalAddon)]
    pub type SerializeAddon;

    #[wasm_bindgen(constructor)]
    pub fn new() -> SerializeAddon;

    #[wasm_bindgen(method, method, js_name = "activate")]
    pub fn activate(this: &SerializeAddon, terminal: Terminal);

    #[wasm_bindgen(method, method, js_name = "serialize")]
    pub fn serialize(this: &SerializeAddon, rows: Option<u32>) -> String;

    #[wasm_bindgen(method, method, js_name = "dispose")]
    pub fn dispose(this: &SerializeAddon);

}
