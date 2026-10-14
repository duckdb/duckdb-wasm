#pragma once

#include "duckdb/common/http_util.hpp"

namespace duckdb {

class HTTPWasmUtil : public HTTPUtil {
   public:
    unique_ptr<HTTPClient> InitializeClient(HTTPParams &http_params, const string &proto_host_port) override;
    string GetName() const override;
};

}  // namespace duckdb
