#!/bin/bash --

sudo cpufreq-set -g performance
/home/pi/bin/pianoteq --headless --multicore max $@