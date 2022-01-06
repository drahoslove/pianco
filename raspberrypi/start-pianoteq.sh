#!/bin/bash --

sudo cpufreq-set -g performance
/home/pi/bin/pianoteq --headless --multicore max --serve 0.0.0.0:8081 $@
# note port 8081 is https proxed on https://local.pian.co/jsonrpc by caddy