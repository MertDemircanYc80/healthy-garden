"""Original procedural garden Foley; deterministic, mono PCM, no external samples."""
import math, random, struct, wave
from pathlib import Path
RATE = 24000
DEST = Path(__file__).resolve().parents[1] / 'assets' / 'sounds'
DEST.mkdir(exist_ok=True)
for kind, duration in [('water', .62), ('fertilize', .40), ('plant', .34)]:
    rng = random.Random(kind)
    count = round(RATE * duration)
    samples = []
    low = 0
    grains = [(rng.uniform(.025, duration - .07), rng.uniform(650, 2100)) for _ in range(16)]
    for i in range(count):
        t = i / RATE
        noise = rng.uniform(-1, 1)
        low = .78 * low + .22 * noise
        envelope = min(1, t / .025) * min(1, (duration - t) / .08)
        if kind == 'water':
            value = .35 * low + .035 * noise
            for start, frequency in grains:
                dt = t - start
                if 0 < dt < .07:
                    value += .065 * math.sin(2 * math.pi * (frequency * dt - 1800 * dt * dt)) * math.sin(math.pi * dt / .07) ** 2
        elif kind == 'fertilize':
            value = 0
            for start, frequency in grains[:11]:
                dt = t - start
                if 0 < dt < .035:
                    value += (.22 * low + .06 * noise) * math.sin(math.pi * dt / .035) ** 2
        else:
            value = (.32 * math.sin(2 * math.pi * (130 * t - 80 * t * t)) + .48 * low) * math.exp(-12 * t)
        samples.append(value * envelope)
    scale = .48 / max(abs(v) for v in samples)
    pcm = b''.join(struct.pack('<h', round(max(-1, min(1, v * scale)) * 32767)) for v in samples)
    with wave.open(str(DEST / f'{kind}.wav'), 'wb') as output:
        output.setnchannels(1); output.setsampwidth(2); output.setframerate(RATE); output.writeframes(pcm)
    print(f'{kind}: {duration:.2f}s, {len(pcm)} bytes, peak -6.4 dBFS before playback volume')
