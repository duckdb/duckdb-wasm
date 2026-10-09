#pragma once

#include "duckdb.hpp"

/// Registers crash(kind): 0 null dereference, 1 wild pointer write, 2 stack overflow, 3 abort
void RegisterCrashFunction(duckdb::Connection &con);
