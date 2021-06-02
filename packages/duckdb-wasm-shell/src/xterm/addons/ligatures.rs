use crate::xterm::{Terminal, TerminalAddon};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(module = "xterm-addon-ligatures")]
extern "C" {

    #[wasm_bindgen(extends = TerminalAddon)]
    pub type LigaturesAddon;

    #[wasm_bindgen(constructor)]
    pub fn new() -> LigaturesAddon;

    #[wasm_bindgen(method, method, js_name = "activate")]
    pub fn activate(this: &LigaturesAddon, terminal: &Terminal);

    #[wasm_bindgen(method, method, js_name = "dispose")]
    pub fn dispose(this: &LigaturesAddon);

}
