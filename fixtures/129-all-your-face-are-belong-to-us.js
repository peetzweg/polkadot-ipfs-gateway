// prepare/129-all-your-face-are-belong-to-us.js
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  ctx.clearRect(0, 0, 100, 100);
  ctx.translate(5, 5);
  const gridSize = 15;
  const cellSize = 100 / gridSize;
  const centerX = Math.floor(gridSize / 2);
  const centerY = Math.floor(gridSize / 2);
  let seedIndex = 0;
  function nextSeed() {
    const val = seed[seedIndex % seed.length];
    seedIndex++;
    return val;
  }
  function applyLighting(baseColor, r, c) {
    const adjustment = Math.floor((centerX - c + (centerY - r)) * 2);
    let newColor = baseColor + adjustment;
    if (newColor < 0)
      newColor = 0;
    if (newColor > 255)
      newColor = 255;
    return newColor;
  }
  const shapeType = nextSeed() % 3;
  const faceSize = Math.floor(gridSize * 0.45);
  function isInFace(r, c) {
    const dx = c - centerX;
    const dy = r - centerY;
    if (shapeType === 0) {
      return dx * dx + dy * dy < faceSize * faceSize;
    } else if (shapeType === 1) {
      return Math.abs(dx) < faceSize && Math.abs(dy) < faceSize;
    } else {
      return Math.abs(dx) + Math.abs(dy) < faceSize;
    }
  }
  const hairStyle = nextSeed() % 3;
  function isHair(r, c) {
    if (hairStyle === 0)
      return false;
    if (isInFace(r, c))
      return false;
    return r < centerY;
  }
  const eyeOffset = nextSeed() % 2 - 1;
  const eyeRow = centerY - 2;
  const leftEyeCol = centerX - 2 + eyeOffset;
  const rightEyeCol = centerX + 2 + eyeOffset;
  function isEye(r, c) {
    return r === eyeRow && (c === leftEyeCol || c === rightEyeCol);
  }
  const noseWidth = nextSeed() % 3;
  const noseRow = centerY;
  function isNose(r, c) {
    if (r === noseRow) {
      return Math.abs(c - centerX) <= noseWidth;
    }
    return false;
  }
  const mouthRow = centerY + 3;
  const mouthWidth = nextSeed() % 3 + 2;
  function isMouth(r, c) {
    if (r === mouthRow) {
      return Math.abs(c - centerX) <= mouthWidth;
    }
    return false;
  }
  const faceColor = 180;
  const hairColor = 60;
  const eyeColor = 0;
  const noseColor = 100;
  const mouthColor = 50;
  for (let r = 0;r < gridSize; r++) {
    for (let c = 0;c < gridSize; c++) {
      let fillVal = -1;
      if (isInFace(r, c)) {
        if (isEye(r, c)) {
          fillVal = eyeColor;
        } else if (isNose(r, c)) {
          fillVal = noseColor;
        } else if (isMouth(r, c)) {
          fillVal = mouthColor;
        } else {
          fillVal = applyLighting(faceColor, r, c);
        }
      } else if (isHair(r, c)) {
        fillVal = applyLighting(hairColor, r, c);
      }
      if (fillVal >= 0) {
        ctx.fillStyle = `rgb(${fillVal}, ${fillVal}, ${fillVal})`;
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }
}
export {
  draw
};
