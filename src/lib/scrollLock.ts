let activeLocks = 0;
let previousBodyOverflow = '';
let previousRootOverflow = '';

export const acquireScrollLock = () => {
  if (activeLocks === 0) {
    previousBodyOverflow = document.body.style.overflow === 'hidden' ? '' : document.body.style.overflow;
    previousRootOverflow = document.documentElement.style.overflow === 'hidden' ? '' : document.documentElement.style.overflow;
  }
  activeLocks += 1;
  document.body.style.overflow = 'hidden';
  document.documentElement.style.overflow = 'hidden';

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    }
  };
};
