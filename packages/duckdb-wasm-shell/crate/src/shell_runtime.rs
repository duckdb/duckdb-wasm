use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Deserialize, Serialize, Clone)]
pub struct FileInfo {
    pub name: String,
    pub url: Option<String>,
    #[serde(rename = "fileStatsEnabled")]
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

    #[wasm_bindgen(method, catch, js_name = "pickFiles")]
    pub async fn pick_files(this: &ShellRuntime) -> Result<JsValue, js_sys::Error>;
    #[wasm_bindgen(method, catch, js_name = "readClipboardText")]
    pub async fn read_clipboard_text(this: &ShellRuntime) -> Result<JsValue, js_sys::Error>;
    #[wasm_bindgen(method, catch, js_name = "writeClipboardText")]
    pub async fn write_clipboard_text(
        this: &ShellRuntime,
        value: &str,
    ) -> Result<(), js_sys::Error>;
    #[wasm_bindgen(method, catch, js_name = "pushInputToHistory")]
    pub async fn push_input_to_history(
        this: &ShellRuntime,
        value: &str,
    ) -> Result<(), js_sys::Error>;
}
