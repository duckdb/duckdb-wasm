use crate::arrow_reader::ArrowStreamReader;
use arrow::ipc::reader::FileReader;
use js_sys::Uint8Array;
use std::cell::RefCell;
use std::io::Cursor;
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
    pub async fn get_feature_flags(&self) -> Result<u32, js_sys::Error> {
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

    result_stream: Option<ArrowStreamReader>,
}

impl AsyncDuckDBConnection {
    /// Run a query
    pub async fn run_query(
        &self,
        text: &str,
    ) -> Result<Vec<arrow::record_batch::RecordBatch>, js_sys::Error> {
        let ui8array: Uint8Array = self
            .duckdb
            .borrow_mut()
            .bindings
            .run_query(self.connection, text)
            .await?
            .into();
        let copy = ui8array.to_vec();
        let cursor = Cursor::new(copy);
        let reader = FileReader::try_new(cursor).unwrap();
        let mut batches: Vec<arrow::record_batch::RecordBatch> = Vec::new();
        for maybe_batch in reader {
            match maybe_batch {
                Ok(batch) => batches.push(batch),
                Err(err) => return Err(js_sys::Error::new(&err.to_string())),
            }
        }
        return Ok(batches);
    }

    /// Fetch query result
    pub async fn fetch_query_results(
        &mut self,
    ) -> Result<Option<arrow::record_batch::RecordBatch>, js_sys::Error> {
        let s = match self.result_stream {
            Some(ref mut stream) => stream,
            None => {
                return Err(js_sys::Error::new(
                    &"Missing query result stream".to_string(),
                ))
            }
        };
        let ui8array: Uint8Array = self
            .duckdb
            .borrow_mut()
            .bindings
            .fetch_query_results(self.connection)
            .await?
            .into();
        let copy = ui8array.to_vec();
        if copy.len() == 0 {
            return Ok(None);
        }
        match s.maybe_next(&copy) {
            Ok(r) => Ok(r),
            Err(err) => Err(js_sys::Error::new(&err.to_string())),
        }
    }
}
