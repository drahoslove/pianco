#!/bin/bash --

# put into /usr/local/bin/

# THIS file should be called after Roland piano is disconnected (turned off)
# defined by rules in /etc/udev/rules.d/

/usr/bin/curl http://127.0.0.1:1212/wled/off

service pianoteq stop
sleep 1
service raspotify start

sleep 1

echo "Roland OFF `date +'%Y-%m-%d %H:%M:%S'`" >> /home/pi/roland.event.log

true

