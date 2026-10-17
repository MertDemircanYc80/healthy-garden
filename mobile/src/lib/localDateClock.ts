import { localDay } from "./health/days";

interface Clock {
  now(): Date;
  schedule(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
  cancel(timer: ReturnType<typeof setTimeout>): void;
}
const systemClock: Clock = {
  now: () => new Date(),
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: timer => clearTimeout(timer),
};

/** Schedule by local midnight (including DST); bounded checks also catch timezone/clock changes. */
export function watchLocalDate(onCheck: (date: string) => void, clock: Clock = systemClock) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function check() {
    if (stopped) return;
    if (timer !== undefined) clock.cancel(timer);
    const now = clock.now();
    onCheck(localDay(now));
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    timer = clock.schedule(check, Math.max(1, Math.min(30000, midnight.getTime() - now.getTime())));
  }
  check();
  return {
    check,
    stop() { stopped = true; if (timer !== undefined) clock.cancel(timer); },
  };
}
