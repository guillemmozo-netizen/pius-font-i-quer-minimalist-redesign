"""Música + SFX + voz del Short, todo generado aquí (sin samples externos = sin problemas de licencia).

    python audio/build_audio.py            -> build/mix.wav, build/stems/*.wav, build/captions.json

Música: electrónica oscura/cinemática a 120 BPM en Re menor (i-VI-III-VII), con caída en la explosión (4,0 s),
bloque "chip" más denso, parón antes del remontaje, golpes en cada pieza que encaja y segunda caída al abrir la tapa.
Voz: tts/wav/Lxx.wav (Qwen3-TTS o la provisional). Cada toma se recorta, se procesa y se encaja en su hueco.
"""

import json
from pathlib import Path

import numpy as np
import pedalboard as pb
import pyloudnorm as pyln
import soundfile as sf
from numba import njit
from scipy import signal

ROOT = Path(__file__).resolve().parents[1]
SR = 48000
CUES = json.loads((ROOT / "cues.json").read_text(encoding="utf-8"))
LINES = json.loads((ROOT / "tts" / "lines.json").read_text(encoding="utf-8"))
DUR = CUES["duration"]
N = int(DUR * SR)
BEAT = 60.0 / CUES["bpm"]
BAR = BEAT * 4
rng = np.random.default_rng(2026)


# ------------------------------------------------------------------ utilidades
def zeros(ch=2):
    return np.zeros((ch, N), np.float32)


def t_axis(n):
    return np.arange(n) / SR


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_adsr(n, a=0.005, d=0.1, s=0.7, r=0.1, hold=None):
    """ADSR de n muestras; hold = duración de la nota (s) antes del release."""
    t = t_axis(n)
    hold = hold if hold is not None else n / SR - r
    e = np.where(t < a, t / max(a, 1e-6), 1.0)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / max(d, 1e-6), e)
    e = np.where((t >= a + d) & (t < hold), s, e)
    rel = np.clip(1 - (t - hold) / max(r, 1e-6), 0, 1)
    e = np.where(t >= hold, s * rel, e)
    return e.astype(np.float32)


def saw(freq, n, phase0=0.0):
    """Diente de sierra con PolyBLEP (sin aliasing audible). freq escalar o array."""
    f = np.broadcast_to(np.asarray(freq, np.float64), (n,))
    dt = f / SR
    ph = (phase0 + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m1 = ph < dt
    x = ph[m1] / dt[m1]
    y[m1] -= x + x - x * x - 1
    m2 = ph > 1 - dt
    x = (ph[m2] - 1) / dt[m2]
    y[m2] -= x * x + x + x + 1
    return y.astype(np.float32)


def sine(freq, n, phase0=0.0):
    f = np.broadcast_to(np.asarray(freq, np.float64), (n,))
    return np.sin(2 * np.pi * (phase0 + np.cumsum(f / SR))).astype(np.float32)


def noise(n):
    return rng.standard_normal(n).astype(np.float32)


def lp(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x).astype(np.float32)


def hp(x, fc, order=2):
    sos = signal.butter(order, fc, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x).astype(np.float32)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos")
    return signal.sosfilt(sos, x).astype(np.float32)


@njit(cache=True)
def _svf(x, fc, q, mode, sr):
    # filtro de variables de estado TPT (Zavalishin): corte por muestra, sin "zipper"
    y = np.empty_like(x)
    ic1 = 0.0
    ic2 = 0.0
    k = 1.0 / q
    for n in range(x.shape[0]):
        g = np.tan(np.pi * min(fc[n], sr * 0.45) / sr)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[n] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            y[n] = v2
        elif mode == 1:
            y[n] = x[n] - k * v1 - v2
        else:
            y[n] = v1
    return y


def sweep_filter(x, fc, kind="low", q=0.707):
    """Filtro con corte variable; fc = array (Hz) de la misma longitud que x."""
    fc = np.broadcast_to(np.asarray(fc, np.float64), x.shape).astype(np.float64)
    mode = {"low": 0, "high": 1, "band": 2}[kind]
    return _svf(x.astype(np.float64), np.maximum(fc, 20.0), q, mode, float(SR)).astype(np.float32)


def place(bus, x, t0, gain=1.0, pan=0.0):
    """Suma x (mono o estéreo) en el bus a partir de t0 s."""
    i0 = int(round(t0 * SR))
    if x.ndim == 1:
        l = np.cos((pan + 1) * np.pi / 4)
        r = np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l * 1.414, x * r * 1.414])
    if i0 < 0:
        x = x[:, -i0:]
        i0 = 0
    n = min(x.shape[1], N - i0)
    if n > 0:
        bus[:, i0 : i0 + n] += x[:, :n] * gain


