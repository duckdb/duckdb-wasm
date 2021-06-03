use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;

type ConnectionID = u32;

#[wasm_bindgen(module = "@duckdb/duckdb-wasm")]
extern "C" {
    #[wasm_bindgen(js_name = "AsyncDuckDB")]
    type AsyncDuckDBBindings;

    #[wasm_bindgen(catch, method, js_name = "getVersion")]
    async fn get_version(this: &AsyncDuckDBBindings) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "getFeatureFlags")]
    async fn get_feature_flags(this: &AsyncDuckDBBindings) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "fetchQueryResults")]
    async fn fetch_query_results(
        this: &AsyncDuckDBBindings,
        conn: ConnectionID,
    ) -> Result<JsValue, JsValue>;
}

pub struct AsyncDuckDB {
    bindings: AsyncDuckDBBindings,
}

impl AsyncDuckDB {
    pub async fn get_version(&self) -> Result<String, JsValue> {
        Ok(self
            .bindings
            .get_version()
            .await?
            .as_string()
            .unwrap_or("?".to_string()))
    }

    pub async fn get_feature_flags(&self) -> Result<u32, JsValue> {
        Ok(self
            .bindings
            .get_feature_flags()
            .await?
            .as_f64()
            .unwrap_or(0.0) as u32)
    }

    pub async fn fetch_query_results(&self, conn: ConnectionID) -> Result<Uint8Array, JsValue> {
        Ok(self.bindings.fetch_query_results(conn).await?.into())
    }
}
