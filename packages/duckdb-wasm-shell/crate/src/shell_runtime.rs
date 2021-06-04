use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = "ShellRuntime")]
    pub type ShellRuntime;

    #[wasm_bindgen(method, js_name = "openFileExplorer")]
    pub fn open_file_explorer(this: &ShellRuntime);
}
