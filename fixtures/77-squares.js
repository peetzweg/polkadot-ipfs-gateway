// prepare/77-squares.js
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
  ctx.translate(5, 5);
  ctx.scale(100, 100);
  ctx.lineWidth = 1 / 200;
  colored = true;
  let rng = randomGenerator(seed);
  const pallete = ["#D00000", "#FFBA08", "#3F88C5", "#032B43", "#136F63"];
  for (const n of [6, 3, 2]) {
    const s = 1 / (n * 2 - 1);
    const d = s / 2;
    const o = (1 - s * n) / 2;
    for (var x = 0;x < n; x++)
      for (var y = 0;y < n; y++) {
        ctx.save();
        ctx.translate((s + d) * x + o, (s + d) * y + o);
        ctx.beginPath();
        ctx.rect(-s / 2, -s / 2, s, s);
        ctx.strokeStyle = colored && pallete[(x * n + y) % 5];
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = 1 / 50;
        if (rng() > 0.5) {
          if (n == 6)
            ctx.fill();
          else
            ctx.stroke();
        }
        ctx.restore();
      }
  }
}
export {
  draw
};
