export const LOADER_VIDEO_SRC = '/Countdown-Bold-lite.mp4';
export const LOADER_PLAYBACK_RATE = 1.75;
export const LOADER_CYCLE_MS = 2500;

export const waitForLoaderCycle = () => new Promise<void>((resolve) => {
  window.setTimeout(resolve, LOADER_CYCLE_MS);
});
