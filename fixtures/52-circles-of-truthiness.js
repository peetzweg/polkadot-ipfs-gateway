// prepare/52-circles-of-truthiness.js
function getByte(seed, index) {
  return seed[index % seed.length];
}
function bit(seed, i) {
  return getByte(seed, Math.floor(i / 8)) >> i % 8 & 1;
}
function fillEach(array, fn, ctx) {
  array.forEach((element, index) => {
    ctx.beginPath();
    fn(element, index);
    ctx.fill();
  });
}
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  const individualBits = Array.from({ length: seed.length * 8 }, (_, i) => bit(seed, i));
  const gridSize = Math.ceil(Math.sqrt(individualBits.length));
  const cellSize = 100 / gridSize;
  const rectSize = cellSize;
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, rectSize, rectSize);
  ctx.translate(cellSize, cellSize);
  fillEach(individualBits, (b, i) => {
    if (b === 1) {
      const x = i % gridSize * cellSize + cellSize / 2;
      const y = Math.floor(i / gridSize) * cellSize + cellSize / 2;
      ctx.beginPath();
      ctx.arc(x, y, cellSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, ctx);
}
export {
  draw
};
