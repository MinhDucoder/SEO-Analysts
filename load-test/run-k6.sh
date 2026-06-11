#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
# K6_WEB_DASHBOARD opens a live chart at http://127.0.0.1:5665
# K6_WEB_DASHBOARD_EXPORT writes a static HTML report at the end.
K6_WEB_DASHBOARD=true \
K6_WEB_DASHBOARD_EXPORT=report.html \
  k6 run k6/script.js
