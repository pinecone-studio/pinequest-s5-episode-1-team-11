#!/usr/bin/env bash
# Installs the Halo camera server on one Ubuntu 24.04 machine (arm64 or amd64):
# MediaMTX (camera ingest + live view), control.py (auth + adding cameras), Caddy (HTTPS) and the
# AI workers.
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
# halo writes streams.json when the family adds or removes a camera.
install -d -m 770 -g halo "$ETC"
install -m 644 halo_cctv.py control.py requirements.txt "$APP/"
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
  chown halo:halo "$ETC/streams.json"
  chown root:halo "$ETC/stream.env"
  chmod 640 "$ETC/streams.json" "$ETC/stream.env"
fi
HALO_API=${HALO_API:-https://halo-team11.vercel.app}

IP=$(curl -fsS https://checkip.amazonaws.com | tr -d '[:space:]')
HOST="${IP//./-}.sslip.io"
cat > /etc/caddy/Caddyfile <<CADDY
# Live view signaling (WHEP). sslip.io resolves this name to $IP, so Let's Encrypt can issue a cert.
$HOST {
  # Halo adds cameras here (signed requests only); everything else is live view.
  handle /provision {
    reverse_proxy 127.0.0.1:9995
  }
  handle {
    reverse_proxy 127.0.0.1:8889
  }
}
CADDY

cat > /etc/systemd/system/halo-control.service <<UNIT
[Unit]
Description=Halo camera server control (MediaMTX auth, adding cameras)

[Service]
User=halo
EnvironmentFile=$ETC/stream.env
Environment=HALO_API=$HALO_API HALO_PUBLIC_IP=$IP
ExecStart=/usr/bin/python3 $APP/control.py
Restart=always

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/mediamtx.service <<UNIT
[Unit]
Description=MediaMTX: cameras push RTMP here, family watches over WebRTC
After=network-online.target halo-control.service
Wants=network-online.target halo-control.service

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

# One worker process per camera in streams.json, started and stopped by `serve`.
cat > /etc/systemd/system/halo-cctv.service <<UNIT
[Unit]
Description=Halo CCTV workers
After=mediamtx.service
Wants=mediamtx.service

[Service]
User=halo
WorkingDirectory=$APP
Environment=HALO_MODELS=$APP/models PYTHONUNBUFFERED=1
ExecStart=$APP/venv/bin/python halo_cctv.py serve --api $HALO_API
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

# Earlier versions ran one unit per camera and a separate auth hook.
systemctl disable --now 'halo-cctv@*' halo-stream-auth 2>/dev/null || true
rm -f /etc/systemd/system/halo-cctv@.service /etc/systemd/system/halo-stream-auth.service
systemctl daemon-reload
systemctl enable halo-control mediamtx caddy halo-cctv
systemctl restart halo-control mediamtx caddy halo-cctv
echo
echo "Ready. Cameras: RTMP $IP:1935. Live view and adding cameras: https://$HOST"
echo "In Vercel set STREAM_URL=https://$HOST and STREAM_SECRET to the value in $ETC/stream.env."
