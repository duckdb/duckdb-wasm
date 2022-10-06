# Building and Testing

Below is a minimal script for building and running the unit tests of the project.

```bash
mkdir -p build
cd build
cmake -G "Unix Makefiles" -DCMAKE_BUILD_TYPE=Debug ../lib
cmake --build .

cd ..
./scripts/generate_tpch_tbl.sh 0.01
./scripts/generate_tpch_arrow.sh 0.01
./scripts/generate_uni.sh

(cd build && ./tester)
```

A standard C++ debugger can be attached to the `tester` program (e.g. `lldb -- ./tester`).