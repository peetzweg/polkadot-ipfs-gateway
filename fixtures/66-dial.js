// prepare/66-dial.js
var dark = "#666";
function getByte(seed, index) {
  return seed[index % seed.length];
}
function split(seed, parts) {
  const r = [];
  let last = 0;
  for (let i = 0;i < parts; ++i) {
    const next = Math.round((i + 1) * 32 / parts);
    r.push(bits(seed, last, next));
    last = next;
  }
  return r;
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
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  let nibbles = split(seed, 8);
  let size = 100;
  for (var i = 0;i < 4; i++) {
    ctx.lineWidth = size / 20;
    ctx.strokeStyle = dark;
    ctx.beginPath();
    let s = Math.PI * 2 * nibbles[i] / 16;
    let l = Math.PI * 2 * (nibbles[i + 4] + 1) / 17;
    ctx.arc(size / 2, size / 2, size / 2 / 6 * (i + 3) - ctx.lineWidth, s, s + l);
    ctx.stroke();
  }
}
export {
  draw
};
