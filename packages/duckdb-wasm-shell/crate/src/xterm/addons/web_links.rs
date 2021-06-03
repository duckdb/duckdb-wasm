use crate::xterm::{LinkMatcherOptions, Terminal, TerminalAddon};
use js_sys::Function;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(module = "xterm-addon-web-links")]
extern "C" {

    #[wasm_bindgen(extends = TerminalAddon)]
    pub type WebLinksAddon;

    #[wasm_bindgen(constructor)]
    pub fn new(
        handler: Option<&Function>, // (event: MouseEvent, uri: &str) => void
        options: Option<&LinkMatcherOptions>,
        useLinkProvider: Option<bool>,
    ) -> WebLinksAddon;

    #[wasm_bindgen(method, method, js_name = "activate")]
    pub fn activate(this: &WebLinksAddon, terminal: &Terminal);

    #[wasm_bindgen(method, method, js_name = "dispose")]
    pub fn dispose(this: &WebLinksAddon);
}
