#!/bin/bash

# put into /usr/local/bin/

# `aconnect -l`
# to get right values

# connect tablet with piano
aconnect 24:0 20:0
aconnect 20:0 24:0
# connect piano with gopiano service
aconnect 20:0 129:0
