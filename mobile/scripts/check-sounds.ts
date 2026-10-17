import assert from "node:assert/strict";
import { createGardenSounds, SOUND_PREFERENCE_KEY, type GardenSound } from "../src/lib/gardenSounds";

async function main() {
  const data = new Map<string, string>();
  let failWrite = false;
  const storage = { getItem: async (key: string) => data.get(key) ?? null, setItem: async (key: string, value: string) => { if (failWrite) throw new Error("disk full"); data.set(key, value); } };
  const played: GardenSound[] = [];
  let finish: () => void = () => {};
  let playing = 0;
  const driver = {
    play(sound: GardenSound) {
      assert.equal(playing, 0, "sounds must never overlap");
      playing++; played.push(sound);
      return new Promise<void>(resolve => { finish = () => { playing = 0; resolve(); }; });
    },
    stop() { finish(); },
  };
  const sounds = createGardenSounds(storage, driver);
  sounds.play("plant"); assert.equal(played.length, 0, "wait for saved mute setting");
  await sounds.load();
  assert.equal(sounds.snapshot().muted, false);
  sounds.play("water"); sounds.play("fertilize"); sounds.play("plant");
  assert.deepEqual(played, ["water"]);
  finish(); await Promise.resolve();
  assert.deepEqual(played, ["water", "fertilize"]);
  finish(); await Promise.resolve();
  assert.deepEqual(played, ["water", "fertilize", "plant"]);
  sounds.play("water");
  await sounds.toggle(); // muting cancels the pending water and current playback
  assert.equal(playing, 0);
  assert.equal(data.get(SOUND_PREFERENCE_KEY), "true");
  sounds.play("water"); assert.equal(played.length, 3);
  const restored = createGardenSounds(storage, driver); await restored.load();
  assert.equal(restored.snapshot().muted, true);
  await sounds.toggle();
  sounds.play("water"); sounds.play("plant"); sounds.clear(); await Promise.resolve();
  assert.deepEqual(played, ["water", "fertilize", "plant", "water"]);
  failWrite = true; await sounds.toggle();
  assert.equal(sounds.snapshot().muted, true, "mute stays immediate even if disk fails");
  assert.equal(sounds.snapshot().error, true);
  failWrite = false; await sounds.toggle();
  assert.equal(sounds.snapshot().error, false);
  assert.equal(data.get(SOUND_PREFERENCE_KEY), "true", "retry saves the current preference");
  await sounds.toggle(); sounds.play("plant"); sounds.play("water"); sounds.dispose(); await Promise.resolve();
  assert.equal(played.at(-1), "plant"); assert.equal(playing, 0);
  sounds.play("water"); assert.equal(played.at(-1), "plant");
  const failedLoad = createGardenSounds({ ...storage, getItem: async () => { throw new Error("unavailable"); } }, driver);
  await failedLoad.load(); assert.equal(failedLoad.snapshot().muted, true);
  failedLoad.play("water"); assert.equal(played.at(-1), "plant");
  const unavailable = createGardenSounds({ ...storage, getItem: async () => null }, { play: async () => { throw new Error("audio unavailable"); }, stop() {} });
  await unavailable.load(); unavailable.play("water"); unavailable.play("plant");
  await Promise.resolve(); await Promise.resolve(); unavailable.dispose();
  console.log("✓ sounds serialize, wait for preferences, persist mute, cancel on mute/background/unmount, recover failed saves and tolerate unavailable audio");
}
void main();
