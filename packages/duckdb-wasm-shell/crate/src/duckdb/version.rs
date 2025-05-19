use wasm_bindgen::prelude::*;

#[wasm_bindgen(module = "@motherduck/duckdb-wasm")]
extern "C" {
    #[wasm_bindgen(js_name = "PACKAGE_NAME")]
    pub static PACKAGE_NAME: String;

    #[wasm_bindgen(js_name = "PACKAGE_VERSION")]
    pub static PACKAGE_VERSION: String;
    #[wasm_bindgen(js_name = "PACKAGE_VERSION_MAJOR")]
    pub static PACKAGE_VERSION_MAJOR: String;
    #[wasm_bindgen(js_name = "PACKAGE_VERSION_MINOR")]
    pub static PACKAGE_VERSION_MINOR: String;
    #[wasm_bindgen(js_name = "PACKAGE_VERSION_PATCH")]
    pub static PACKAGE_VERSION_PATCH: String;
}
