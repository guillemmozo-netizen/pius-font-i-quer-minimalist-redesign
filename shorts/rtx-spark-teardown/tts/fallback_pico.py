"""Voz provisional offline (SVOX Pico, es-ES) para cuando Qwen3-TTS no está disponible.

Solo se usa para maquetar tiempos: python tts/qwen3_tts.py la sustituye tomando los mismos huecos.
Requiere: apt install libttspico-utils
"""

import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main():
    cfg = json.loads((HERE / "lines.json").read_text(encoding="utf-8"))
    out_dir = HERE / "wav"
    out_dir.mkdir(exist_ok=True)
    for l in cfg["lines"]:
        text = l["tts"].replace("...", ",")
        out = out_dir / f"{l['id']}.wav"
        subprocess.run(["pico2wave", "-l", "es-ES", "-w", str(out), text], check=True)
        print(l["id"], out)
    (out_dir / "ENGINE").write_text("svox-pico (provisional)\n")


if __name__ == "__main__":
    main()
