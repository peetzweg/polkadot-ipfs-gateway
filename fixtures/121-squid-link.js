// prepare/121-squid-link.js
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
  const rng = randomGenerator(seed);
  function randomNumber(bits2) {
    let num = 0;
    for (let i = 0;i < bits2; i++) {
      num *= 2;
      num += rng();
    }
    return num / Math.pow(2, bits2);
  }
  function randomSign() {
    return rng() ? -1 : 1;
  }
  const startX = 50 + randomNumber(4) * 15 * randomSign();
  const startY = 50 + randomNumber(4) * 15 * randomSign();
  const startAngle = randomNumber(3) * Math.PI * 2;
  function drawSnake(startX2, startY2, startAngle2) {
    let x = startX2;
    let y = startY2;
    let angle = startAngle2;
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.moveTo(x, y);
    for (let i = 0;i < 5; i++) {
      const distance = (randomNumber(5) * 10 + 3) / 2;
      const newAngle = angle + (randomNumber(5) - 0.5) * Math.PI * 1.6;
      const cX = x + Math.cos(angle) * distance;
      const cY = y + Math.sin(angle) * distance;
      const r = Math.abs(distance * Math.tan((Math.PI + newAngle - angle) / 2));
      const endX = cX + Math.cos(newAngle) * distance;
      const endY = cY + Math.sin(newAngle) * distance;
      ctx.arcTo(cX, cY, endX, endY, r);
      x = endX;
      y = endY;
      angle = newAngle;
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  function drawSnakes(snakeCount) {
    for (let i = 0;i < snakeCount; i++) {
      const angle = startAngle + Math.PI * 2 / snakeCount * i;
      drawSnake(startX, startY, angle);
    }
  }
  drawSnakes(4);
  ctx.beginPath();
  ctx.fillStyle = "red";
  ctx.lineWidth = 2;
  ctx.arc(startX, startY, 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
}
export {
  draw
};
