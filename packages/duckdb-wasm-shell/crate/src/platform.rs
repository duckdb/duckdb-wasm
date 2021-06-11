use wasm_bindgen::prelude::*;

#[wasm_bindgen(module = "@duckdb/duckdb-wasm")]
extern "C" {
    #[wasm_bindgen(js_name = "PlatformFeatures")]
    type JSPlatformFeatures;
    #[wasm_bindgen(catch, js_name = "getPlatformFeatures")]
    async fn get_platform_features() -> Result<JsValue, JsValue>;

    #[wasm_bindgen(method, getter, js_name = "wasmThreads")]
    pub fn has_wasm_threads(this: &JSPlatformFeatures) -> bool;
    #[wasm_bindgen(method, getter, js_name = "wasmExceptions")]
    pub fn has_wasm_exceptions(this: &JSPlatformFeatures) -> bool;
    #[wasm_bindgen(method, getter, js_name = "crossOriginIsolated")]
    pub fn is_cross_origin_isolated(this: &JSPlatformFeatures) -> bool;
}

pub struct PlatformFeatures {
    pub cross_origin_isolated: bool,
    pub wasm_threads: bool,
    pub wasm_exceptions: bool,
}

impl PlatformFeatures {
    pub async fn get() -> Self {
        match get_platform_features().await {
            Ok(v) => {
                let f: JSPlatformFeatures = v.into();
                Self {
                    cross_origin_isolated: f.is_cross_origin_isolated(),
                    wasm_threads: f.has_wasm_threads(),
                    wasm_exceptions: f.has_wasm_exceptions(),
                }
            }
            Err(_e) => Self {
                cross_origin_isolated: false,
                wasm_threads: false,
                wasm_exceptions: false,
            },
        }
    }
}
