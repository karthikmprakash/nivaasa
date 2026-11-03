#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
A="brand/animations"
W="$A/frames"

encode () {
  local name="$1" w="$2" h="$3" poster="$4" apng="${5:-yes}" fps="${6:-30}" loop="${7:-1}"
  local src="$W/$name/frame-%05d.png"

  # transparent animated WebP
  ffmpeg -y -v error -framerate "$fps" -i "$src" \
    -c:v libwebp_anim -lossless 0 -q:v 82 -loop "$loop" -pix_fmt yuva420p \
    "$A/nivaasa-$name.webp"

  # transparent HEVC with alpha for Apple platforms
  ffmpeg -y -v error -framerate "$fps" -i "$src" \
    -c:v hevc_videotoolbox -alpha_quality 0.9 -tag:v hvc1 -pix_fmt bgra -an \
    "$A/nivaasa-$name.mov"

  if [ "$apng" = "yes" ]; then
    ffmpeg -y -v error -framerate "$fps" -i "$src" -plays "$loop" -f apng \
      "$A/nivaasa-$name.apng"
  fi

  # MP4 on canvas
  ffmpeg -y -v error -framerate "$fps" -i "$src" \
    -f lavfi -i "color=c=0xF5F6F8:s=${w}x${h}:r=${fps}" \
    -filter_complex "[1:v][0:v]overlay=shortest=1,format=yuv420p" \
    -c:v libx264 -crf 18 -preset slow -movflags +faststart -an "$A/nivaasa-$name.mp4"

  # MP4 on brand blue
  ffmpeg -y -v error -framerate "$fps" -i "$src" \
    -f lavfi -i "color=c=0x3155D8:s=${w}x${h}:r=${fps}" \
    -filter_complex "[1:v][0:v]overlay=shortest=1,format=yuv420p" \
    -c:v libx264 -crf 18 -preset slow -movflags +faststart -an "$A/nivaasa-$name-blue.mp4"

  # GIF preview on canvas, 540 wide
  ffmpeg -y -v error -framerate "$fps" -i "$src" \
    -f lavfi -i "color=c=0xF5F6F8:s=${w}x${h}:r=${fps}" \
    -filter_complex "[1:v][0:v]overlay=shortest=1,scale=540:-1:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a" \
    -loop "$loop" "$A/nivaasa-$name.gif"

  # poster
  cp "$W/$name/$(printf 'frame-%05d.png' "$poster")" "$A/nivaasa-$name-poster.png"

  # 540-wide transparent WebP for mobile / small surfaces
  ffmpeg -y -v error -framerate "$fps" -i "$src" \
    -vf "scale=540:-1:flags=lanczos" \
    -c:v libwebp_anim -lossless 0 -q:v 80 -loop "$loop" -pix_fmt yuva420p \
    "$A/nivaasa-$name-540.webp"
}

rm -f "$A"/*.webm
encode mark-reveal 1080 1080 62 yes 30 1
encode logo-reveal 1920 1080 70 no 30 1
encode mark-loop 1080 1080 30 yes 30 0
encode success-check 1080 1080 40 yes 30 1
encode ink-reveal 1080 1080 96 no 30 1
encode mark-write 1080 1080 77 no 30 1
encode blue-mark-write 1080 1080 77 no 30 1
encode light-reveal 1080 1080 100 no 30 1

ls -lh "$A"
