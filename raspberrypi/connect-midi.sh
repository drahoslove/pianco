#!/bin/bash --

# put into /usr/local/bin/

# THIS file should be called after Roland piano is connected (turned on)
# defined by rules in /etc/udev/rules.d/


service raspotify stop
sleep 1
service pianoteq start

# `aconnect -l`
# to get right values

sleep 1

# connect tablet with roland piano
aconnect 24:0 20:0
aconnect 20:0 24:0

# connect roland piano with gopiano service
aconnect 20:0 129:0

echo "Roland ON  `date +'%Y-%m-%d %H:%M:%S'`" >> /home/pi/roland.event.log

true

