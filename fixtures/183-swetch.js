// prepare/183-swetch.js
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
function randomGenerator(seed) {
  let a = bits(seed), b = bits(seed), c = bits(seed), d = bits(seed);
  return () => {
    const t = a + b | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = c << 21 | c >>> 11;
    d = d + 1 | 0;
    return ((t + d | 0) >>> 0) / 4294967296;
  };
}
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  let rand = randomGenerator(seed);
  const d0 = 2 * Math.PI * (seed[0] / 255) * rand();
  const d1 = 2 * Math.PI * (seed[1] / 255) * rand();
  const d2 = 2 * Math.PI * (seed[2] / 255) * rand();
  const d3 = 2 * Math.PI * (seed[3] / 255) * rand();
  ctx.lineWidth = 2;
  ctx.strokeStyle = `#ff0000`;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(50, 50);
  ctx.lineTo(50, 0);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.strokeStyle = `#000000`;
  ctx.globalAlpha = 0.4;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.arc(50, 50, 10, d3, d0);
  ctx.stroke();
  ctx.arc(50, 50, 20, d0, d1);
  ctx.stroke();
  ctx.arc(50, 50, 30, d1, d2);
  ctx.stroke();
  ctx.arc(50, 50, 40, d2, d3);
  ctx.stroke();
  ctx.arc(50, 50, 10, d3, d0);
}
export {
  draw
};
