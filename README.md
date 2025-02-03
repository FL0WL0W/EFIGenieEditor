Editor for EFIGenie.</br>

if Chromium/chrome can't connect to webserial, you may need to add permissions to the snap. add these 2 lines to /var/lib/snapd/apparmor/profiles/snap.chromium.chromium</br>
sudo snap connect chromium:raw-usb
