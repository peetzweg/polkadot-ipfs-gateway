// prepare/104-waves-2.js
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
  const centerX = 50;
  const centerY = 50;
  const radius = 45;
  let waveCount = Math.floor(rand() * 3) + 3;
  let baseAmplitude = rand() * 12 + 6;
  let baseFrequency = rand() * 2 + 1;
  let basePhase = rand() * Math.PI * 2;
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 100, 100);
  let waves = [];
  for (let wave = 0;wave < waveCount; wave++) {
    let amp = baseAmplitude * (0.5 + rand() * 1.5);
    let freq = baseFrequency * (0.8 + 0.4 * rand());
    let phase = basePhase + rand() * Math.PI * 2;
    let vOffset = centerY + (wave / (waveCount - 1) - 0.5) * (radius - baseAmplitude);
    let minThickness = 0.8;
    let maxThickness = 3;
    let thicknessModFreq = 0.5 + rand() * 1.5;
    let samples = 500;
    let points = [];
    for (let i = 0;i <= samples; i++) {
      let x = centerX - radius + i / samples * (radius * 2);
      let relX = i / samples * 2 - 1;
      if (Math.abs(x - centerX) <= radius) {
        let circleBoundary = Math.sqrt(radius * radius - (x - centerX) * (x - centerX));
        let maxAmp = circleBoundary * 0.9;
        let ampEnvelope = Math.sin(relX * Math.PI);
        let y = vOffset + amp * ampEnvelope * Math.sin(phase + relX * freq * Math.PI);
        let waveHeight = Math.max(-maxAmp, Math.min(maxAmp, y - vOffset));
        y = vOffset + waveHeight;
        y = Math.max(centerY - circleBoundary, Math.min(centerY + circleBoundary, y));
        let thickness = minThickness + (maxThickness - minThickness) * (0.5 + 0.5 * Math.sin(relX * thicknessModFreq * 2 * Math.PI + rand()));
        points.push({ x, y, thickness });
      }
    }
    waves.push({
      points,
      startY: points[0].y,
      endY: points[points.length - 1].y,
      vOffset
    });
  }
  for (let wave of waves) {
    ctx.strokeStyle = "black";
    for (let i = 0;i < wave.points.length - 1; i++) {
      ctx.lineWidth = (wave.points[i].thickness + wave.points[i + 1].thickness) / 2;
      ctx.beginPath();
      ctx.moveTo(wave.points[i].x, wave.points[i].y);
      ctx.lineTo(wave.points[i + 1].x, wave.points[i + 1].y);
      ctx.stroke();
    }
  }
  waves.sort((a, b) => a.vOffset - b.vOffset);
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  for (let i = 0;i < waves.length; i++) {
    if (i === waves.length - 1)
      continue;
    let startY = waves[i].startY;
    let endY = waves[i].endY;
    let startAngle = Math.asin((centerY - startY) / radius);
    let endAngle = Math.asin((centerY - endY) / radius);
    if (startY < centerY)
      startAngle = Math.PI - startAngle;
    else
      startAngle = -startAngle;
    if (endY < centerY)
      endAngle = Math.PI - endAngle;
    else
      endAngle = -endAngle;
    endAngle += Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle, false);
    ctx.stroke();
  }
}
export {
  draw
};
