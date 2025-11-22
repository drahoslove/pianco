#!/bin/bash --

# put into /usr/local/bin/

# THIS file should be called after Roland piano is disconnected (turned off)
# defined by rules in /etc/udev/rules.d/

# to make the curl work from within 20-midi.rules
# put lines
#  [Services]
#  IPAddressAllow=127.0.0.1
# to `sudo systemctl edit systemd-udevd.service`
/usr/bin/curl http://127.0.0.1:1212/wled/off &

/bin/systemctl stop pianoteq
sleep 1
/bin/systemctl start raspotify

sleep 1

echo "Roland OFF `date +'%Y-%m-%d %H:%M:%S'`" >> /home/pi/roland.event.log

true

