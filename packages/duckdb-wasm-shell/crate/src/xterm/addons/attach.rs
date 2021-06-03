use crate::xterm::{Terminal, TerminalAddon};
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::WebSocket;

#[wasm_bindgen(module = "xterm-addon-attach")]
extern "C" {

    #[wasm_bindgen(js_name = "IAttachOptions")]
    pub type AttachOptions;

    #[wasm_bindgen(method, setter, js_name = "bidirectional")]
    fn set_bidirectional(this: &AttachOptions, val: bool);

    // ========================================================================

    #[wasm_bindgen(extends = TerminalAddon)]
    pub type AttachAddon;

    #[wasm_bindgen(constructor)]
    pub fn new(socket: WebSocket, options: Option<AttachOptions>) -> AttachAddon;

    #[wasm_bindgen(method, method, js_name = "activate")]
    pub fn activate(this: &AttachOptions, terminal: Terminal);

    #[wasm_bindgen(method, method, js_name = "dispose")]
    pub fn dispose(this: &AttachOptions);
}

impl AttachOptions {
    pub fn new() -> Self {
        js_sys::Object::new().unchecked_into()
    }

    pub fn with_bidirectional(&self, val: bool) -> &Self {
        self.set_bidirectional(val);
        self
    }
}
