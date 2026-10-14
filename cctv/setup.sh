#!/usr/bin/env bash
# Installs MediaMTX and the Halo CCTV worker on one Ubuntu 24.04 server (arm64 or amd64).
# Run from the copied cctv/ folder: sudo bash setup.sh   (safe to run again to update)
set -euo pipefail
cd "$(dirname "$0")"

MEDIAMTX=v1.21.2
APP=/opt/halo-cctv

[ -f build/engine.mjs ] || { echo "build/engine.mjs missing: run bun build on your computer first" >&2; exit 1; }

apt-get update
apt-get install -y ffmpeg nodejs python3-venv libgl1 libglib2.0-0 libportaudio2

curl -fsSL "https://github.com/bluenviron/mediamtx/releases/download/$MEDIAMTX/mediamtx_${MEDIAMTX}_linux_$(dpkg --print-architecture).tar.gz" \
  | tar -xz -C /usr/local/bin mediamtx

id halo >/dev/null 2>&1 || useradd --system --home-dir "$APP" --shell /usr/sbin/nologin halo
install -d -o halo "$APP" "$APP/build" "$APP/models"
install -d -m 750 -g halo /etc/halo-cctv
install -m 644 halo_cctv.py requirements.txt "$APP/"
install -m 644 build/engine.mjs "$APP/build/"
CONFIG=/etc/halo-cctv/mediamtx.yml
# First run only: passwords are made here, so they never sit in the repo. Later runs keep them.
if [ ! -f "$CONFIG" ]; then
  install -m 640 -g halo mediamtx.yml "$CONFIG"
  python3 -c 'import re, secrets, sys; p = sys.argv[1]; s = open(p).read()
open(p, "w").write(re.sub(r"CHANGE_ME\w*", lambda _: secrets.token_hex(16), s))' "$CONFIG"
  echo "Passwords (also in $CONFIG):"
  grep -E '^\s*-?\s*(user|pass):' "$CONFIG"
fi
python3 -m venv "$APP/venv"
"$APP/venv/bin/pip" install -q -r "$APP/requirements.txt"
# Download the models now, so the first alarm never waits for them.
(cd "$APP" && sudo -u halo HALO_MODELS="$APP/models" "$APP/venv/bin/python" -c \
  "import halo_cctv as h; [h.model_path(m) for m in h.MODELS]")

cat > /etc/systemd/system/mediamtx.service <<EOF
[Unit]
Description=MediaMTX: cameras push RTMP here
After=network-online.target
Wants=network-online.target

[Service]
User=halo
WorkingDirectory=$APP
# RTSP stays inside this server; only the worker reads it.
Environment=MTX_RTSPADDRESS=127.0.0.1:8554
ExecStart=/usr/local/bin/mediamtx /etc/halo-cctv/mediamtx.yml
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# One worker per camera: /etc/halo-cctv/<camera>.env + systemctl enable --now halo-cctv@<camera>
cat > /etc/systemd/system/halo-cctv@.service <<EOF
[Unit]
Description=Halo CCTV worker %i
After=mediamtx.service
Wants=mediamtx.service

[Service]
User=halo
WorkingDirectory=$APP
EnvironmentFile=/etc/halo-cctv/%i.env
Environment=HALO_MODELS=$APP/models PYTHONUNBUFFERED=1
ExecStart=$APP/venv/bin/python halo_cctv.py watch --api \${HALO_API} --stream \${HALO_STREAM}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Oracle's Ubuntu images reject everything but SSH in iptables; open RTMP above that rule.
iptables -C INPUT -p tcp --dport 1935 -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport 1935 -j ACCEPT
if command -v netfilter-persistent >/dev/null; then netfilter-persistent save; fi

systemctl daemon-reload
systemctl enable mediamtx
systemctl restart mediamtx
systemctl try-restart 'halo-cctv@*'
echo "Ready. MediaMTX listens on RTMP :1935. Add a camera with the README steps."
