// prepare/202-chaos-ii-(robot-wars).js
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  function randomGenerator(seed2) {
    let s = seed2.reduce((acc, val) => acc * 31 + val >>> 0, 1);
    return function() {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }
  function randomAccentColor(rng) {
    const hue = Math.floor(rng() * 360);
    return `hsl(${hue}, 70%, 55%)`;
  }
  function drawRandomBackground(ctx2, size, rng, accent) {
    ctx2.fillStyle = "#ffffff";
    ctx2.fillRect(0, 0, size, size);
    const shapeCount = 2 + Math.floor(rng() * 3);
    for (let i = 0;i < shapeCount; i++) {
      const shapeType = Math.floor(rng() * 3);
      ctx2.beginPath();
      ctx2.lineWidth = 4 + rng() * 2;
      ctx2.strokeStyle = "#000000";
      ctx2.fillStyle = accent;
      if (shapeType === 0) {
        const w = size * (0.2 + rng() * 0.25);
        const h = size * (0.2 + rng() * 0.25);
        const x = rng() * (size - w);
        const y = rng() * (size - h);
        ctx2.rect(x, y, w, h);
        ctx2.fill();
        ctx2.stroke();
      } else if (shapeType === 1) {
        const cx = rng() * size;
        const cy = rng() * size;
        const r = size * (0.1 + rng() * 0.15);
        ctx2.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx2.fill();
        ctx2.stroke();
      } else {
        const x1 = rng() * size, y1 = rng() * size;
        const x2 = rng() * size, y2 = rng() * size;
        const x3 = rng() * size, y3 = rng() * size;
        ctx2.moveTo(x1, y1);
        ctx2.lineTo(x2, y2);
        ctx2.lineTo(x3, y3);
        ctx2.closePath();
        ctx2.fill();
        ctx2.stroke();
      }
    }
  }
  function drawYinYang(ctx2, r) {
    const black = "#000000";
    const white = "#ffffff";
    ctx2.beginPath();
    ctx2.moveTo(0, -r);
    ctx2.arc(0, 0, r, -Math.PI / 2, +Math.PI / 2, false);
    ctx2.arc(0, r / 2, r / 2, +Math.PI / 2, 3 * Math.PI / 2, false);
    ctx2.closePath();
    ctx2.fillStyle = black;
    ctx2.fill();
    ctx2.beginPath();
    ctx2.moveTo(0, r);
    ctx2.arc(0, -r / 2, r / 2, 3 * Math.PI / 2, +Math.PI / 2, false);
    ctx2.closePath();
    ctx2.fillStyle = white;
    ctx2.fill();
    ctx2.beginPath();
    ctx2.arc(0, r / 2, r / 8, 0, 2 * Math.PI);
    ctx2.fillStyle = white;
    ctx2.fill();
    ctx2.beginPath();
    ctx2.arc(0, -r / 2, r / 8, 0, 2 * Math.PI);
    ctx2.fillStyle = black;
    ctx2.fill();
    ctx2.beginPath();
    ctx2.arc(0, 0, r, 0, 2 * Math.PI);
    ctx2.lineWidth = 2;
    ctx2.strokeStyle = black;
    ctx2.stroke();
  }
  function drawTile(ctx2, size, seed2) {
    const rng = randomGenerator(seed2);
    const accent = randomAccentColor(rng);
    drawRandomBackground(ctx2, size, rng, accent);
    const r = size * 0.4;
    const angle = rng() * 2 * Math.PI;
    ctx2.save();
    ctx2.translate(size / 2, size / 2);
    ctx2.rotate(angle);
    drawYinYang(ctx2, r);
    ctx2.restore();
  }
  function draw2(ctx2, seed2) {
    drawTile(ctx2, 100, seed2);
  }
  draw2(ctx, seed);
}
export {
  draw
};
