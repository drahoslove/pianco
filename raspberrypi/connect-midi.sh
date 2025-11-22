#!/bin/bash --

# put into /usr/local/bin/

# THIS file should be called after Roland piano is connected (turned on)
# defined by rules in /etc/udev/rules.d/

# to make the curl work from within 20-midi.rules
# put lines
#  [Services]
#  IPAddressAllow=127.0.0.1
# to `sudo systemctl edit systemd-udevd.service`
/usr/bin/curl http://127.0.0.1:1212/wled/on &

/bin/systemctl stop raspotify

# `aconnect -l`
# to check right values

sleep 1

# connect tablet with roland piano
ROLAND=$( aconnect -l  | grep Roland  | head -n 1 | awk '{ print $2 }' | sed 's/://' )
ANDROID=$( aconnect -l | grep Android | head -n 1 | awk '{ print $2 }' | sed 's/://' )
GOPIANO=$( aconnect -l | grep RtMidi  | head -n 1 | awk '{ print $2 }' | sed 's/://' )
aconnect $ANDROID:0 $ROLAND:0
aconnect $ROLAND:0 $ANDROID:0
aconnect $ROLAND:0 $GOPIANO:0

/bin/systemctl start pianoteq

echo "Roland ON  `date +'%Y-%m-%d %H:%M:%S'`" >> /home/pi/roland.event.log

true

