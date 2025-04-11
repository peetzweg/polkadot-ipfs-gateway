// prepare/65-star.js
function getByte(seed, index) {
  return seed[index % seed.length];
}
function bit(seed, i) {
  return getByte(seed, Math.floor(i / 8)) >> i % 8 & 1;
}
function bits(seed, from = 0, to = 32) {
  let r = 0;
  for (let i = from;i < to; ++i)
    r = (r << 1 | bit(seed, i)) >>> 0;
  return r;
}
function symmetrical(factor, fn, ctx) {
  ctx.translate(50, 50);
  ctx.scale(50, 50);
  for (let i = 0;i < factor; ++i) {
    ctx.save();
    ctx.rotate(Math.PI * 2 * i / factor);
    fn(i);
    ctx.restore();
  }
}
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  ctx.lineWidth = 0.04;
  symmetrical(11, (i) => {
    ctx.beginPath();
    ctx.moveTo(0, 0.1);
    let b = bits(seed, i * 3, i * 3 + 3) + 1;
    let c = b & 1;
    let d = b <= 1 ? 0 : b == 2 ? 1 : b - (2 - c);
    ctx.lineTo(0, d / 12 + 0.2);
    ctx.moveTo(0, d / 12 + 0.25);
    ctx.lineTo(0, b / 12 + 0.25);
    ctx.stroke();
  }, ctx);
}
export {
  draw
};
