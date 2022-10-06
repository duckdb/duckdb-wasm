rm -rf build

mkdir -p build
cd build
cmake -G "Unix Makefiles" -DCMAKE_BUILD_TYPE=Debug ../lib
cmake --build .

cd ..
./scripts/generate_tpch_tbl.sh 0.01
./scripts/generate_tpch_arrow.sh 0.01
./scripts/generate_uni.sh

(cd build && ./tester)