use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Deserialize, Serialize, Clone)]
pub struct FileInfo {
    pub name: String,
    pub url: Option<String>,
    pub file_stats_enabled: bool,
}

impl FileInfo {
    pub fn from_name(name: &str) -> Self {
        Self {
            name: name.to_string(),
            url: None,
            file_stats_enabled: false,
        }
    }
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = "ShellRuntime")]
    pub type ShellRuntime;

    #[wasm_bindgen(method, js_name = "openFileExplorer")]
    pub fn open_file_explorer(this: &ShellRuntime);
    #[wasm_bindgen(method, js_name = "updateFileInfo")]
    pub fn update_file_info(this: &ShellRuntime, info_json: &str);
    #[wasm_bindgen(method, catch, js_name = "readClipboardText")]
    pub async fn read_clipboard_text(this: &ShellRuntime) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(method, catch, js_name = "writeClipboardText")]
    pub async fn write_clipboard_text(this: &ShellRuntime, value: &str) -> Result<(), JsValue>;
    #[wasm_bindgen(method, catch, js_name = "pushInputToHistory")]
    pub async fn push_input_to_history(this: &ShellRuntime, value: &str) -> Result<(), JsValue>;
}
