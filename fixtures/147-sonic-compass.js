// prepare/147-sonic-compass.js
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  const stepCount = seed.length;
  const stepSize = Math.PI * 2 / stepCount;
  function scrambleSeed() {
    let acc = 0;
    for (let i = 0;i < stepCount * 5; i++) {
      acc ^= seed[i % stepCount];
      acc %= 255;
      seed[i % stepCount] ^= acc;
    }
  }
  function getPos(step, depth) {
    return [Math.cos(stepSize * step) * depth, Math.sin(stepSize * step) * depth];
  }
  function getDepth(index) {
    if (index >= stepCount)
      index -= stepCount;
    if (index < 0)
      index += stepCount;
    return 30 + seed[index] / 20;
  }
  ctx.translate(50, 50);
  function drawBlob(size, color) {
    ctx.beginPath();
    let prev = getDepth(-1) * size;
    ctx.moveTo(...getPos(-1, prev));
    for (let i = 0;i < stepCount; i++) {
      const value = getDepth(i) * size;
      ctx.bezierCurveTo(...getPos(i - 0.25, prev), ...getPos(i - 0.75, value), ...getPos(i, value));
      prev = value;
    }
    ctx.fillStyle = color;
    ctx.fill();
    ctx.stroke();
  }
  scrambleSeed();
  drawBlob(1, "#ccc");
  scrambleSeed();
  drawBlob(0.6, "#fff");
  scrambleSeed();
  const lines = [
    ["#000", 3, [], 1],
    ["#000", 2, [6, 3], 2],
    ["#000", 2, [2, 2], 3],
    ["#000", 6, [], 0],
    ["#f00", 2, [], 0]
  ];
  for (const [color, width, dash, i] of lines) {
    const angle = seed[i] / 255 * 2 * Math.PI;
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(49 * Math.cos(angle), 49 * Math.sin(angle));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.setLineDash([]);
  ctx.fillStyle = "#e00";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.arc(0, 0, 4, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.arc(0, 0, 49, 0, 2 * Math.PI);
  ctx.stroke();
}
export {
  draw
};
