use js_sys::Uint8Array;
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;

type ConnectionID = u32;

#[wasm_bindgen(module = "@duckdb/duckdb-wasm")]
extern "C" {
    #[wasm_bindgen(js_name = "AsyncDuckDB")]
    pub type AsyncDuckDBBindings;

    #[wasm_bindgen(catch, method, js_name = "getVersion")]
    async fn get_version(this: &AsyncDuckDBBindings) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "getFeatureFlags")]
    async fn get_feature_flags(this: &AsyncDuckDBBindings) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "connectInternal")]
    async fn connect(this: &AsyncDuckDBBindings) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "runQuery")]
    async fn run_query(
        this: &AsyncDuckDBBindings,
        conn: ConnectionID,
        text: &str,
    ) -> Result<JsValue, JsValue>;
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
    /// Create an async DuckDB from bindings
    pub fn from_bindings(bindings: AsyncDuckDBBindings) -> Self {
        Self { bindings }
    }

    /// Get the DuckDB version
    pub async fn get_version(&self) -> Result<String, JsValue> {
        Ok(self
            .bindings
            .get_version()
            .await?
            .as_string()
            .unwrap_or("?".to_string()))
    }

    /// Get the DuckDB feature flags
    pub async fn get_feature_flags(&self) -> Result<u32, JsValue> {
        Ok(self
            .bindings
            .get_feature_flags()
            .await?
            .as_f64()
            .unwrap_or(0.0) as u32)
    }

    pub async fn connect(&self) -> Result<f64, JsValue> {
        Ok(self.bindings.connect().await?.as_f64().unwrap_or(0.0))
    }
}

pub struct AsyncDuckDBConnection {
    duckdb: Rc<RefCell<AsyncDuckDB>>,
    connection: u32,
}

impl AsyncDuckDBConnection {
    /// Run a query
    pub async fn run_query(&self, text: &str) -> Result<Uint8Array, JsValue> {
        Ok(self
            .duckdb
            .borrow_mut()
            .bindings
            .run_query(self.connection, text)
            .await?
            .into())
    }

    /// Fetch query result s
    pub async fn fetch_query_results(&self) -> Result<Uint8Array, JsValue> {
        Ok(self
            .duckdb
            .borrow_mut()
            .bindings
            .fetch_query_results(self.connection)
            .await?
            .into())
    }
}
