// prepare/193-focused-eyeballs.js
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
  function scrambleSeed() {
    const stepCount = seed.length;
    let acc = 0;
    for (let i = 0;i < stepCount * 5; i++) {
      acc ^= seed[i % stepCount];
      acc %= 255;
      seed[i % stepCount] ^= acc;
    }
  }
  for (let i = 0;i < 5; i++)
    scrambleSeed();
  const rng = randomGenerator(seed);
  function randomSign() {
    return rng() ? -1 : 1;
  }
  for (let i = 0;i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 5 + i * 10);
    ctx.lineTo(100, 5 + i * 10);
    ctx.stroke();
  }
  function drawBlocks(blockCount, size) {
    for (let i = 0;i < blockCount; i++) {
      const x = Math.floor(rng() * (10 - size)) * 10;
      const y = 5 + Math.floor(rng() * (10 - size)) * 10;
      ctx.beginPath();
      ctx.rect(x, y, 10 * size, 10 * size);
      ctx.fill();
    }
  }
  ctx.fillStyle = "black";
  drawBlocks(rng() * 6 + 10, 1);
  const eyeX = 50 + rng() * 4 - 2;
  const eyeY = 50 + rng() * 4 - 2;
  function drawEye() {
    ctx.fillStyle = "white";
    ctx.setLineDash([6, 2]);
    ctx.beginPath();
    ctx.arc(50, 50, 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([rng() * 4 + 1, rng() * 4 + 1, rng() * 4 + 1, rng() * 4 + 1]);
    ctx.fillStyle = "#cccc";
    ctx.beginPath();
    ctx.moveTo(70, 50);
    ctx.lineTo(50, 70);
    ctx.lineTo(30, 50);
    ctx.lineTo(50, 30);
    ctx.lineTo(70, 50);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "white";
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(50, 50, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "black";
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.translate(-25, 0);
  drawEye();
  ctx.translate(50, 0);
  drawEye();
}
export {
  draw
};
