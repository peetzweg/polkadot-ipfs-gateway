// prepare/189-graphy.js
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
  ctx.translate(50, 50);
  const rand = randomGenerator(seed);
  const centerFilled = bit(seed, 0) === 1;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  if (centerFilled) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
  ctx.closePath();
  const minDots = 12;
  const maxDots = 24;
  const dotCount = minDots + Math.floor(rand() * (maxDots - minDots + 1));
  const angleStep = Math.PI * 2 / dotCount;
  const fixedRadius = 40;
  const centerRadius = 8;
  const dots = [];
  for (let i = 0;i < dotCount; i++) {
    const angle = Math.PI / 2 + i * angleStep;
    const maxSize = Math.min(fixedRadius * Math.sin(angleStep / 2), 4);
    const size = Math.min(2 + Math.floor(rand() * 3), Math.max(2, Math.floor(maxSize)));
    const x = Math.cos(angle) * fixedRadius;
    const y = Math.sin(angle) * fixedRadius;
    const lineStyle = rand();
    dots.push({ x, y, size, isFilled: rand() > 0.5, lineStyle, angle });
  }
  for (const dot of dots) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
    if (dot.isFilled) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
    ctx.closePath();
  }
  for (const dot of dots) {
    const startX = Math.cos(dot.angle) * centerRadius;
    const startY = Math.sin(dot.angle) * centerRadius;
    const edgeX = Math.cos(dot.angle) * (fixedRadius - dot.size);
    const edgeY = Math.sin(dot.angle) * (fixedRadius - dot.size);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(edgeX, edgeY);
    if (dot.lineStyle < 0.5) {
      ctx.setLineDash([2, 2]);
    } else {
      ctx.setLineDash([5, 3]);
    }
    ctx.stroke();
    ctx.closePath();
  }
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
}
export {
  draw
};
