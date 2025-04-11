// prepare/167-tiles-of-lisbon.js
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  function randomGenerator(seed2) {
    let s = seed2.reduce((acc, val) => acc * 31 + val >>> 0, 1);
    return function() {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }
  function lightenColor(hex, amt) {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) + amt;
    let g = (num >> 8 & 255) + amt;
    let b = (num & 255) + amt;
    if (r > 255)
      r = 255;
    if (g > 255)
      g = 255;
    if (b > 255)
      b = 255;
    return "#" + (r << 16 | g << 8 | b).toString(16).padStart(6, "0");
  }
  function randomBlue(rng) {
    const palette = ["#002f6c", "#003366", "#004c99", "#0066cc", "#0099ff", "#33aaff", "#66ccff"];
    return palette[Math.floor(rng() * palette.length)];
  }
  function createRadialBlueGradient(ctx2, x, y, radius, colorIn, colorOut) {
    const grad = ctx2.createRadialGradient(x, y, radius * 0.05, x, y, radius);
    grad.addColorStop(0, colorIn);
    grad.addColorStop(1, colorOut);
    return grad;
  }
  function drawCenterRosette(ctx2, cx, cy, size, rng, colorIn, colorOut) {
    ctx2.save();
    ctx2.translate(cx, cy);
    const possibleCounts = [6, 8, 10];
    const petalCount = possibleCounts[Math.floor(rng() * possibleCounts.length)];
    const doAlternate = rng() < 0.5;
    const secondRing = rng() < 0.4;
    function drawPetalRing(pCount, ringSize, ringShift) {
      for (let i = 0;i < pCount; i++) {
        ctx2.rotate(2 * Math.PI / pCount);
        const grad = createRadialBlueGradient(ctx2, 0, -ringSize * 0.25, ringSize * 0.5, colorIn, colorOut);
        ctx2.beginPath();
        ctx2.fillStyle = grad;
        let ext = 0.2 + rng() * 0.15;
        if (doAlternate && i % 2 === 0) {
          ext += 0.1;
        }
        ext += ringShift;
        ctx2.moveTo(0, -ringSize * 0.25);
        ctx2.bezierCurveTo(ringSize * 0.1, -ringSize * (0.3 + ext), ringSize * 0.25, -ringSize * (0.1 + rng() * 0.1), 0, 0);
        ctx2.fill();
      }
    }
    if (secondRing) {
      drawPetalRing(petalCount, size * 0.8, -0.05);
      ctx2.rotate(Math.PI / petalCount);
    }
    drawPetalRing(petalCount, size, 0);
    ctx2.beginPath();
    ctx2.fillStyle = colorOut;
    ctx2.arc(0, 0, size * 0.06, 0, 2 * Math.PI);
    ctx2.fill();
    ctx2.restore();
  }
  function drawSideScroll(ctx2, size, rng, strokeColor, lineWidth) {
    ctx2.beginPath();
    ctx2.lineWidth = lineWidth;
    ctx2.strokeStyle = strokeColor;
    ctx2.moveTo(0, 0);
    const segments = 3 + Math.floor(rng() * 3);
    const segW = size / segments;
    let xPos = 0;
    for (let i = 0;i < segments; i++) {
      const xEnd = (i + 1) * segW;
      const cp1x = xPos + rng() * (segW * 0.5);
      const cp1y = (rng() - 0.5) * (size * 0.3);
      const cp2x = xEnd - rng() * (segW * 0.5);
      const cp2y = (rng() - 0.5) * (size * 0.3);
      ctx2.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, xEnd, 0);
      xPos = xEnd;
    }
    ctx2.stroke();
    const swirlCount = 2 + Math.floor(rng() * 3);
    for (let i = 0;i < swirlCount; i++) {
      ctx2.save();
      ctx2.translate(rng() * size, 0);
      ctx2.beginPath();
      ctx2.lineWidth = 1 + rng() * 2;
      ctx2.strokeStyle = strokeColor;
      const swirlSz = size * (0.12 + rng() * 0.08);
      ctx2.moveTo(0, 0);
      ctx2.bezierCurveTo(swirlSz * 0.3, swirlSz * 0.3, swirlSz * 0.6, -swirlSz * 0.2, swirlSz, 0);
      ctx2.stroke();
      ctx2.restore();
    }
  }
  function drawCornerFloral(ctx2, size, rng, gradIn, gradOut, swirlColor, swirlWidth) {
    ctx2.save();
    ctx2.beginPath();
    ctx2.lineWidth = swirlWidth;
    ctx2.strokeStyle = swirlColor;
    const cp1x = size * (0.25 + rng() * 0.15);
    const cp1y = size * (0.2 + rng() * 0.2);
    const cp2x = size * (0.2 + rng() * 0.2);
    const cp2y = size * (0.4 + rng() * 0.2);
    ctx2.moveTo(0, 0);
    ctx2.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, 0, size * 0.4);
    ctx2.stroke();
    const petalCount = 3 + Math.floor(rng() * 3);
    for (let i = 0;i < petalCount; i++) {
      ctx2.save();
      const angle = i * Math.PI / (petalCount + 1) - Math.PI / 4;
      ctx2.rotate(angle);
      const grad = createRadialBlueGradient(ctx2, 0, -size * 0.15, size * 0.4, gradIn, gradOut);
      ctx2.beginPath();
      ctx2.fillStyle = grad;
      ctx2.moveTo(0, 0);
      ctx2.bezierCurveTo(size * (0.1 + rng() * 0.1), -size * (0.3 + rng() * 0.1), size * (0.3 + rng() * 0.1), -size * (0.1 + rng() * 0.1), 0, 0);
      ctx2.fill();
      ctx2.restore();
    }
    const dotCount = 2 + Math.floor(rng() * 3);
    const ringRadius = size * (0.18 + rng() * 0.1);
    ctx2.fillStyle = gradOut;
    for (let i = 0;i < dotCount; i++) {
      ctx2.save();
      const angle = 2 * Math.PI / dotCount * i - Math.PI / 2;
      ctx2.rotate(angle);
      ctx2.translate(0, -ringRadius);
      ctx2.beginPath();
      if (rng() < 0.5) {
        const rad = size * 0.03 + rng() * (size * 0.02);
        ctx2.arc(0, 0, rad, 0, 2 * Math.PI);
      } else {
        ctx2.moveTo(0, 0);
        ctx2.quadraticCurveTo(size * 0.02, -size * 0.02, 0, -size * 0.04);
        ctx2.quadraticCurveTo(-size * 0.02, -size * 0.02, 0, 0);
      }
      ctx2.fill();
      ctx2.restore();
    }
    ctx2.restore();
  }
  function drawQuadBorder(ctx2, size, rng, strokeColor, swirlColor, lineW, cornerGradIn, cornerGradOut) {
    for (let i = 0;i < 4; i++) {
      ctx2.save();
      if (i === 1) {
        ctx2.translate(size, 0);
        ctx2.rotate(Math.PI / 2);
      } else if (i === 2) {
        ctx2.translate(size, size);
        ctx2.rotate(Math.PI);
      } else if (i === 3) {
        ctx2.translate(0, size);
        ctx2.rotate(-Math.PI / 2);
      }
      drawSideScroll(ctx2, size, rng, strokeColor, lineW);
      ctx2.restore();
    }
    for (let i = 0;i < 4; i++) {
      ctx2.save();
      if (i === 1) {
        ctx2.translate(size, 0);
        ctx2.rotate(Math.PI / 2);
      } else if (i === 2) {
        ctx2.translate(size, size);
        ctx2.rotate(Math.PI);
      } else if (i === 3) {
        ctx2.translate(0, size);
        ctx2.rotate(-Math.PI / 2);
      }
      drawCornerFloral(ctx2, size, rng, cornerGradIn, cornerGradOut, swirlColor, 1 + rng() * 2);
      ctx2.restore();
    }
  }
  function drawTile(ctx2, size, seed2) {
    const rng = randomGenerator(seed2);
    const base = randomBlue(rng);
    const baseLight = lightenColor(base, 70);
    const baseDark = lightenColor(base, -40);
    ctx2.fillStyle = "#ffffff";
    ctx2.fillRect(0, 0, size, size);
    drawQuadBorder(ctx2, size, rng, baseDark, base, 2 + rng() * 3, baseLight, base);
    drawCenterRosette(ctx2, size * 0.5, size * 0.5, size * 0.45, rng, baseLight, base);
  }
  function draw2(ctx2, seed2) {
    drawTile(ctx2, 100, seed2);
  }
  draw2(ctx, seed);
}
export {
  draw
};
