export function calculateFPS(): () => number {
  let lastTime = performance.now();
  let frames = 0;
  return () => {
    frames++;
    const now = performance.now();
    const dt = now - lastTime;
    if (dt >= 1000) {
      const fps = Math.round((frames / dt) * 1000);
      frames = 0;
      lastTime = now;
      return fps;
    }
    return -1; // not yet updated
  };
}
