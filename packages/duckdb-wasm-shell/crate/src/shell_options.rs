use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_name = "ShellOptions")]
    pub type ShellOptions;
    #[wasm_bindgen(method, getter, js_name = "backgroundColor")]
    pub fn get_bg(this: &ShellOptions) -> String;
    #[wasm_bindgen(method, getter, js_name = "fontFamily")]
    pub fn get_font_family(this: &ShellOptions) -> String;
    #[wasm_bindgen(method, getter, js_name = "withWebGL")]
    pub fn with_webgl(this: &ShellOptions) -> bool;
}
