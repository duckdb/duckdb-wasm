// A small SQL runner: the DuckDB that runs inside the sandbox. Statements come from the command line (-c) or
// standard input, results and timings go to standard output.
#include <chrono>
#include <cstdio>
#include <cstring>
#include <iostream>
#include <sstream>
#include <string>

#include "duckdb.hpp"
#include "duckdb_static_extension.h"

// The extensions linked into this binary, each described by the function DuckDB's build generates for it
// (codegen/link/<name>_describe.c); registering them explicitly needs no static initializers
#define LINKED_EXTENSIONS(X) X(core_functions) X(parquet) X(tpch) X(json) X(icu)
#define DECLARE(name) extern "C" int32_t duckdb_extension_##name##_describe(duckdb_extension_descriptor *);
LINKED_EXTENSIONS(DECLARE)

namespace {

bool RegisterLinkedExtensions() {
    bool ok = true;
#define REGISTER(name) ok &= duckdb_register_static_extension(duckdb_extension_##name##_describe) == 0;
    LINKED_EXTENSIONS(REGISTER)
    return ok;
}

void Usage() {
    fprintf(stderr,
            "usage: duckdb_wasi [-d database] [-t] [-q] [-c sql]...\n"
            "  -d database  open this database file (default: in memory)\n"
            "  -t           print the time each statement took\n"
            "  -q           do not print results, only errors and times\n"
            "  -c sql       run sql; without -c the statements are read from standard input\n");
}

struct Options {
    std::string database = ":memory:";
    bool timer = false;
    bool quiet = false;
};

int Run(duckdb::Connection &con, const std::string &sql, const Options &opts) {
    auto start = std::chrono::steady_clock::now();
    auto result = con.Query(sql);
    auto elapsed = std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();
    if (result->HasError()) {
        fprintf(stderr, "%s\n", result->GetError().c_str());
        return 1;
    }
    if (!opts.quiet) {
        std::cout << result->ToString();
    }
    if (opts.timer) {
        fprintf(stdout, "Run Time (s): %.3f\n", elapsed);
    }
    fflush(stdout);
    return 0;
}

}  // namespace

int main(int argc, char **argv) {
    Options opts;
    std::vector<std::string> statements;
    for (int i = 1; i < argc; i++) {
        if (!strcmp(argv[i], "-t")) {
            opts.timer = true;
        } else if (!strcmp(argv[i], "-q")) {
            opts.quiet = true;
        } else if (!strcmp(argv[i], "-d") && i + 1 < argc) {
            opts.database = argv[++i];
        } else if (!strcmp(argv[i], "-c") && i + 1 < argc) {
            statements.push_back(argv[++i]);
        } else {
            Usage();
            return 2;
        }
    }
    if (statements.empty()) {
        std::stringstream buffer;
        buffer << std::cin.rdbuf();
        statements.push_back(buffer.str());
    }
    if (!RegisterLinkedExtensions()) {
        fprintf(stderr, "cannot register the linked extensions\n");
        return 1;
    }
    try {
        duckdb::DuckDB db(opts.database);
        duckdb::Connection con(db);
        int failures = 0;
        for (auto &sql : statements) {
            failures += Run(con, sql, opts);
        }
        return failures ? 1 : 0;
    } catch (std::exception &ex) {
        fprintf(stderr, "%s\n", ex.what());
        return 1;
    }
}
