use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
#[repr(u8)]
pub enum DataProtocol {
    Buffer = 0,
    Native = 1,
    Http = 2,
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct WebFile {
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "fileId")]
    pub file_id: Option<u64>,
    #[serde(rename = "fileSize")]
    pub file_size: Option<u64>,
    #[serde(rename = "dataProtocol")]
    pub data_protocol: Option<u8>,
    #[serde(rename = "dataUrl")]
    pub data_url: Option<String>,
    #[serde(rename = "dataNativeFd")]
    pub data_native_fd: Option<u64>,
    #[serde(rename = "reliableHeadRequests")]
    pub reliable_head_requests: Option<bool>,
    #[serde(rename = "allowFullHttpReads")]
    pub allow_full_http_reads: Option<bool>,
    #[serde(rename = "collectStatistics")]
    pub collect_statistics: Option<bool>,
}
