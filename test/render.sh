#!/bin/bash
# renders stills of one world, at most two renders at a time on this machine
# usage: bash test/render.sh <worldIndex> '<json shots>'      env: Q (0..2, default 2), W, H
wi="$1"; shift
cd /home/claude/monet || exit 1
exec flock /tmp/monet_render_$((wi % 2)).lock timeout 240 node test/still.mjs "$wi" "$@" 2>&1 | grep -v "GL Driver\|GPU stall"
