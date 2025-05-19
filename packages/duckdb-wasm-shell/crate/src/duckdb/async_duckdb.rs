use super::tokens::{JsScriptTokens, ScriptTokens};
use super::web_file::WebFile;
use super::{FileStatistics, JsFileStatistics};
use crate::arrow_reader::ArrowStreamReader;
use arrow::ipc::reader::FileReader;
use js_sys::Uint8Array;
use std::io::Cursor;
use std::sync::Arc;
use std::sync::RwLock;
use wasm_bindgen::prelude::*;

type ConnectionID = u32;

#[wasm_bindgen]
#[derive(Default)]
pub struct DuckDBConfig {
    path: Option<String>,
}

#[wasm_bindgen]
impl DuckDBConfig {
    #[wasm_bindgen(getter)]
    pub fn path(&self) -> Option<String> {
        self.path.clone()
    }
    #[wasm_bindgen(setter)]
    pub fn set_path(&mut self, path: Option<String>) {
        self.path = path;
    }
}


#[wasm_bindgen(module = "@motherduck/duckdb-wasm")]
extern "C" {
    #[wasm_bindgen(js_name = "AsyncDuckDB")]
    pub type JsAsyncDuckDB;

    #[wasm_bindgen(catch, method, js_name = "open")]
    async fn open(this: &JsAsyncDuckDB, config: DuckDBConfig) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "getVersion")]
    async fn get_version(this: &JsAsyncDuckDB) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "getFeatureFlags")]
    async fn get_feature_flags(this: &JsAsyncDuckDB) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "dropFile")]
    async fn drop_file(this: &JsAsyncDuckDB, name: &str) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "dropFiles")]
    async fn drop_files(this: &JsAsyncDuckDB) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "connectInternal")]
    async fn connect(this: &JsAsyncDuckDB) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "disconnect")]
    async fn disconnect(this: &JsAsyncDuckDB, conn: ConnectionID) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "tokenize")]
    async fn tokenize(this: &JsAsyncDuckDB, text: &str) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "runQuery")]
    async fn run_query(
        this: &JsAsyncDuckDB,
        conn: ConnectionID,
        text: &str,
    ) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "fetchQueryResults")]
    async fn fetch_query_results(
        this: &JsAsyncDuckDB,
        conn: ConnectionID,
    ) -> Result<JsValue, JsValue>;

    #[wasm_bindgen(catch, method, js_name = "registerOPFSFileName")]
    async fn register_opfs_file_name(
        this: &JsAsyncDuckDB,
        text: &str,
    ) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "collectFileStatistics")]
    async fn collect_file_statistics(
        this: &JsAsyncDuckDB,
        text: &str,
        enable: bool,
    ) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "exportFileStatistics")]
    async fn export_file_statistics(this: &JsAsyncDuckDB, file: &str) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "copyFileToBuffer")]
    async fn copy_file_to_buffer(this: &JsAsyncDuckDB, file: &str) -> Result<JsValue, JsValue>;
    #[wasm_bindgen(catch, method, js_name = "globFiles")]
    async fn glob_files(this: &JsAsyncDuckDB, path: &str) -> Result<JsValue, JsValue>;
}

pub struct AsyncDuckDB {
    bindings: JsAsyncDuckDB,
}

impl AsyncDuckDB {
    /// Create an async DuckDB from bindings
    pub fn from_bindings(bindings: JsAsyncDuckDB) -> Self {
        Self { bindings }
    }

    /// Open a database
    pub async fn open(&self, config: DuckDBConfig) -> Result<(), js_sys::Error> {
        let _status = self.bindings.open(config).await?;
        Ok(())
    }

    /// Get the DuckDB version
    pub async fn get_version(&self) -> Result<String, js_sys::Error> {
        Ok(self
            .bindings
            .get_version()
            .await?
            .as_string()
            .unwrap_or_else(|| "?".to_string()))
    }

