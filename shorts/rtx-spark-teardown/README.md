# RTX Spark (N1X) — Short 3D de desmontaje

Short vertical (1080×1920, 60 fps, 57 s) con un portátil NVIDIA RTX Spark que se desmonta en vista explosionada, enseña sus piezas con motion graphics estilo vídeo de producto ASUS/ROG y se vuelve a montar. Todo es generado por código: modelo 3D, animación, HUD, música y efectos.

Guion, storyboard, dirección musical, fuentes y datos verificados: [PRODUCCION.md](PRODUCCION.md).

## Estructura

| Ruta | Qué es |
|---|---|
| `cues.json` | Marcas de tiempo compartidas por animación y audio (120 BPM) |
| `tts/lines.json` | Guion, huecos de tiempo y descripción de la voz |
| `tts/qwen3_tts.py` | Locución con **Qwen3-TTS** (VoiceDesign → clon con el modelo Base) |
| `tts/fallback_pico.py` | Voz provisional offline (solo para maquetar tiempos) |
| `scene/` | Escena Three.js: `laptop.js` (modelo), `timeline.js` (animación y cámara), `hud.js` (motion graphics), `post.js` (bloom HDR, ACES, grano) |
| `audio/build_audio.py` | Música, SFX y mezcla final a −14 LUFS |
| `render/` | Render headless (Chromium + SwiftShader) y codificación final |

## Pasos

```bash
npm install                                # three + fuentes + ws
pip install numpy scipy soundfile pedalboard pyloudnorm numba pillow
python tts/qwen3_tts.py                    # voz con Qwen3-TTS (requiere huggingface.co o pesos locales)
python audio/build_audio.py                # -> build/mix.wav + build/captions.json (tiempos de subtítulos)
node render/render.mjs --fps 60 --jobs 2   # -> build/video_rgb.mkv (sin pérdida)
render/encode.sh                           # -> out/rtx-spark-short-1080x1920-60fps.mp4
render/encode_share.sh                     # -> out/rtx-spark-short-share.mp4 (< 30 MB para mensajería)
```

Revisión rápida: `node render/still.mjs 4.5 18 32 --scale 0.5` (fotogramas sueltos en `build/stills`) o una preview completa con `node render/render.mjs --fps 30 --scale 0.5 --out build/preview_rgb.mkv`.

Al cambiar la voz hay que volver a ejecutar `build_audio.py` y el render: los subtítulos palabra a palabra usan los tiempos reales de cada toma.
