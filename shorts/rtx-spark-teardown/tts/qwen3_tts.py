"""Genera la locución del Short con Qwen3-TTS.

Flujo por defecto (el que recomienda Qwen para mantener el mismo timbre en todas las frases):
  1. VoiceDesign 1.7B crea una toma de referencia a partir de la descripción de lines.json.
  2. El modelo Base clona esa referencia y locuta cada línea del guion.

Uso (necesita acceso a huggingface.co, o los pesos ya descargados en local):
    pip install -U qwen-tts soundfile
    python tts/qwen3_tts.py
    python tts/qwen3_tts.py --design-model ./Qwen3-TTS-12Hz-1.7B-VoiceDesign --base-model ./Qwen3-TTS-12Hz-1.7B-Base
    python tts/qwen3_tts.py --clone-ref mi_voz.wav --clone-text "transcripción de mi_voz.wav"
    python tts/qwen3_tts.py --only L03 L08      # regenerar solo algunas tomas

Escribe tts/wav/Lxx.wav. Después: python audio/build_audio.py
El mezclador coloca cada toma en su hueco del storyboard y ajusta el tempo si se pasa.
"""

import argparse
import json
from pathlib import Path

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

HERE = Path(__file__).resolve().parent
REF_TEXT = (
    "Esto es un portátil gaming por dentro: cámara de vapor, tres ventiladores "
    "y metal líquido. Pieza a pieza."
)


def load_model(name, device):
    kwargs = {"device_map": device}
    if device.startswith("cuda"):
        kwargs["dtype"] = torch.bfloat16
        try:
            import flash_attn  # noqa: F401

            kwargs["attn_implementation"] = "flash_attention_2"
        except ImportError:
            pass
    else:
        kwargs["dtype"] = torch.float32
    return Qwen3TTSModel.from_pretrained(name, **kwargs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--design-model", default="Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign")
    ap.add_argument("--base-model", default="Qwen/Qwen3-TTS-12Hz-1.7B-Base")
    ap.add_argument("--device", default="cuda:0" if torch.cuda.is_available() else "cpu")
    ap.add_argument("--clone-ref", default=None, help="wav propio para clonar (se salta VoiceDesign)")
    ap.add_argument("--clone-text", default=None, help="transcripción exacta de --clone-ref")
    ap.add_argument("--only", nargs="*", help="regenerar solo estas líneas")
    args = ap.parse_args()

    cfg = json.loads((HERE / "lines.json").read_text(encoding="utf-8"))
    lang = cfg["voice"]["language"]
    out_dir = HERE / "wav"
    out_dir.mkdir(exist_ok=True)
    lines = [l for l in cfg["lines"] if not args.only or l["id"] in args.only]

    if args.clone_ref:
        ref_audio, ref_text = args.clone_ref, args.clone_text
    else:
        ref_path = out_dir / "_voice_reference.wav"
        if not ref_path.exists():
            design = load_model(args.design_model, args.device)
            wavs, sr = design.generate_voice_design(
                text=REF_TEXT, language=lang, instruct=cfg["voice"]["instruct"]
            )
            sf.write(ref_path, wavs[0], sr)
            del design
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        ref_audio, ref_text = str(ref_path), REF_TEXT

    base = load_model(args.base_model, args.device)
    prompt = base.create_voice_clone_prompt(ref_audio=ref_audio, ref_text=ref_text)
    for l in lines:
        wavs, sr = base.generate_voice_clone(text=l["tts"], language=lang, voice_clone_prompt=prompt)
        sf.write(out_dir / f"{l['id']}.wav", wavs[0], sr)
        print(l["id"], f"{len(wavs[0]) / sr:.2f}s  (hueco {l['end'] - l['start']:.2f}s)")
    (out_dir / "ENGINE").write_text("qwen3-tts\n")


if __name__ == "__main__":
    main()
