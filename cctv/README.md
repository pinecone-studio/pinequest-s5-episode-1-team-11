# CCTV → Halo

Гэрт компьютергүйгээр IP камерыг Halo-д холбоно. Камер видеогоо RTMP-ээр серверт өөрөө илгээнэ. AI нь тэр серверт ажиллаж, илрүүлсэн event-ийг утасны камертай адил `/api/v1/events` руу илгээнэ.

```
Камер ─RTMP→ MediaMTX ─RTSP (127.0.0.1)→ halo_cctv.py ─→ Halo API ─→ Web Push
              └──────── нэг Ubuntu 24.04 сервер ────────┘
   halo_cctv.py: MediaPipe pose (heavy), EfficientDet-Lite2, YAMNet
   engine-bridge.ts: апп-ын өөрийн уналт/дууны дүрэм (src/detection)
```

| Файл | Үүрэг |
|---|---|
| `mediamtx.yml` | Камераас RTMP хүлээн авна, worker-т RTSP-ээр өгнө. Камер бүр өөрийн нууц үгтэй |
| `halo_cctv.py` | Нэг камерын урсгалыг уншиж model ажиллуулна, event ба heartbeat илгээнэ |
| `engine-bridge.ts` | `src/detection/engine.ts`-ийг Node дээр ажиллуулна, дүрэм нэг газар л байна |
| `setup.sh` | Ubuntu 24.04 серверт бүгдийг суулгаж systemd service болгоно |

## Камер

