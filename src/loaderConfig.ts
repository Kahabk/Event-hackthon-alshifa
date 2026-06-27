export const LOADER_CYCLE_MS = 2500;

export const waitForLoaderCycle = () => new Promise<void>((resolve) => {
  window.setTimeout(resolve, LOADER_CYCLE_MS);
});
