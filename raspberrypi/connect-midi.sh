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
ROLAND=20
ANDROID=24
GOPIANO=$( sudo aconnect -l | grep RtMidi | awk '{ print $2 }' | sed 's/://' )
aconnect $ANDROID:0 $ROLAND:0
aconnect $ROLAND:0 $ANDROID:0
aconnect $ROLAND:0 $GOPIANO:0

/usr/bin/curl http://127.0.0.1:1212/wled/on

echo "Roland ON  `date +'%Y-%m-%d %H:%M:%S'`" >> /home/pi/roland.event.log

true

