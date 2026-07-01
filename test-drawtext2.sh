#!/bin/sh
FONT=/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf

echo "=== filter_complex + label + quoted localtime ==="
ffmpeg -f lavfi -i color=black:size=640x360:rate=25 \
  -filter_complex "[0:v]drawtext=fontfile=${FONT}:text='%{localtime\:%H\:%M\:%S}':fontsize=40:fontcolor=white:borderw=2:bordercolor=black:x=10:y=10[out]" \
  -map "[out]" -t 1 -f null - 2>&1 | grep -E "error|Error|frame=" | tail -3

echo "=== chained: overlay + drawtext with label ==="
ffmpeg -f lavfi -i color=blue:size=640x360:rate=25 \
  -f lavfi -i color=red:size=100x50:rate=25 \
  -filter_complex "[1:v]scale=100:50[logo];[0:v][logo]overlay=10:10[v1];[v1]drawtext=fontfile=${FONT}:text='%{localtime\:%H\:%M\:%S}':fontsize=40:fontcolor=white:borderw=2:bordercolor=black:x=200:y=150[vout]" \
  -map "[vout]" -t 1 -f null - 2>&1 | grep -E "error|Error|frame=" | tail -3

echo "Done"
