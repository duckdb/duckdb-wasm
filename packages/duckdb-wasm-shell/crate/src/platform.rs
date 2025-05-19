use wasm_bindgen::prelude::*;

#[wasm_bindgen(module = "@motherduck/duckdb-wasm")]
extern "C" {
    #[wasm_bindgen(js_name = "PlatformFeatures")]
    type JSPlatformFeatures;
    #[wasm_bindgen(catch, js_name = "getPlatformFeatures")]
    async fn get_platform_features() -> Result<JsValue, JsValue>;

    #[wasm_bindgen(method, getter, js_name = "bigInt64Array")]
    pub fn has_bigint64array(this: &JSPlatformFeatures) -> bool;
    #[wasm_bindgen(method, getter, js_name = "wasmThreads")]
    pub fn has_wasm_threads(this: &JSPlatformFeatures) -> bool;
    #[wasm_bindgen(method, getter, js_name = "wasmExceptions")]
    pub fn has_wasm_exceptions(this: &JSPlatformFeatures) -> bool;
    #[wasm_bindgen(method, getter, js_name = "wasmSIMD")]
    pub fn has_wasm_simd(this: &JSPlatformFeatures) -> bool;
    #[wasm_bindgen(method, getter, js_name = "wasmBulkMemory")]
    pub fn has_wasm_bulk_memory(this: &JSPlatformFeatures) -> bool;
    #[wasm_bindgen(method, getter, js_name = "crossOriginIsolated")]
    pub fn is_cross_origin_isolated(this: &JSPlatformFeatures) -> bool;
}

pub struct PlatformFeatures {
    pub bigint64array: bool,
    pub cross_origin_isolated: bool,
    pub wasm_threads: bool,
    pub wasm_simd: bool,
    pub wasm_bulk_memory: bool,
    pub wasm_exceptions: bool,
}

impl PlatformFeatures {
    pub async fn get() -> Self {
        match get_platform_features().await {
            Ok(v) => {
                let f: JSPlatformFeatures = v.into();
                Self {
                    bigint64array: f.has_bigint64array(),
                    cross_origin_isolated: f.is_cross_origin_isolated(),
                    wasm_threads: f.has_wasm_threads(),
                    wasm_simd: f.has_wasm_simd(),
                    wasm_bulk_memory: f.has_wasm_bulk_memory(),
                    wasm_exceptions: f.has_wasm_exceptions(),
                }
            }
            Err(_e) => Self {
                bigint64array: false,
                cross_origin_isolated: false,
                wasm_threads: false,
                wasm_simd: false,
                wasm_bulk_memory: false,
                wasm_exceptions: false,
            },
        }
    }
}
