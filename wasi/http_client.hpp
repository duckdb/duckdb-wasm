// The sandbox's HTTP: DuckDB's HTTPUtil/HTTPClient seam implemented over six imports of the module "sandbox_http",
// served by the host's relay (wasi/native/relay). httpfs is linked like the wasm port, without curl, OpenSSL or an
// httplib client, and uses this through DBConfig::http_util. Only bytes cross: the request is serialized into
// linear memory, status, headers and body come back into buffers the module owns.
#pragma once

#include "duckdb.hpp"

namespace duckdb {
class HTTPUtil;
shared_ptr<HTTPUtil> MakeSandboxHTTPUtil();
} // namespace duckdb
