// prepare/182-harmony.js
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
  ctx.strokeStyle = `hsl(${seed[0] % 360}, 100%, 60%)`;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(50, 50);
  ctx.lineTo(50, 0);
  ctx.stroke();
  const arcWidths = [8, 6, 4, 10, 2];
  const arcOpacities = [0.8, 0.6, 0.5, 0.4, 0.7];
  const radii = [10, 25, 35, 45, 45];
  for (let i = 0;i < 5; i++) {
    ctx.lineWidth = arcWidths[i];
    ctx.strokeStyle = `hsl(${seed[i % 4] * 3 % 360}, 100%, 50%)`;
    ctx.globalAlpha = arcOpacities[i];
    ctx.beginPath();
    ctx.arc(50, 50, radii[i], [d0, d1, d2, d3, d0][i], [d1, d2, d3, d0, d1][i]);
    ctx.stroke();
  }
}
export {
  draw
};