def fx(x, *plugins):
    board = pb.Pedalboard(list(plugins))
    if x.ndim == 1:
        x = np.stack([x, x])
    return board(x.astype(np.float32), SR)


def db(v):
    return 10 ** (v / 20)


# ------------------------------------------------------------------ automatización musical
S = CUES["sections"]


def energy(t):
    """0 = silencio, 1 = intro, 2 = groove, 3 = pico."""
    if t < 4.0:
        return 1
    if 42.8 <= t < 43.6:
        return 0
    if 43.6 <= t < 47.4:
        return 1.5
    if 47.4 <= t < 48.6:
        return 1
    if 30.7 <= t < 35.1 or 48.6 <= t < 55.0:
        return 3
    if t >= 55.0:
        return 1
    return 2


def mask(fn, n=N):
    t = t_axis(n)
    return np.vectorize(fn, otypes=[np.float32])(t)


# progresión i-VI-III-VII en Re menor (una por compás)
CHORDS = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]]
ROOTS = [38, 34, 41, 36]


def chord_at(t):
    return int(t // BAR) % 4


# ------------------------------------------------------------------ instrumentos
def kick(n=int(0.45 * SR)):
    t = t_axis(n)
    f = 45 + 110 * np.exp(-t * 32)
    body = sine(f, n) * np.exp(-t * 7.5)
    click = hp(noise(n), 2500) * np.exp(-t * 180) * 0.35
    return np.tanh((body + click) * 1.6).astype(np.float32)


def clap(n=int(0.35 * SR)):
    t = t_axis(n)
    nz = bp(noise(n), 900, 5000)
    e = np.exp(-t * 18) + 0.6 * np.exp(-np.maximum(t - 0.012, 0) * 40) * (t > 0.012) + 0.5 * np.exp(-np.maximum(t - 0.024, 0) * 30) * (t > 0.024)
    tone = sine(190, n) * np.exp(-t * 30) * 0.4
    return ((nz * e * 0.8) + tone).astype(np.float32)


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    t = t_axis(n)
    return (hp(noise(n), 7500) * np.exp(-t * (14 if open_ else 90))).astype(np.float32)


def pluck(m, dur=0.22):
    n = int(dur * SR)
    t = t_axis(n)
    x = saw(midi(m), n) * 0.6 + saw(midi(m) * 1.005, n) * 0.4
    y = sweep_filter(x, 600 + 5200 * np.exp(-t * 18))
    return (y * np.exp(-t * 9)).astype(np.float32)


def supersaw(ms, dur, cutoff=2200, detune=0.12, voices=7):
    n = int(dur * SR)
    out = np.zeros((2, n), np.float32)
    for m in ms:
        for v in range(voices):
            d = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune
            f = midi(m) * 2 ** (d / 12)
            x = saw(f, n, phase0=rng.random())
            pan = (v - (voices - 1) / 2) / ((voices - 1) / 2) * 0.8
            out[0] += x * np.cos((pan + 1) * np.pi / 4)
            out[1] += x * np.sin((pan + 1) * np.pi / 4)
    out /= voices * len(ms) * 0.55
    out[0] = lp(out[0], cutoff)
    out[1] = lp(out[1], cutoff)
    return out


# ------------------------------------------------------------------ música
def build_music():
    drums = zeros()
    bass = zeros()
    arp = zeros()
    pad = zeros()
    lead = zeros()
    K, C = kick(), clap()
    HC, HO = hat(), hat(True)
    kick_times = []
    beats = int(DUR / BEAT)
    for b in range(beats):
        t = b * BEAT
        e = energy(t)
        if e >= 2 or (1.4 < e < 2 and t >= 43.6):
            place(drums, K, t, 0.95)
            kick_times.append(t)
        if e >= 2 and b % 2 == 1:
            place(drums, C, t, 0.55, pan=0.05)
        # hats en semicorcheas
        for k in range(4):
            tt = t + k * BEAT / 4
            e2 = energy(tt)
            if e2 == 0:
                continue
            if e2 >= 2:
                vel = [0.5, 0.25, 0.8, 0.3][k]
                place(drums, HO if k == 2 and b % 2 == 1 else HC, tt, 0.22 * vel, pan=0.3 if k % 2 else -0.2)
            elif e2 >= 1 and k % 2 == 0 and tt > 1.0:
                place(drums, HC, tt, 0.08, pan=0.25)
    # redoble acelerando en el remontaje
    for i, tt in enumerate(np.cumsum(np.linspace(0.25, 0.0625, 26))):
        t = 43.6 + tt * (3.7 / 9.2)
        if t < 47.35:
            place(drums, C, t, 0.12 + 0.25 * (t - 43.6) / 3.8, pan=0.1)

    # bajo: sierra filtrada + sub, en corcheas con acento
    for b in range(beats * 2):
        t = b * BEAT / 2
        e = energy(t)
        if e < 1.4 or (t < 4):
            continue
        root = ROOTS[chord_at(t)]
        n = int(BEAT / 2 * 0.92 * SR)
        tt = t_axis(n)
        x = saw(midi(root), n) * 0.5 + sine(midi(root - 12), n) * 0.9
        x = sweep_filter(x, 250 + 1400 * np.exp(-tt * 14))
        place(bass, x * env_adsr(n, 0.004, 0.08, 0.6, 0.03), t, 0.5 if b % 2 else 0.62)
    # sub del intro: pulso cada pulso de negra
    for b in range(8):
        t = b * BEAT
        n = int(BEAT * SR)
        tt = t_axis(n)
        place(bass, sine(midi(26), n) * np.exp(-tt * 3) * min(1, t / 2 + 0.2), t, 0.35)

    # arpegio (semicorcheas) con delay de corchea con puntillo
    pattern = [0, 2, 1, 2, 0, 2, 1, 3]
    steps = int(DUR / (BEAT / 4))
    for s in range(steps):
        t = s * BEAT / 4
        e = energy(t)
        if e < 1 or (t < 2.0) or (42.8 <= t < 43.6):
            continue
        ch = CHORDS[chord_at(t)]
        idx = pattern[s % 8]
        m = (ch[idx] if idx < 3 else ch[0] + 12) + 12
        g = 0.1 if e == 1 else (0.16 if e == 2 else 0.2)
        if 12.0 <= t < 16.4:
            g *= 0.8
        place(arp, pluck(m + (12 if e == 3 and s % 2 else 0)), t, g, pan=(-0.35 if s % 2 else 0.35))
    arp = fx(arp, pb.Delay(delay_seconds=BEAT * 0.75, feedback=0.32, mix=0.28), pb.Reverb(room_size=0.5, wet_level=0.18, dry_level=0.9))

    # pad supersaw por compás
    bars = int(DUR / BAR) + 1
    for b in range(bars):
        t = b * BAR
        e = energy(t + 0.01)
        ch = CHORDS[b % 4]
        cut = {0: 600, 1: 900, 1.5: 1400, 2: 1800, 3: 3200}.get(e, 1500)
        x = supersaw([m - 12 for m in ch] + [ch[0]], BAR + 0.3, cutoff=cut)
        n = x.shape[1]
        x *= env_adsr(n, 0.25, 0.3, 0.85, 0.3, hold=BAR)
        g = 0.12 if e <= 1 else 0.16
        place(pad, x, t, g)
    # stabs brillantes en el pico y en la caída final
    for b in range(beats):
        t = b * BEAT + BEAT / 2
        if energy(t) == 3 and b % 2 == 1:
            ch = CHORDS[chord_at(t)]
            x = supersaw([m + 12 for m in ch], 0.18, cutoff=5500, voices=5)
            x *= np.exp(-t_axis(x.shape[1]) * 14)
            place(lead, x, t, 0.22)
    lead = fx(lead, pb.Reverb(room_size=0.6, wet_level=0.25, dry_level=0.85))

    # sidechain (bombeo) al bombo para bajo y pad
    duck = np.ones(N, np.float32)
    for kt in kick_times:
        i0 = int(kt * SR)
        n = min(int(0.3 * SR), N - i0)
        tt = t_axis(n)
        duck[i0 : i0 + n] = np.minimum(duck[i0 : i0 + n], 1 - 0.65 * np.exp(-tt * 14))
    bass *= duck
    pad *= duck
    arp *= 0.6 + 0.4 * duck

    # filtro general: bajada en la inmersión (12-16,4 s) y en el parón
    music = drums + bass + arp + pad + lead
    t = t_axis(N)
    cut = np.full(N, 20000.0)
    m1 = (t >= 12.0) & (t < 15.6)
    cut[m1] = 19500 * np.exp(-(t[m1] - 12.0) * 1.1) + 500
    m2 = (t >= 15.6) & (t < 16.4)
    cut[m2] = 500 * (40 ** ((t[m2] - 15.6) / 0.8))
    m3 = (t >= 42.2) & (t < 42.8)
    cut[m3] = 19700 * np.exp(-(t[m3] - 42.2) * 6) + 300
    for c in range(2):
        music[c] = sweep_filter(music[c], cut)
    # "tape stop" + silencio en el parón
    i0, i1 = int(42.8 * SR), int(43.6 * SR)
    music[:, i0:i1] *= np.linspace(1, 0, i1 - i0) ** 3
    # final: sólo la cola desde 56,3 s
    fade = np.ones(N, np.float32)
    j0 = int(55.6 * SR)
    fade[j0:] = np.linspace(1, 0.0, N - j0) ** 1.5
    music *= fade
    return music, {"drums": drums, "bass": bass, "arp": arp, "pad": pad, "lead": lead}


# ------------------------------------------------------------------ efectos de sonido
def whoosh(dur=0.8, up=True):
    n = int(dur * SR)
    t = t_axis(n)
    x = noise(n)
    f = 300 + 3500 * (t / dur) ** 1.5 if up else 3800 - 3400 * (t / dur) ** 0.7
    y = sweep_filter(x, f, kind="low")
    y = hp(y, 120)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    y = y * e
    pan = np.linspace(-0.7, 0.7, n)
    return np.stack([y * np.cos((pan + 1) * np.pi / 4), y * np.sin((pan + 1) * np.pi / 4)]) * 1.2


def impact(big=True):
    n = int((2.2 if big else 1.0) * SR)
    t = t_axis(n)
    sub = sine(32 + 60 * np.exp(-t * 9), n) * np.exp(-t * (2.2 if big else 4.5))
    nz = lp(noise(n), 2500) * np.exp(-t * 16) * 0.7
    body = sine(110 * np.exp(-t * 3), n) * np.exp(-t * 10) * 0.4
    x = np.tanh((sub * 1.3 + nz + body) * 1.4)
    return fx(x, pb.Reverb(room_size=0.85, wet_level=0.35, dry_level=0.9, width=1.0))


def riser(dur):
    n = int(dur * SR)
    t = t_axis(n)
    p = t / dur
    nz = sweep_filter(noise(n), 400 + 9000 * p**2, kind="low")
    nz = hp(nz, 200)
    tone = sine(180 + 900 * p**2, n) * 0.25 + sine(360 + 1800 * p**2, n) * 0.1
    x = (nz * 0.8 + tone) * p**2.2
    return fx(x, pb.Reverb(room_size=0.7, wet_level=0.3, dry_level=0.9))


def tick(freq=3200, level=1.0):
    n = int(0.06 * SR)
    t = t_axis(n)
    x = (sine(freq, n) + 0.5 * sine(freq * 1.5, n)) * np.exp(-t * 90) + hp(noise(n), 6000) * np.exp(-t * 300) * 0.3
    return x * level


def zap(dur=0.35, f0=2600, f1=180):
    n = int(dur * SR)
    t = t_axis(n)
    f = f1 + (f0 - f1) * np.exp(-t * 14)
    x = sine(f + 400 * sine(f * 1.5, n), n) * np.exp(-t * 9)
    x += bp(noise(n), 2000, 9000) * np.exp(-t * 25) * 0.3
    return fx(x, pb.Bitcrush(bit_depth=9), pb.Reverb(room_size=0.4, wet_level=0.2))


def slam():
    n = int(0.9 * SR)
    t = t_axis(n)
    thump = sine(38 + 70 * np.exp(-t * 25), n) * np.exp(-t * 11)
    ring = sum(sine(f, n) * np.exp(-t * d) * a for f, d, a in [(820, 9, 0.18), (1313, 12, 0.12), (2150, 16, 0.08), (3470, 22, 0.05)])
    click = hp(noise(n), 3000) * np.exp(-t * 220) * 0.5
    x = np.tanh((thump * 1.2 + ring + click) * 1.3)
    return fx(x, pb.Reverb(room_size=0.45, wet_level=0.2, dry_level=0.95))


def crackle(dur):
    n = int(dur * SR)
    t = t_axis(n)
    x = bp(noise(n), 1500, 9000)
    gate = (rng.random(n // 240 + 1) > 0.72).repeat(240)[:n].astype(np.float32)
    gate = lp(gate, 400)
    return x * gate * (t / dur) ** 1.5 * 0.8


def fan_spin(dur):
    n = int(dur * SR)
    t = t_axis(n)
    up = np.clip(t / 0.6, 0, 1)
    down = np.clip((dur - t) / 0.8, 0, 1)
    env = (up * down).astype(np.float32)
    air = sweep_filter(noise(n), 400 + 2600 * np.minimum(1, t / 0.6), kind="low") * 0.6
    whine = sine(160 + 700 * np.minimum(t / 0.6, 1), n) * 0.12
    return (air + whine) * env


def shimmer(dur=0.8):
    n = int(dur * SR)
    t = t_axis(n)
    x = sum(sine(f * (1 + 0.003 * np.sin(2 * np.pi * 6 * t)), n) * a for f, a in [(1175, 0.3), (1760, 0.22), (2349, 0.15), (3520, 0.08)])
    x *= np.minimum(t / 0.05, 1) * np.exp(-t * 3.5)
    return fx(x, pb.Reverb(room_size=0.8, wet_level=0.45, dry_level=0.7))


def blip(m, dur=0.16):
    n = int(dur * SR)
    t = t_axis(n)
    return (sine(midi(m), n) + 0.3 * sine(midi(m + 12), n)) * np.exp(-t * 16)


def build_sfx():
    sfx = zeros()
    c = CUES
    for t in c["whooshes"]:
        place(sfx, whoosh(0.75, up=t not in (13.4, 14.6, 15.8, 55.3)), t - 0.35, 0.3)
    for t in c["impacts"]:
        place(sfx, impact(big=t in (4.0, 48.6, 31.0)), t, 0.75 if t in (4.0, 48.6) else 0.5)
    for t in c["slams"]:
        place(sfx, slam(), t, 0.55)
    for a, b in c["riser"]:
        place(sfx, riser(b - a), a, 0.32)
    for t in c["ticks"]:
        place(sfx, tick(2600 + rng.random() * 1500), t, 0.16, pan=rng.uniform(-0.4, 0.4))
    # rótulos del desglose (7 callouts)
    for i in range(7):
        place(sfx, tick(3000 + i * 180), 7.7 + i * 0.2, 0.13, pan=0.4)
    # SM encendiéndose (48) y núcleos CPU (20)
    for i in range(48):
        place(sfx, tick(3400 + rng.random() * 1800, 0.5), c["gpuLit"][0] + (c["gpuLit"][1] - c["gpuLit"][0]) * rng.random(), 0.1, pan=rng.uniform(-0.6, 0.6))
    for i in range(20):
        place(sfx, tick(2200 + i * 60, 0.7), c["cpuLit"][0] + i * (c["cpuLit"][1] - c["cpuLit"][0]) / 20, 0.12, pan=rng.uniform(-0.5, 0.5))
    # chispas en las juntas antes de abrir
    place(sfx, crackle(1.1), 2.95, 0.2)
    # pantalla encendiéndose + OLED tándem
    place(sfx, zap(0.4, 3200, 300), 10.95, 0.28)
    place(sfx, shimmer(1.0), 11.5, 0.22)
    # barrido de teclado
    for i in range(10):
        place(sfx, tick(1800 + i * 220, 0.5), 13.5 + i * 0.09, 0.08, pan=-0.6 + i * 0.13)
    # ventiladores
    a, b = c["fanSpin"]
    place(sfx, fan_spin(b - a), a, 0.32)
    # NVLink-C2C
    place(sfx, zap(0.5, 1800, 120), 20.9, 0.3)
    # flujo de datos (memoria unificada)
    for i in range(70):
        place(sfx, tick(5000 + rng.random() * 3000, 0.25), 25.7 + rng.random() * 5.0, 0.06, pan=rng.uniform(-0.8, 0.8))
    # carga de batería (4 celdas)
    for i, m in enumerate([74, 77, 81, 86]):
        place(sfx, blip(m), c["batteryFill"][0] + i * 0.48 + 0.3, 0.2)
    # barrido de luz sobre el aluminio
    place(sfx, shimmer(1.4), 38.7, 0.14)
    # bisagra y cierre de tapa
    for k in range(3):
        place(sfx, tick(900 + k * 150, 1.0), 48.05 + k * 0.03, 0.18)
    place(sfx, slam(), c["lidClose"][1], 0.35)
    return sfx


# ------------------------------------------------------------------ voz
def build_voice():
    wav_dir = ROOT / "tts" / "wav"
    engine = (wav_dir / "ENGINE").read_text().strip() if (wav_dir / "ENGINE").exists() else "?"
    pico = "pico" in engine
    voice = zeros()
    timing = {}
    chain = pb.Pedalboard(
        [
            pb.HighpassFilter(90),
            pb.LowShelfFilter(cutoff_frequency_hz=220, gain_db=2.5 if pico else 0.5),
            pb.PeakFilter(cutoff_frequency_hz=3200, gain_db=3.0, q=0.8),
            pb.HighShelfFilter(cutoff_frequency_hz=9000, gain_db=1.5),
            pb.Compressor(threshold_db=-20, ratio=3.2, attack_ms=4, release_ms=90),
            pb.Reverb(room_size=0.18, damping=0.6, wet_level=0.06, dry_level=1.0, width=0.6),
        ]
    )
    for l in LINES["lines"]:
        x, sr = sf.read(wav_dir / f"{l['id']}.wav", dtype="float32", always_2d=True)
        x = x.mean(axis=1)
        if sr != SR:
            x = signal.resample_poly(x, SR, sr).astype(np.float32)
        a = np.abs(x)
        thr = a.max() * 0.02
        idx = np.where(a > thr)[0]
        x = x[max(0, idx[0] - int(0.02 * SR)) : idx[-1] + int(0.06 * SR)]
        slot = l["end"] - l["start"]
        base = 1.12 if pico else 1.0  # la voz provisional es lenta de por sí
        stretch = max(base, len(x) / SR / slot)
        if stretch > 1.001:
            x = pb.time_stretch(x[None, :], SR, stretch_factor=float(min(stretch, 1.4)), high_quality=True)[0]
        x = x / (np.abs(x).max() + 1e-9) * 0.8
        y = chain(np.stack([x, x]), SR)
        place(voice, y, l["start"], 1.0)
        timing[l["id"]] = {"start": l["start"], "end": round(l["start"] + len(x) / SR, 3), "stretch": round(stretch, 3)}
    return voice, timing, engine


# ------------------------------------------------------------------ mezcla
def main():
    out = ROOT / "build"
    (out / "stems").mkdir(parents=True, exist_ok=True)
    music, parts = build_music()
    sfx = build_sfx()
    voice, timing, engine = build_voice()

    # la voz manda: compresión lateral de música y SFX cuando hay voz
    v_env = np.abs(voice).max(axis=0)
    v_env = lp(v_env, 8)
    v_env = np.clip(v_env / (v_env.max() * 0.25 + 1e-9), 0, 1)
    duck_m = 1 - 0.55 * v_env
    duck_s = 1 - 0.3 * v_env

    meter = pyln.Meter(SR)
    def norm(x, lufs):
        l = meter.integrated_loudness(x.T)
        return x * db(lufs - l)

    voice_n = norm(voice, -16.0)
    music_n = norm(music, -19.5) * duck_m
    sfx_n = norm(sfx, -21.0) * duck_s
    mix = voice_n + music_n + sfx_n
    master = pb.Pedalboard(
        [
            pb.Compressor(threshold_db=-14, ratio=2.0, attack_ms=10, release_ms=150),
            pb.Limiter(threshold_db=-1.5, release_ms=80),
        ]
    )
    mix = master(mix.astype(np.float32), SR)
    mix = norm(mix, -14.0)
    peak = np.abs(mix).max()
    if peak > db(-1.0):
        mix = pb.Pedalboard([pb.Limiter(threshold_db=-1.2, release_ms=60)])(mix.astype(np.float32), SR)
    sf.write(out / "mix.wav", mix.T, SR, subtype="PCM_24")
    for name, x in [("voice", voice_n), ("music", music_n), ("sfx", sfx_n)]:
        sf.write(out / "stems" / f"{name}.wav", x.T, SR, subtype="PCM_24")
    (out / "captions.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1), encoding="utf-8")
    print("voz:", engine)
    print("LUFS mezcla:", round(meter.integrated_loudness(mix.T), 2), "pico dBFS:", round(20 * np.log10(np.abs(mix).max()), 2))
    for k, v in timing.items():
        print(k, v)


if __name__ == "__main__":
    main()
