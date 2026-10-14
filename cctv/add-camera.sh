#!/usr/bin/env bash
# Pairs one CCTV camera with Halo, starts its AI worker and prints what to type into the camera.
# sudo /opt/halo-cctv/add-camera.sh 123456    (HALO_API overrides the default Halo address)
set -euo pipefail
CODE=${1:?usage: add-camera.sh <six-digit code from the Halo app>}
API=${HALO_API:-https://halo-team11.vercel.app}
APP=/opt/halo-cctv
ETC=/etc/halo-cctv

paired=$(cd "$APP" && sudo -u halo "$APP/venv/bin/python" halo_cctv.py pair --api "$API" --code "$CODE")
id=$(python3 -c 'import json, sys; print(json.load(sys.stdin)["deviceId"])' <<<"$paired")
token=$(python3 -c 'import json, sys; print(json.load(sys.stdin)["deviceToken"])' <<<"$paired")
pass=$(openssl rand -hex 16)
worker=$(python3 - "$ETC/streams.json" "$id" "$pass" <<'PY'
import json, sys
path, device, password = sys.argv[1:]
streams = json.load(open(path))
streams["cameras"][device] = password
json.dump(streams, open(path, "w"), indent=2)
print(streams["worker"])
PY
)
umask 077
cat > "$ETC/$id.env" <<ENV
HALO_API=$API
HALO_STREAM=rtsp://worker:$worker@127.0.0.1:8554/live/$id
HALO_DEVICE_TOKEN=$token
ENV
systemctl enable --now "halo-cctv@$id"
IP=$(curl -fsS https://checkip.amazonaws.com | tr -d '[:space:]')
echo
echo "Camera paired: $id"
echo "In the camera (VIGI: Settings > Network Settings > Advanced > RTMP):"
echo "  Server Address: rtmp://$IP:1935/live"
echo "  Stream Key:     $id?user=$id&pass=$pass"
