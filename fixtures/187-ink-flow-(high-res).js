// prepare/187-ink-flow-(high-res).js
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
  const rand = randomGenerator(seed);
  const vectors = new Array(10).fill(0).map(() => new Array(10).fill(0).map(() => ({ x: 0, y: 0 })));
  const applyWeather = (position, direction, radius, intensity) => {
    for (let i = 0;i < vectors.length; i++) {
      for (let j = 0;j < vectors.length; j++) {
        const vec = {
          x: i * 10 + 5 - position.x,
          y: j * 10 - position.y
        };
        if (vec.x === 0 && vec.y === 0)
          continue;
        const distance = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
        const angle = Math.atan2(vec.y, vec.x);
        const rotation = angle + (direction ? 1 : -1) * Math.PI / 2;
        const factor = intensity * Math.max(0, (radius - distance) / radius);
        vectors[i][j].x += factor * Math.cos(rotation);
        vectors[i][j].y += factor * Math.sin(rotation);
      }
    }
  };
  for (let i = 0;i < vectors.length; i++) {
    for (let j = 0;j < vectors.length; j++) {
      const pos = { x: i * 10 + 5, y: j * 10 };
      const vec = {
        x: pos.x - 50,
        y: pos.y - 50
      };
      if (vec.x === 0 && vec.y === 0)
        continue;
      const angle = Math.atan2(vec.y, vec.x);
      const rotation = angle - Math.PI;
      const distanceToEdge = Math.min(100 - pos.x, 100 - pos.y, pos.x, pos.y);
      const factor = 0.3 * Math.sqrt(seed.length) * Math.max(0, (25 - distanceToEdge) / 25);
      vectors[i][j].x += factor * Math.cos(rotation);
      vectors[i][j].y += factor * Math.sin(rotation);
    }
  }
  seed.forEach((s) => {
    s = s + Math.floor(rand() * 255) & 255;
    const direction = s >> 2 & 1;
    const radius = 20 + 20 * (s >> 3 & 3);
    const intensity = 1 + (s >> 6);
    const position = {
      x: (Math.floor(s / 16) + 0.5) * (100 / 16),
      y: (s % 16 + 0.5) * (100 / 16)
    };
    applyWeather(position, direction, radius, intensity);
  });
  const getNextPoint = (pos) => {
    const i = (pos.x - 5) / 10;
    const j = (pos.y - 5) / 10;
    const applyWeight = (pi, pj) => {
      if (!vectors[pi]?.[pj])
        return { x: 0, y: 0 };
      const di = pi - i;
      const dj = pj - j;
      const distance = Math.sqrt(di * di + dj * dj);
      const weight = Math.max(0, 1 - distance);
      return { x: vectors[pi][pj].x * weight, y: vectors[pi][pj].y * weight };
    };
    const fi = Math.floor(i);
    const fj = Math.floor(j);
    const result = [
      applyWeight(fi, fj),
      applyWeight(fi + 1, fj),
      applyWeight(fi, fj + 1),
      applyWeight(fi + 1, fj + 1)
    ].reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }));
    const resultLength = Math.sqrt(result.x * result.x + result.y * result.y);
    return {
      x: pos.x + result.x / resultLength,
      y: pos.y + result.y / resultLength
    };
  };
  ctx.lineCap = "round";
  for (let i = 0;i < 50; i++) {
    const v = seed[(i + 4) % seed.length] + Math.floor(255 * rand()) & 255;
    const r = (v & 15) / 16 * 2 * Math.PI;
    const d = (v >> 4) / 16 * 50;
    let position = { x: 40 + Math.cos(r) * d, y: 40 + Math.sin(r) * d };
    for (let k = 0;k < 150; k++) {
      ctx.beginPath();
      ctx.moveTo(position.x, position.y);
      position = getNextPoint(position);
      ctx.lineTo(position.x, position.y);
      const distanceToEdge = Math.min(100 - position.x, 100 - position.y, position.x, position.y);
      ctx.lineWidth = Math.max(0.0001, 3 * Math.max(0, distanceToEdge / 25) * (1 - Math.abs(8 - k / 3) / 8));
      ctx.stroke();
    }
  }
  const debug = false;
  if (debug) {
    const directions = vectors.map((v) => v.map(({ x, y }) => Math.atan2(x, -y)));
    ctx.lineJoin = "round";
    ctx.lineWidth = 1;
    for (let i = 0;i < directions.length; i++) {
      for (let j = 0;j < directions.length; j++) {
        const rotation = directions[i][j];
        ctx.save();
        ctx.translate(i * 10 + 5, j * 10);
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -5);
        ctx.lineTo(-1, -3);
        ctx.lineTo(1, -3);
        ctx.lineTo(0, -5);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
export {
  draw
};
