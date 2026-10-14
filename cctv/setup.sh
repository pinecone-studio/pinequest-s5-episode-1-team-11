#!/usr/bin/env bash
# Installs the Halo camera server on one Ubuntu 24.04 machine (arm64 or amd64):
# MediaMTX (camera ingest + live view), its auth hook, Caddy (HTTPS) and the AI worker.
# Run from the copied cctv/ folder: sudo bash setup.sh   (safe to run again to update)
set -euo pipefail
cd "$(dirname "$0")"

MEDIAMTX=v1.21.2
APP=/opt/halo-cctv
ETC=/etc/halo-cctv

[ -f build/engine.mjs ] || { echo "build/engine.mjs missing: run bun build on your computer first" >&2; exit 1; }

apt-get update
apt-get install -y ffmpeg nodejs python3-venv libgl1 libglib2.0-0 libportaudio2 caddy

curl -fsSL "https://github.com/bluenviron/mediamtx/releases/download/$MEDIAMTX/mediamtx_${MEDIAMTX}_linux_$(dpkg --print-architecture).tar.gz" \
  | tar -xz -C /usr/local/bin mediamtx

id halo >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin halo
install -d -o halo "$APP" "$APP/build" "$APP/models"
install -d -m 750 -g halo "$ETC"
install -m 644 halo_cctv.py stream_auth.py requirements.txt "$APP/"
install -m 755 add-camera.sh "$APP/"
install -m 644 build/engine.mjs "$APP/build/"
install -m 640 -g halo mediamtx.yml "$ETC/mediamtx.yml"
python3 -m venv "$APP/venv"
"$APP/venv/bin/pip" install -q -r "$APP/requirements.txt"
# Download the models now, so the first alarm never waits for them.
(cd "$APP" && sudo -u halo HALO_MODELS="$APP/models" "$APP/venv/bin/python" -c \
  "import halo_cctv as h; [h.model_path(m) for m in h.MODELS]")

# First run only: secrets are made here, so they never sit in the repo. Later runs keep them.
if [ ! -f "$ETC/streams.json" ]; then
  printf '{"worker": "%s", "cameras": {}}\n' "$(openssl rand -hex 16)" > "$ETC/streams.json"
  printf 'HALO_STREAM_SECRET=%s\n' "$(openssl rand -hex 32)" > "$ETC/stream.env"
  chown root:halo "$ETC/streams.json" "$ETC/stream.env"
  chmod 640 "$ETC/streams.json" "$ETC/stream.env"
fi

IP=$(curl -fsS https://checkip.amazonaws.com | tr -d '[:space:]')
HOST="${IP//./-}.sslip.io"
cat > /etc/caddy/Caddyfile <<CADDY
# Live view signaling (WHEP). sslip.io resolves this name to $IP, so Let's Encrypt can issue a cert.
$HOST {
  reverse_proxy 127.0.0.1:8889
}
CADDY

cat > /etc/systemd/system/halo-stream-auth.service <<UNIT
[Unit]
Description=Halo stream auth hook for MediaMTX

[Service]
User=halo
EnvironmentFile=$ETC/stream.env
ExecStart=/usr/bin/python3 $APP/stream_auth.py
Restart=always

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/mediamtx.service <<UNIT
[Unit]
Description=MediaMTX: cameras push RTMP here, family watches over WebRTC
After=network-online.target halo-stream-auth.service
Wants=network-online.target halo-stream-auth.service

[Service]
User=halo
WorkingDirectory=$APP
Environment=MTX_WEBRTCADDITIONALHOSTS=$IP
ExecStart=/usr/local/bin/mediamtx $ETC/mediamtx.yml
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

# One worker per camera, named by its Halo device id: add-camera.sh writes $ETC/<id>.env.
cat > /etc/systemd/system/halo-cctv@.service <<UNIT
[Unit]
Description=Halo CCTV worker %i
After=mediamtx.service
Wants=mediamtx.service

[Service]
User=halo
WorkingDirectory=$APP
EnvironmentFile=$ETC/%i.env
Environment=HALO_MODELS=$APP/models PYTHONUNBUFFERED=1
ExecStart=$APP/venv/bin/python halo_cctv.py watch --api \${HALO_API} --stream \${HALO_STREAM}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
UNIT

# Some cloud images (Oracle's Ubuntu) reject everything but SSH in iptables; open what we serve.
for rule in "tcp 1935" "tcp 80" "tcp 443" "tcp 8189" "udp 8189"; do
  set -- $rule
  iptables -C INPUT -p "$1" --dport "$2" -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p "$1" --dport "$2" -j ACCEPT
done
if command -v netfilter-persistent >/dev/null; then netfilter-persistent save; fi

systemctl daemon-reload
systemctl enable halo-stream-auth mediamtx caddy
systemctl restart halo-stream-auth mediamtx caddy
systemctl try-restart 'halo-cctv@*'
echo
echo "Ready. Cameras: RTMP $IP:1935. Live view: https://$HOST"
echo "In Vercel set STREAM_URL=https://$HOST and STREAM_SECRET to the value in $ETC/stream.env."
echo "Add a camera: sudo $APP/add-camera.sh <six-digit code from the Halo app>"
