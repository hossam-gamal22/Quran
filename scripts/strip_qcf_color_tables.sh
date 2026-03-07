#!/bin/bash
# حذف جداول الألوان من جميع خطوط QCF4 في مجلد qcf
set -e
cd "$(dirname "$0")/../assets/fonts/qcf"
for f in QCF4_tajweed_*.ttf; do
  echo "معالجة $f ..."
  ttx -x SVG -x COLR -x CPAL "$f"
  ttx "${f%.ttf}.ttx"
  mv "${f%.ttf}#1.ttf" "$f"
  rm "${f%.ttf}.ttx"
done
echo "تمت معالجة جميع الخطوط بنجاح!"