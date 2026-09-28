#!/bin/bash
# Joins cartoon + gameplay + end-card hold into 1800 frames, adds the score, and encodes master and web versions.
set -e
SP=/tmp/claude-0/-home-user-marchland/89a4d3ec-0495-5461-94cc-a66e658ee156/scratchpad
FF=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
D=$SP/trailer3/seq; rm -rf $D; mkdir -p $D
n=0
for i in $(seq 0 899); do ln -s $SP/trailer3/cine/c$(printf %04d $i).png $D/s$(printf %04d $n).png; n=$((n+1)); done
for i in $(seq 120 899); do ln -s $SP/trailer3/game/f$(printf %04d $i).png $D/s$(printf %04d $n).png; n=$((n+1)); done
for i in $(seq 1 120); do ln -s $SP/trailer3/game/f0899.png $D/s$(printf %04d $n).png; n=$((n+1)); done
echo "frames: $n"
# Master: high quality, with a short fade-out at the very end.
$FF -y -loglevel error -framerate 30 -i $D/s%04d.png -i $SP/trailer3/score.wav -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -af "afade=t=out:st=58.3:d=1.7" -c:a aac -b:a 192k -shortest -movflags +faststart $SP/trailer3/boss-mode-trailer-60s.mp4
# Web: about 10 MB for the landing page.
cd $SP/trailer3
$FF -y -loglevel error -i boss-mode-trailer-60s.mp4 -c:v libx264 -preset slow -b:v 1200k -pass 1 -an -f mp4 /dev/null
$FF -y -loglevel error -i boss-mode-trailer-60s.mp4 -c:v libx264 -preset slow -b:v 1200k -pass 2 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart trailer-web.mp4
ls -la boss-mode-trailer-60s.mp4 trailer-web.mp4
