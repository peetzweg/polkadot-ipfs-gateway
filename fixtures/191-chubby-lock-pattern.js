// prepare/191-chubby-lock-pattern.js
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
  let rng = randomGenerator(seed);
  const N = 4;
  const squareSize = 100 / N;
  const halfSize = squareSize / 2;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  const intersects = (x1, y1, x2, y2, x3, y3, x4, y4) => {
    denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denominator === 0) {
      return false;
    }
    let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
    let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
    if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
      return false;
    }
    return true;
  };
  const lines = [];
  const lineIsOk = (a, b, c, d) => {
    for (const line of lines) {
      if (line[0] == a && line[1] == b)
        continue;
      if (line[2] == a && line[3] == b)
        continue;
      if (line[0] == c && line[1] == d)
        return false;
      if (line[2] == c && line[3] == d)
        return false;
      if (intersects(a, b, c, d, line[0], line[1], line[2], line[3]))
        return false;
    }
    return true;
  };
  const visit = (x2, y2) => {
    for (let att = 0;att < 10; ++att) {
      const nx = Math.floor(rng() * N);
      const ny = Math.floor(rng() * N);
      if (x2 == nx && y2 == ny)
        continue;
      if (!lineIsOk(x2, y2, nx, ny))
        continue;
      if (nx < 0 || nx >= N)
        continue;
      if (ny < 0 || ny >= N)
        continue;
      ctx.beginPath();
      ctx.moveTo(x2 * squareSize + halfSize, y2 * squareSize + halfSize);
      ctx.lineTo(nx * squareSize + halfSize, ny * squareSize + halfSize);
      ctx.stroke();
      lines.push([x2, y2, nx, ny]);
      visit(nx, ny);
    }
  };
  const x = Math.floor(rng() * N);
  const y = Math.floor(rng() * N);
  visit(x, y);
}
export {
  draw
};
