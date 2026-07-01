#!/bin/sh
# Test various clock text escaping approaches for spawn (no-shell) mode

FONT=/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf
FONT2=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf

echo "=== Test 1: localtime with \\: escaping (current approach) ==="
ffmpeg -f lavfi -i color=black:size=640x360:rate=25 \
  -vf "drawtext=fontfile=${FONT}:text=%{localtime\\:%H\\:%M\\:%S}:fontsize=40:fontcolor=white:x=10:y=10" \
  -t 1 -f null - 2>&1 | grep -E "error|Error|frame" | tail -3

echo "=== Test 2: localtime with single-quote wrapping ==="
ffmpeg -f lavfi -i color=black:size=640x360:rate=25 \
  -vf "drawtext=fontfile=${FONT}:text='%{localtime\:%H\:%M\:%S}':fontsize=40:fontcolor=white:x=10:y=10" \
  -t 1 -f null - 2>&1 | grep -E "error|Error|frame" | tail -3

echo "=== Test 3: strftime format string approach ==="
ffmpeg -f lavfi -i color=black:size=640x360:rate=25 \
  -vf "drawtext=fontfile=${FONT}:text=%{pts\:localtime\:0\:%H\\\:%M\\\:%S}:fontsize=40:fontcolor=white:x=10:y=10" \
  -t 1 -f null - 2>&1 | grep -E "error|Error|frame" | tail -3

echo "=== Test 4: filter_complex with label ==="
ffmpeg -f lavfi -i color=black:size=640x360:rate=25 \
  -filter_complex "[0:v]drawtext=fontfile=${FONT}:text=%{localtime\\:%H\\:%M\\:%S}:fontsize=40:fontcolor=white:x=10:y=10[out]" \
  -map "[out]" -t 1 -f null - 2>&1 | grep -E "error|Error|frame" | tail -3

echo "Done"
