#!/usr/bin/env bash
# Versión ligera (< 30 MB) para compartir por mensajería: mismo 1080x1920 a 60 fps, H.264 a dos pasadas.
# Uso: render/encode_share.sh [out/rtx-spark-short-1080x1920-60fps.mp4] [out/rtx-spark-short-share.mp4]
set -euo pipefail
cd "$(dirname "$0")/.."
IN="${1:-out/rtx-spark-short-1080x1920-60fps.mp4}"
OUT="${2:-out/rtx-spark-short-share.mp4}"
VB=3700k
TMP=$(mktemp -d)
COMMON=(-vf "hqdn3d=1.2:1.2:2:2" -c:v libx264 -preset slow -profile:v high -r 60 -b:v $VB -maxrate 6500k -bufsize 9000k
  -x264-params "keyint=120:min-keyint=60:aq-mode=3:aq-strength=0.9"
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -pix_fmt yuv420p -passlogfile "$TMP/x264")
ffmpeg -hide_banner -loglevel error -stats -y -i "$IN" "${COMMON[@]}" -pass 1 -an -f mp4 /dev/null
ffmpeg -hide_banner -loglevel error -stats -y -i "$IN" "${COMMON[@]}" -pass 2 -c:a aac -b:a 160k -movflags +faststart "$OUT"
rm -rf "$TMP"
ls -la "$OUT"
