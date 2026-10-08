# CCTV симулятор

Halo-ийн CCTV горимыг жинхэнэ камергүй турших. [go2rtc](https://github.com/AlexxIT/go2rtc) нь RTSP/файлын урсгалыг browser-т WebRTC болгож өгнө. `/monitor` түүнийг утасны камертай яг ижил detection, event pipeline-аар хянана.

## Ажиллуулах

1. go2rtc суулгана: [releases](https://github.com/AlexxIT/go2rtc/releases)-ээс өөрийн OS-ийн binary-г татна (macOS: `go2rtc_mac_arm64.zip`). ffmpeg хэрэгтэй (`brew install ffmpeg`).
2. Энэ хавтсанд хүн алхаж, унаж байгаа `sample.mp4` бичлэг тавина.
3. Энэ хавтсаас ажиллуулна:

   ```bash
   go2rtc -config go2rtc.yaml
   ```

   [http://localhost:1984](http://localhost:1984) дээр `hall` урсгал харагдах ёстой.
4. Halo-г ажиллуулаад (`bun dev`) нээнэ:

   ```
   http://localhost:3000/monitor?cctv=http://localhost:1984/api/webrtc?src=hall
   ```

   Pairing кодоор холбох эсвэл туршилтын горимоор эхлүүлнэ. Камерын оронд go2rtc-ийн урсгал шинжлэгдэнэ.

## Жинхэнэ IP камер

`go2rtc.yaml`-д камерын RTSP хаягийг нэмнэ (жишээнүүд файлд бий). Микрофонтой камер (Tapo C200/C210, Hikvision, Dahua) бол дууны илрүүлэлт бас ажиллана. Камер, go2rtc болон `/monitor` нээсэн компьютер нэг сүлжээнд байна.

Анхаар: Vercel дээрх `https://` хуудас `http://192.168.x.x` руу хандахыг browser хориглодог (mixed content). Phase 1-д go2rtc-ийг `/monitor` нээж буй компьютер дээрээ (`localhost`) ажиллуулна. Phase 2-ийн edge agent энэ асуудлыг шийднэ.
