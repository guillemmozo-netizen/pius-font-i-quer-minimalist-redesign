#!/usr/bin/env bash
# Codificación final para YouTube Shorts: H.264 High 4:2:0 BT.709, 60 fps, CRF 14 + AAC 320 kb/s.
# Uso: render/encode.sh [build/video_rgb.mkv] [build/mix.wav] [out/rtx-spark-short.mp4]
set -euo pipefail
cd "$(dirname "$0")/.."
IN="${1:-build/video_rgb.mkv}"
AUD="${2:-build/mix.wav}"
OUT="${3:-out/rtx-spark-short-1080x1920-60fps.mp4}"
mkdir -p "$(dirname "$OUT")"
ffmpeg -hide_banner -loglevel error -stats -y -i "$IN" -i "$AUD" -map 0:v -map 1:a \
  -vf "scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p" \
  -c:v libx264 -preset slow -crf 14 -profile:v high -level 5.1 -r 60 \
  -x264-params "keyint=120:min-keyint=60:bframes=3:ref=4:aq-mode=3:deblock=-1,-1" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart "$OUT"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,pix_fmt,bit_rate:format=duration,size -of compact "$OUT"
