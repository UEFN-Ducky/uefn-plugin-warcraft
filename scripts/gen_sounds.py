#!/usr/bin/env python3
"""Generate original UI sounds (stdlib only — no sampled/copyrighted audio).

  click.wav  — short stony click (damped sine + tick of noise)
  scroll.wav — parchment rustle (shaped band-passed noise swell)

  py plugins/uefn-plugin-warcraft/scripts/gen_sounds.py
"""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

RATE = 44100
OUT = Path(__file__).resolve().parents[1] / "ui" / "sounds"


def write_wav(path: Path, samples: list[float]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(RATE)
        frames = b"".join(
            struct.pack("<h", int(max(-1.0, min(1.0, s)) * 32000)) for s in samples
        )
        wf.writeframes(frames)
    print(f"wrote {path} ({path.stat().st_size} bytes)")


def click() -> list[float]:
    dur = 0.09
    n = int(RATE * dur)
    rng = random.Random(1337)
    out = []
    phase = 0.0
    for i in range(n):
        t = i / RATE
        env = math.exp(-t * 55.0)
        freq = 1150.0 * math.exp(-t * 18.0) + 240.0
        phase += 2.0 * math.pi * freq / RATE
        tone = math.sin(phase) * 0.55
        tick = (rng.random() * 2 - 1) * math.exp(-t * 220.0) * 0.5
        out.append((tone + tick) * env * 0.8)
    return out


def scroll() -> list[float]:
    dur = 0.34
    n = int(RATE * dur)
    rng = random.Random(4242)
    # Simple band-pass: difference of two one-pole low-passes.
    lp_fast = lp_slow = 0.0
    a_fast, a_slow = 0.22, 0.045
    out = []
    for i in range(n):
        t = i / RATE
        # swell up then decay — parchment being unrolled
        env = math.sin(min(1.0, t / 0.10) * math.pi / 2) * math.exp(-max(0.0, t - 0.12) * 14.0)
        white = rng.random() * 2 - 1
        lp_fast += a_fast * (white - lp_fast)
        lp_slow += a_slow * (white - lp_slow)
        band = lp_fast - lp_slow
        crackle = (rng.random() * 2 - 1) * 0.12 if rng.random() < 0.02 else 0.0
        out.append((band * 2.1 + crackle) * env * 0.7)
    return out


def main() -> None:
    write_wav(OUT / "click.wav", click())
    write_wav(OUT / "scroll.wav", scroll())


if __name__ == "__main__":
    main()
