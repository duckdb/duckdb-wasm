use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = "ShellRuntime")]
    pub type ShellRuntime;

    #[wasm_bindgen(method, js_name = "openFileExplorer")]
    pub fn open_file_explorer(this: &ShellRuntime);
    #[wasm_bindgen(method, catch, js_name = "readClipboardText")]
    pub async fn read_clipboard_text(this: &ShellRuntime) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(method, catch, js_name = "writeClipboardText")]
    pub async fn write_clipboard_text(this: &ShellRuntime, value: &str) -> Result<(), JsValue>;
    #[wasm_bindgen(method, catch, js_name = "pushInputToHistory")]
    pub async fn push_input_to_history(this: &ShellRuntime, value: &str) -> Result<(), JsValue>;
}