TP-Link VIGI **C540, hardware V2.0, firmware 2.2.0+** (RTMP: [release note](https://static.tp-link.com/upload/firmware/2025/202510/20251021/Release%20Note%20VIGI%20C540(UN)%202.0_2.2.0%20Build%20250904.pdf), Best Computers 239,900₮).

> Анхаар: VIGI зөвхөн энгийн RTMP дэмждэг (RTMPS үгүй). Видео гэрээс сервер хүртэл шифрлэгдээгүй явна.

## Сервер дээр байршуулах

Одоо: AWS Sydney (`ap-southeast-2`, Free plan зөвхөн энэ region), `c7i-flex.large` (2 vCPU, 4 GB), Elastic IP, security group зөвхөн 22 ба 1935. Oracle Always Free A1 нь Singapore-д сул багтаамжгүй байсан ("Out of capacity"). Доорх Oracle алхмууд өөр серверт ч адил: Ubuntu 24.04 + 1935 порт.

### 1. Сервер үүсгэх (жишээ: Oracle console)

1. [cloud.oracle.com](https://cloud.oracle.com) дээр бүртгүүлнэ. Home region-ийг ойрхон сонгоно (жишээ нь Japan, Korea): дараа нь солигдохгүй.
2. Compute → Instances → Create:
   - Image: **Canonical Ubuntu 24.04**
   - Shape: **VM.Standard.A1.Flex**, 2 OCPU, 12 GB (Always Free)
   - SSH key-ээ оруулна.
3. Instance-ийн Subnet → Security List → Add Ingress Rule: Source `0.0.0.0/0`, TCP, port **1935**. Өөр порт нээхгүй (8554 гаднаас хэрэггүй).

"Out of host capacity" гарвал өөр availability domain сонгох эсвэл дараа дахин оролдоно.

### 2. Суулгах (өөрийн компьютерээс, repo-ийн үндсээс)

```bash
bun build cctv/engine-bridge.ts --target=node --outfile=cctv/build/engine.mjs
scp -r cctv ubuntu@SERVER_IP:
ssh ubuntu@SERVER_IP 'sudo bash cctv/setup.sh'
```

Анх ажиллахдаа `setup.sh` камер ба worker-ийн санамсаргүй нууц үгийг `/etc/halo-cctv/mediamtx.yml`-д үүсгээд хэвлэнэ. Нууц үг repo-д хэзээ ч орохгүй. Дахин ажиллуулбал код шинэчлэгдэнэ, нууц үг хэвээр үлдэнэ.

### 3. Камер нэмэх

1. Halo апп дээр Камер нэмэх → 6 оронтой код. Серверт:
   ```bash
   sudo -u halo /opt/halo-cctv/venv/bin/python /opt/halo-cctv/halo_cctv.py pair --api https://halo-team11.vercel.app --code 123456
   ```
   Гарсан `deviceToken`-ийг хуулна.
2. Worker-ийн тохиргоо (`cam1`-ийг камерын нэрээр):
   ```bash
   sudo tee /etc/halo-cctv/cam1.env >/dev/null <<'EOF'
   HALO_API=https://halo-team11.vercel.app
   HALO_STREAM=rtsp://worker:WORKER_НУУЦ_ҮГ@127.0.0.1:8554/live/cam1
   HALO_DEVICE_TOKEN=TOKEN
   EOF
   sudo chmod 600 /etc/halo-cctv/cam1.env
   sudo systemctl enable --now halo-cctv@cam1
   ```
3. Камерын веб: Settings → Network Settings → Advanced → RTMP ([заавар](https://www.tp-link.com/us/support/faq/4627/)):
   - Server Address: `rtmp://SERVER_IP:1935/live`
   - Stream Key: `cam1?user=cam1&pass=CAM1_НУУЦ_ҮГ`
   - Main stream: H.264

Хоёр дахь камер: `/etc/halo-cctv/mediamtx.yml`-д `cam2` хэрэглэгч (`publish`, `live/cam2`) нэмээд `sudo systemctl restart mediamtx`, дараа нь 1–3-р алхмыг `cam2`-оор давтана.

### Шалгах

```bash
journalctl -u mediamtx -f          # "is publishing to path 'live/cam1'"
journalctl -u halo-cctv@cam1 -f    # 30 с тутам frame тоо
```

Удаан бол `/etc/halo-cctv/cam1.env`-д `HALO_FPS=3` эсвэл `HALO_POSE=full` нэмээд `sudo systemctl restart halo-cctv@cam1`.

## Зардал

Oracle Always Free: Ampere A1 2 OCPU, 12 GB, сард 10 TB гадагш траффик үнэгүй ([Always Free](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm)). 7 хоногийн 95-р percentile CPU, сүлжээ, санах ой бүгд 20%-иас бага бол "idle" гэж зогсоож болно. 24/7 AI ажиллаж байхад CPU үүнээс дээш байх төлөвтэй (тооцоо).

## Local туршилт

```bash
mediamtx mediamtx.yml   # CHANGE_ME-г сольсон хуулбар
# VIGI-тэй адил урсгал: H.264 + G.711 μ-law 8 kHz, галын дохионы хэв маяг
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=15 \
  -f lavfi -i "sine=frequency=3150:sample_rate=8000,volume='if(lt(mod(t,1),0.5),1,0)':eval=frame" \
  -c:v libx264 -pix_fmt yuv420p -c:a pcm_mulaw -ar 8000 -ac 1 -f flv \
  "rtmp://127.0.0.1:1935/live/cam1?user=cam1&pass=НУУЦ"
python halo_cctv.py watch --api http://127.0.0.1:3000 \
  --stream "rtsp://worker:НУУЦ@127.0.0.1:8554/live/cam1" --token TOKEN
python -m unittest test_halo_cctv
```

Local-д шалгасан (Mac, MediaMTX v1.21.2): MediaMTX H.264 + G.711-ийг хүлээн авч worker-т хоёуланг нь өгсөн; дуунаас `alarm` event зурагтайгаар очсон; хүнтэй зураг дээр pose ажилласан (~4 fps heavy); урсгал тасраад сэргэхэд worker дахин холбогдсон; буруу нууц үг, өөр замд нийтлэх, нэвтрэлтгүй унших хүсэлт бүгд хаагдсан; `MTX_RTSPADDRESS=127.0.0.1:8554`-ээр RTSP зөвхөн дотроо сонссон.

Шалгаагүй: бодит VIGI камер (Stream Key дахь `?user=&pass=`-ийг хэвээр дамжуулах эсэх), `setup.sh`-г бодит Ubuntu серверт, Oracle Arm дээрх fps, YAMNet-ийн 8 kHz бодит дуун дээрх нарийвчлал.
