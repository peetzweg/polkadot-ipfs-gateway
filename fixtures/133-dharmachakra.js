// prepare/133-dharmachakra.js
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
  function draw2(ctx2, seed2) {
    ctx2.translate(5, 5);
    ctx2.scale(100, 100);
    const rng = randomGenerator(seed2);
    console.log(rng);
    ctx2.translate(0.45, 0.45);
    const wheelSize = 0.42;
    const baseWeight = 0.008 + seed2[0] % 10 / 1200;
    const mainLineWeight = baseWeight + rng() * 0.001;
    const circleCount = 2;
    for (let i = 0;i < circleCount; i++) {
      const weightMultiplier = 1 - i * 0.15;
      ctx2.lineWidth = mainLineWeight * weightMultiplier;
      const spacingFactor = 0.04;
      const radius = wheelSize - i * wheelSize * spacingFactor;
      ctx2.beginPath();
      ctx2.arc(0, 0, radius, 0, Math.PI * 2);
      ctx2.stroke();
    }
    const spokeCount = 6 + seed2[0] % 5 * 2;
    const centerSize = wheelSize * 0.5;
    const innerRadius = wheelSize * (0.3 + rng() * 0.1);
    const outerRadius = wheelSize - wheelSize * 0.06;
    const spokeStyle = seed2[1] % 4;
    for (let i = 0;i < spokeCount; i++) {
      ctx2.save();
      ctx2.rotate(i * Math.PI * 2 / spokeCount);
      switch (spokeStyle) {
        case 0:
          ctx2.beginPath();
          ctx2.moveTo(0, -innerRadius);
          ctx2.lineTo(0, -outerRadius);
          ctx2.stroke();
          break;
        case 1:
          ctx2.beginPath();
          ctx2.moveTo(-mainLineWeight * 2, -innerRadius);
          ctx2.lineTo(-mainLineWeight * 2, -outerRadius);
          ctx2.moveTo(mainLineWeight * 2, -innerRadius);
          ctx2.lineTo(mainLineWeight * 2, -outerRadius);
          ctx2.stroke();
          break;
        case 2:
          ctx2.beginPath();
          ctx2.moveTo(0, -innerRadius);
          ctx2.quadraticCurveTo(mainLineWeight * 4, -(innerRadius + outerRadius) / 2, 0, -outerRadius);
          ctx2.stroke();
          break;
        case 3:
          const dotCount = 8;
          const dotSpacing = (outerRadius - innerRadius) / dotCount;
          for (let j = 0;j < dotCount; j++) {
            ctx2.beginPath();
            ctx2.arc(0, -innerRadius - j * dotSpacing, mainLineWeight, 0, Math.PI * 2);
            ctx2.fill();
          }
          break;
      }
      if (seed2[2] % 2 === 0) {
        ctx2.beginPath();
        ctx2.arc(0, -outerRadius, mainLineWeight * 1.5, 0, Math.PI * 2);
        if (seed2[3] % 2 === 0) {
          ctx2.fill();
        } else {
          ctx2.stroke();
        }
      }
      ctx2.restore();
    }
    const centerPattern = Math.floor(rng() * 1000) % 12;
    switch (centerPattern) {
      case 0:
        const petalCount = 6;
        for (let i = 0;i < petalCount; i++) {
          ctx2.save();
          ctx2.rotate(i * Math.PI * 2 / petalCount);
          ctx2.beginPath();
          ctx2.arc(centerSize * 0.2, 0, centerSize * 0.3, -Math.PI * 0.7, Math.PI * 0.7);
          ctx2.stroke();
          if (seed2[1] % 2 === 0) {
            ctx2.beginPath();
            ctx2.arc(centerSize * 0.15, 0, centerSize * 0.2, -Math.PI * 0.6, Math.PI * 0.6);
            ctx2.stroke();
          }
          ctx2.restore();
        }
        break;
      case 1:
        const bloomPetals = 5;
        for (let i = 0;i < bloomPetals; i++) {
          ctx2.save();
          ctx2.rotate(i * Math.PI * 2 / bloomPetals);
          ctx2.beginPath();
          ctx2.moveTo(0, 0);
          ctx2.quadraticCurveTo(centerSize * 0.3, -centerSize * 0.2, 0, -centerSize * 0.45);
          ctx2.quadraticCurveTo(-centerSize * 0.3, -centerSize * 0.2, 0, 0);
          ctx2.stroke();
          ctx2.restore();
        }
        break;
      case 2:
        const layerCount = 3;
        const petalPerLayer = 8;
        for (let layer = 0;layer < layerCount; layer++) {
          for (let i = 0;i < petalPerLayer; i++) {
            ctx2.save();
            ctx2.rotate(i * Math.PI * 2 / petalPerLayer + layer * Math.PI / petalPerLayer);
            ctx2.beginPath();
            const length = centerSize * (0.2 + layer * 0.15);
            ctx2.moveTo(0, 0);
            ctx2.quadraticCurveTo(length * 0.5, -length * 0.1, length, 0);
            ctx2.stroke();
            ctx2.restore();
          }
        }
        break;
      case 3:
        for (let i = 0;i < 6; i++) {
          ctx2.save();
          ctx2.rotate(i * Math.PI / 3);
          ctx2.beginPath();
          ctx2.arc(centerSize * 0.15, 0, centerSize * 0.25, 0, Math.PI * 1.5);
          ctx2.stroke();
          ctx2.restore();
        }
        break;
      case 4:
        const daisyPetals = 7;
        for (let i = 0;i < daisyPetals; i++) {
          ctx2.save();
          ctx2.rotate(i * Math.PI * 2 / daisyPetals);
          ctx2.beginPath();
          ctx2.ellipse(0, -centerSize * 0.25, centerSize * 0.1, centerSize * 0.25, 0, 0, Math.PI * 2);
          ctx2.stroke();
          ctx2.restore();
        }
        break;
      case 5:
        for (let i = 0;i < 4; i++) {
          ctx2.save();
          ctx2.rotate(i * Math.PI / 2);
          ctx2.beginPath();
          ctx2.moveTo(0, 0);
          ctx2.bezierCurveTo(centerSize * 0.2, -centerSize * 0.1, centerSize * 0.2, -centerSize * 0.3, 0, -centerSize * 0.4);
          ctx2.bezierCurveTo(-centerSize * 0.2, -centerSize * 0.3, -centerSize * 0.2, -centerSize * 0.1, 0, 0);
          ctx2.stroke();
          ctx2.restore();
        }
        break;
      case 6:
        const mandalaLayers = 2;
        for (let layer = 0;layer < mandalaLayers; layer++) {
          const petals = 6 + layer * 2;
          for (let i = 0;i < petals; i++) {
            ctx2.save();
            ctx2.rotate(i * Math.PI * 2 / petals);
            ctx2.beginPath();
            ctx2.arc(0, -centerSize * (0.2 + layer * 0.15), centerSize * 0.15, 0, Math.PI);
            ctx2.stroke();
            ctx2.restore();
          }
        }
        break;
      case 7:
        const rosePoints = 5;
        for (let i = 0;i < rosePoints; i++) {
          ctx2.save();
          ctx2.rotate(i * Math.PI * 2 / rosePoints);
          ctx2.beginPath();
          ctx2.arc(centerSize * 0.25, 0, centerSize * 0.25, -Math.PI * 0.5, Math.PI * 0.5);
          ctx2.stroke();
          ctx2.beginPath();
          ctx2.arc(centerSize * 0.15, 0, centerSize * 0.15, -Math.PI * 0.4, Math.PI * 0.4);
          ctx2.stroke();
          ctx2.restore();
        }
        break;
      case 8:
        for (let i = 0;i < circleCount; i++) {
          ctx2.save();
          ctx2.rotate(i * Math.PI / circleCount);
          ctx2.beginPath();
          ctx2.ellipse(0, 0, centerSize * 0.3, centerSize * 0.15, 0, 0, Math.PI * 2);
          ctx2.stroke();
          ctx2.restore();
        }
        break;
      case 9:
        for (let i = 0;i < 6; i++) {
          ctx2.save();
          ctx2.rotate(i * Math.PI / 3);
          ctx2.beginPath();
          ctx2.rect(-centerSize * 0.15, -centerSize * 0.15, centerSize * 0.3, centerSize * 0.3);
          ctx2.stroke();
          ctx2.restore();
        }
        break;
      case 10:
        ctx2.beginPath();
        for (let i = 0;i < 360; i += 30) {
          const angle = i * Math.PI / 180;
          const radius = i / 360 * centerSize * 0.4;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          i === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
        }
        ctx2.stroke();
        break;
    }
    const centerStyle = rng();
    if (centerStyle < 0.3) {
      ctx2.beginPath();
      ctx2.arc(0, 0, centerSize * 0.1, 0, Math.PI * 2);
      ctx2.fill();
    } else if (centerStyle < 0.6) {
      for (let i = 0;i < 3; i++) {
        ctx2.beginPath();
        ctx2.arc(0, 0, centerSize * (0.08 + i * 0.04), 0, Math.PI * 2);
        ctx2.stroke();
      }
    } else if (centerStyle < 0.8) {
      for (let i = 0;i < 5; i++) {
        ctx2.save();
        ctx2.rotate(i * Math.PI * 2 / 5);
        ctx2.beginPath();
        ctx2.arc(centerSize * 0.08, 0, centerSize * 0.05, 0, Math.PI * 2);
        ctx2.stroke();
        ctx2.restore();
      }
    } else {
      ctx2.beginPath();
      ctx2.moveTo(-centerSize * 0.1, 0);
      ctx2.lineTo(centerSize * 0.1, 0);
      ctx2.moveTo(0, -centerSize * 0.1);
      ctx2.lineTo(0, centerSize * 0.1);
      ctx2.stroke();
    }
  }
  draw2(ctx, seed);
}
export {
  draw
};
