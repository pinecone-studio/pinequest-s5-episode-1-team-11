# CCTV → Halo

Гэрт компьютергүйгээр IP камерыг Halo-д холбоно. Камер дүрс, дуугаа RTMP-ээр серверт өөрөө илгээнэ. Серверийн AI уналт, дууг илрүүлж утасны камертай адил `/api/v1/events` руу илгээнэ. Гэр бүл web болон mobile апп-аас камерыг WebRTC-ээр шууд харна.

```
Камер ─RTMP→ MediaMTX ─RTSP (127.0.0.1)→ halo_cctv.py ─→ Halo API ─→ push (web + апп)
                  └─WebRTC (WHEP, Caddy HTTPS)→ web / апп-ын "Live харах"
   control.py: камер, worker, гэр бүлийн 10 минутын token-ийг шалгана
```

| Файл | Үүрэг |
|---|---|
| `mediamtx.yml` | RTMP хүлээн авах, worker-т RTSP, гэр бүлд WebRTC |
| `control.py` | MediaMTX-ийн хүсэлт бүрийг шалгана (`authMethod: http`), апп-аас нэмсэн камерыг Halo-д холбоно (`/provision`) |
| `halo_cctv.py` | `serve`: камер бүрт нэг worker; worker нь урсгалаас model ажиллуулж event, heartbeat илгээнэ |
| `engine-bridge.ts` | `src/detection/engine.ts`-ийг Node дээр ажиллуулна, дүрэм нэг газар |
| `setup.sh` | Ubuntu 24.04 серверт бүгдийг суулгаж systemd service болгоно |

## Камер

TP-Link VIGI **C540, hardware V2.0, firmware 2.2.0+** (RTMP: [release note](https://static.tp-link.com/upload/firmware/2025/202510/20251021/Release%20Note%20VIGI%20C540(UN)%202.0_2.2.0%20Build%20250904.pdf), Best Computers 239,900₮).

> Анхаар: VIGI зөвхөн энгийн RTMP дэмждэг (RTMPS үгүй). Дүрс гэрээс сервер хүртэл шифрлэгдээгүй явна. Сервер бичлэг хадгалдаггүй.

## Сервер

Одоо: AWS Sydney, `c7i-flex.large` (2 vCPU, 4 GB), Elastic IP `3.25.26.5`. Нээлттэй портууд (security group): TCP 22, 80, 443, 1935, 8189 ба UDP 8189.

### 1. Суулгах (repo-ийн үндсээс)

```bash
bun build cctv/engine-bridge.ts --target=node --outfile=cctv/build/engine.mjs
rsync -a --exclude __pycache__ cctv ubuntu@SERVER_IP:
ssh ubuntu@SERVER_IP 'sudo bash cctv/setup.sh'
```

Анх ажиллахдаа worker-ийн нууц үг болон stream secret-ийг үүсгэнэ (`/etc/halo-cctv/`). Repo-д нууц зүйл орохгүй. Төгсгөлд хэвлэсэн утгаар Vercel-д `STREAM_URL` ба `STREAM_SECRET` тохируулна. Дахин ажиллуулахад код шинэчлэгдэж, нууц хэвээр үлдэнэ.

### 2. Камер нэмэх

Mobile апп → Гэр бүл → Камер нэмэх → **IP камер** → нэр, өрөө → Нэмэх. Halo код үүсгэж камерын серверээс (`/provision`, гарын үсэгтэй) камерыг холбуулна. Сервер worker-ийг өөрөө асаана. Апп камерт бичих Server Address ба Stream Key-г харуулна ([VIGI заавар](https://www.tp-link.com/us/support/faq/4627/), Main stream: H.264). Апп-аас камерыг устгавал worker өөрөө зогсоно.

### Шалгах

```bash
journalctl -u mediamtx -f            # "is publishing to path 'live/<device id>'"
journalctl -u halo-cctv -f           # "<device id>: worker started"
```

Удаан бол `/etc/systemd/system/halo-cctv.service`-д `HALO_FPS=3` эсвэл `HALO_POSE=full` нэмээд `sudo systemctl daemon-reload && sudo systemctl restart halo-cctv`.

## Зардал

`c7i-flex.large` $0.11072/цаг (~$80/сар), Free plan-ийн кредитээс. Live харах нь 720p-д цагт ~0.5–0.9 GB траффик (тооцоо). Ашиглахгүй үед instance-ийг Stop хийнэ (Elastic IP тул хаяг хэвээр).

## Local туршилт

```bash
python -m unittest test_halo_cctv test_control
```

Шалгасан: MediaMTX + `control.py`-тай дуурайлгасан VIGI урсгал (H.264 + G.711 8 kHz). Камер өөрийн замд publish хийсэн, өөр замд хаагдсан. Worker RTSP уншсан, буруу нууц үг 401. WebRTC-ээр browser-т H.264 дүрс, PCMU дуу ирсэн, хуурамч/хоосон token 401. AWS сервер дээр MediaMTX + AI worker интернетээр ажилласан.

Шалгаагүй: бодит VIGI камер (Stream Key дахь `?user=&pass=`-ийг хэвээр дамжуулах эсэх), YAMNet-ийн 8 kHz бодит дуун дээрх нарийвчлал.
