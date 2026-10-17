"""Original, sine-based garden effects with low-pass filtering; no noise samples."""
import math
import struct
import wave
from pathlib import Path

RATE = 48000
DEST = Path(__file__).resolve().parents[1] / "assets" / "sounds"
DEST.mkdir(exist_ok=True)


def envelope(t, duration, attack, release):
    """Raised-cosine fades have zero slope at both ends, avoiding clicks."""
    if t <= 0 or t >= duration:
        return 0.0
    fade_in = .5 - .5 * math.cos(math.pi * min(1, t / attack))
    fade_out = .5 - .5 * math.cos(math.pi * min(1, (duration - t) / release))
    return fade_in * fade_out


def low_pass(samples, cutoff):
    """Two cascaded Butterworth biquads: smooth fourth-order low-pass."""
    for quality in (.5411961, 1.3065630):
        omega = 2 * math.pi * cutoff / RATE
        cosine = math.cos(omega)
        alpha = math.sin(omega) / (2 * quality)
        a0 = 1 + alpha
        b0 = (1 - cosine) / (2 * a0)
        b1 = (1 - cosine) / a0
        b2 = b0
        a1 = -2 * cosine / a0
        a2 = (1 - alpha) / a0
        x1 = x2 = y1 = y2 = 0.0
        output = []
        for x in samples:
            y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            output.append(y)
            x2, x1, y2, y1 = x1, x, y1, y
        samples = output
    return samples


# Each voice is (start, length, initial Hz, final Hz, amplitude).
# Broad, overlapping sine droplets replace the former noisy transients.
VOICES = {
    "water": [(.00, .36, 430, 270, .55), (.09, .35, 560, 350, .42),
              (.22, .34, 470, 290, .48), (.34, .28, 610, 390, .30)],
    "fertilize": [(.00, .22, 740, 690, .42), (.07, .24, 880, 810, .30),
                  (.17, .23, 650, 600, .38)],
    "plant": [(.00, .34, 145, 88, .85), (.015, .28, 230, 170, .18)],
}

for kind, duration, cutoff, peak in [
    ("water", .62, 700, .28),
    ("fertilize", .40, 850, .22),
    ("plant", .34, 300, .32),
]:
    count = round(RATE * duration)
    samples = []
    for i in range(count):
        t = i / RATE
        value = 0.0
        for start, length, first, last, amplitude in VOICES[kind]:
            dt = t - start
            if 0 < dt < length:
                phase = 2 * math.pi * (first * dt + (last - first) * dt * dt / (2 * length))
                value += amplitude * math.sin(phase) * envelope(dt, length, .055, .12)
        samples.append(value)
    samples = low_pass(samples, cutoff)
    # Fade again after filtering so filter tails cannot click at the file boundary.
    samples = [v * envelope(i / RATE, (count - 1) / RATE, .035, .085)
               for i, v in enumerate(samples)]
    scale = peak / max(abs(v) for v in samples)
    pcm = b"".join(struct.pack("<h", round(v * scale * 32767)) for v in samples)
    with wave.open(str(DEST / f"{kind}.wav"), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(pcm)
    print(f"{kind}: {duration:.2f}s, low-pass {cutoff} Hz, peak {20 * math.log10(peak):.1f} dBFS before playback volume")