    /// Drop a file
    pub async fn drop_file(&self, name: &str) -> Result<(), js_sys::Error> {
        self.bindings.drop_file(name).await?;
        Ok(())
    }

    /// Drop files
    pub async fn drop_files(&self) -> Result<(), js_sys::Error> {
        self.bindings.drop_files().await?;
        Ok(())
    }

    /// Glob files
    pub async fn glob_files(&self, path: &str) -> Result<Vec<WebFile>, js_sys::Error> {
        let files = self.bindings.glob_files(path).await?;
        let files_vec: Vec<WebFile> = files.into_serde().unwrap();
        Ok(files_vec)
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

    /// Tokenize a script text
    pub async fn tokenize(&self, text: &str) -> Result<ScriptTokens, js_sys::Error> {
        let tokens: JsScriptTokens = self.bindings.tokenize(text).await?.into();
        Ok(tokens.into())
    }

    /// Create a new connection
    pub async fn connect(selfm: Arc<RwLock<Self>>) -> Result<AsyncDuckDBConnection, js_sys::Error> {
        let db = selfm.read().unwrap();
        let cid: u32 = match db.bindings.connect().await?.as_f64() {
            Some(c) => c as u32,
            None => return Err(js_sys::Error::new("invalid connection id")),
        };
        Ok(AsyncDuckDBConnection::new(selfm.clone(), cid))
    }

    /// Enable file statistics
    pub async fn collect_file_statistics(
        &self,
        file: &str,
        enable: bool,
    ) -> Result<(), js_sys::Error> {
        self.bindings.collect_file_statistics(file, enable).await?;
        Ok(())
    }

    pub async fn register_opfs_file_name(
        &self,
        file: &str,
    ) -> Result<(), js_sys::Error> {
        self.bindings.register_opfs_file_name(file).await?;
        Ok(())
    }

    /// Enable file statistics
    pub async fn export_file_statistics(
        &self,
        file: &str,
    ) -> Result<FileStatistics, js_sys::Error> {
        let js_stats: JsFileStatistics = self.bindings.export_file_statistics(file).await?.into();
        Ok(FileStatistics::read(&js_stats))
    }

    /// Copy the file to a buffer
    pub async fn copy_file_to_buffer(
        &self,
        name: &str,
    ) -> Result<js_sys::Uint8Array, js_sys::Error> {
        let buffer: js_sys::Uint8Array = self.bindings.copy_file_to_buffer(name).await?.into();
        Ok(buffer)
    }
}

pub struct AsyncDuckDBConnection {
    duckdb: Arc<RwLock<AsyncDuckDB>>,
    connection: u32,

    result_stream: Option<ArrowStreamReader>,
}

impl AsyncDuckDBConnection {
    pub fn new(db: Arc<RwLock<AsyncDuckDB>>, cid: u32) -> Self {
        Self {
            duckdb: db,
            connection: cid,
            result_stream: None,
        }
    }

    /// Disconnect a connection
    pub async fn disconnect(&self) -> Result<(), js_sys::Error> {
        self.duckdb
            .read()
            .unwrap()
            .bindings
            .disconnect(self.connection)
            .await?;
        Ok(())
    }

    /// Run a query
    pub async fn run_query(
        &self,
        text: &str,
    ) -> Result<Vec<arrow::record_batch::RecordBatch>, js_sys::Error> {
        let ui8array: Uint8Array = self
            .duckdb
            .read()
            .unwrap()
            .bindings
            .run_query(self.connection, text)
            .await?
            .into();
        let copy = ui8array.to_vec();
        let cursor = Cursor::new(copy);
        let reader = FileReader::try_new(cursor, None).unwrap();
        let mut batches: Vec<arrow::record_batch::RecordBatch> = Vec::new();
        for maybe_batch in reader {
            match maybe_batch {
                Ok(batch) => batches.push(batch),
                Err(err) => return Err(js_sys::Error::new(&err.to_string())),
            }
        }
        Ok(batches)
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
            .read()
            .unwrap()
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
