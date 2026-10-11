#!/usr/bin/env bash
# A local HTTP server for the http storage mode of scripts/wasi_tpch.sh: nginx (brew) serving build/wasi/data on
# 127.0.0.1:8765 with byte ranges, the shape of an object store without the network.
#
#   scripts/wasi_http_server.sh start|stop|status
#   HTTP_LIMIT_RATE=25m HTTP_LIMIT_CONN=4  per-connection bandwidth cap and connection limit (nginx limit_rate,
#                        limit_conn): together a link of rate x connections, e.g. 100 MB/s ~ 0.8 Gbit
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PREFIX=${PROJECT_ROOT}/build/wasi/nginx
PORT=${HTTP_PORT:-8765}
case ${1:-start} in
  start)
    mkdir -p "${PREFIX}/logs" "${PREFIX}/tmp"
    cat > "${PREFIX}/nginx.conf" <<EOF
worker_processes 4;
pid ${PREFIX}/nginx.pid;
error_log ${PREFIX}/logs/error.log warn;
events { worker_connections 1024; }
http {
  access_log off;
  sendfile on;
  tcp_nopush on;
  client_body_temp_path ${PREFIX}/tmp/body;
  proxy_temp_path ${PREFIX}/tmp/proxy;
  fastcgi_temp_path ${PREFIX}/tmp/fastcgi;
  uwsgi_temp_path ${PREFIX}/tmp/uwsgi;
  scgi_temp_path ${PREFIX}/tmp/scgi;
  limit_conn_zone \$server_name zone=perserver:1m;
  server {
    listen 127.0.0.1:${PORT};
    root ${PROJECT_ROOT}/build/wasi/data;
    location / { ${HTTP_LIMIT_RATE:+limit_rate ${HTTP_LIMIT_RATE};} ${HTTP_LIMIT_CONN:+limit_conn perserver ${HTTP_LIMIT_CONN};} }
  }
}
EOF
    nginx -p "${PREFIX}" -c "${PREFIX}/nginx.conf" -e "${PREFIX}/logs/error.log"
    sleep 0.5
    curl -s -o /dev/null -w "http://127.0.0.1:${PORT}: range request %{http_code}\n" -H "Range: bytes=0-15" \
      "http://127.0.0.1:${PORT}/parquet10/nation.parquet" || true
    ;;
  stop)
    [ -f "${PREFIX}/nginx.pid" ] && nginx -p "${PREFIX}" -c "${PREFIX}/nginx.conf" -e "${PREFIX}/logs/error.log" -s quit
    ;;
  status)
    curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:${PORT}/" || echo "down"
    ;;
esac
