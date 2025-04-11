// prepare/98-80s-sprite-generator.js
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  function renderArt(ctx2, seed2) {
    let size = 100;
    ctx2.fillStyle = "#ffffff";
    ctx2.fillRect(0, 0, size, size);
    const getSeedValue = (index) => seed2[index % seed2.length];
    let seedValue = seed2.reduce((acc, val, i) => acc + val * Math.pow(16, i), 0);
    const h = 16;
    const w = h / 2;
    const scale = size / h;
    const ox = w - 0.5;
    const oy = 0 - 0.5;
    const r = w - 2;
    const paletteBase = getSeedValue(0) % 12 * 30;
    const saturationBase = 60 + getSeedValue(1) % 20;
    const lightnessBase = 50 + getSeedValue(2) % 15;
    const lineThickness = 1.5;
    const generateColor = (i, j) => {
      const hue = (paletteBase + i * 20) % 360;
      const saturation = saturationBase;
      const lightness = lightnessBase;
      return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };
    for (let y = 0;y < h; ++y) {
      for (let x = 0;x < w; ++x) {
        let s = x + y * w * (seedValue / 1e6 + 1);
        if (Math.tan(s % 100) < 2) {
          if (s * s % r > Math.hypot(x, y - h / 2)) {
            ctx2.fillStyle = generateColor(y, x);
            ctx2.fillRect(ox * scale + x * scale, oy * scale + y * scale, lineThickness * scale, lineThickness * scale);
            ctx2.fillRect(ox * scale - x * scale, oy * scale + y * scale, lineThickness * scale, lineThickness * scale);
          }
        }
      }
    }
  }
  renderArt(ctx, seed);
}
export {
  draw
};
