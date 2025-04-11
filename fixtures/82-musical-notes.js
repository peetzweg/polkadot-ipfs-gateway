// prepare/82-musical-notes.js
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
  const colors = [
    "#FF3366",
    "#FF6633",
    "#FFCC33",
    "#33FF66",
    "#33FFCC",
    "#3366FF",
    "#6633FF",
    "#CC33FF",
    "#FF33CC",
    "#FF3333",
    "#FF9933",
    "#FFFF33",
    "#33FF33",
    "#33FFFF",
    "#3333FF",
    "#9933FF",
    "#FF33FF",
    "#FF3399",
    "#FF6666",
    "#FFB366"
  ];
  const compositions = [
    { name: "enso", radius: 25 },
    { name: "burst", rays: 8 },
    { name: "flow", curves: 3 },
    { name: "score", lines: 5, spacing: 8 },
    { name: "wind", waves: 5 }
  ];
  function drawNote(ctx2, x, y, size, color, rotation, style) {
    if (x < size * 2 || x > 100 - size * 2 || y < size * 2 || y > 100 - size * 2) {
      return;
    }
    ctx2.save();
    ctx2.translate(x, y);
    ctx2.rotate(rotation);
    ctx2.fillStyle = color;
    ctx2.strokeStyle = "#000";
    ctx2.lineWidth = size * 0.25;
    if (style === "bold") {
      ctx2.beginPath();
      ctx2.ellipse(0, 0, size * 0.8, size * 0.6, 0, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(size * 0.8, 0);
      ctx2.lineTo(size * 0.6, -size * 2.5);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(size * 0.6, -size * 2.5);
      ctx2.bezierCurveTo(size * 1.5, -size * 4, size * 1.5, -size * 1.8, size * 0.6, -size * 1.5);
      ctx2.stroke();
    } else {
      ctx2.beginPath();
      ctx2.arc(0, 0, size * 0.7, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(size * 0.7, -size * 0.2);
      ctx2.lineTo(size * 0.5, -size * 2.2);
      ctx2.stroke();
    }
    ctx2.restore();
  }
  function draw2(ctx2, seed2) {
    ctx2.fillStyle = "#FFFAF5";
    ctx2.fillRect(0, 0, 100, 100);
    const random = randomGenerator(seed2);
    const compositionIndex = Math.floor(random() * compositions.length);
    const composition = compositions[compositionIndex];
    const noteCount = 6 + Math.floor(random() * 4);
    const noteSize = 6;
    const padding = noteSize * 3;
    switch (composition.name) {
      case "enso":
        for (let i = 0;i < noteCount; i++) {
          const angle = i * 2 * Math.PI / noteCount;
          const radius = composition.radius;
          const x = 50 + radius * Math.cos(angle);
          const y = 50 + radius * Math.sin(angle);
          const colorIndex = Math.floor(random() * colors.length);
          const rotation = angle + (random() * 0.4 - 0.2);
          drawNote(ctx2, x, y, noteSize, colors[colorIndex], rotation, "bold");
        }
        break;
      case "burst":
        for (let i = 0;i < composition.rays; i++) {
          const angle = i * 2 * Math.PI / composition.rays;
          const x = 50 + 20 * Math.cos(angle);
          const y = 50 + 20 * Math.sin(angle);
          const colorIndex = Math.floor(random() * colors.length);
          const rotation = angle + Math.PI / 4;
          drawNote(ctx2, x, y, noteSize, colors[colorIndex], rotation, "bold");
        }
        break;
      case "flow":
        for (let i = 0;i < noteCount; i++) {
          const t = i / (noteCount - 1);
          const x = padding + (100 - 2 * padding) * t;
          const y = 50 + Math.sin(t * composition.curves * Math.PI) * 15;
          const colorIndex = Math.floor(random() * colors.length);
          const rotation = Math.cos(t * composition.curves * Math.PI) * 0.5;
          drawNote(ctx2, x, y, noteSize, colors[colorIndex], rotation, "minimal");
        }
        break;
      case "score":
        const staffWidth = 80;
        const startX = (100 - staffWidth) / 2;
        const startY = 30;
        ctx2.strokeStyle = "#666";
        ctx2.lineWidth = 1;
        for (let i = 0;i < composition.lines; i++) {
          const y = startY + i * composition.spacing;
          ctx2.beginPath();
          ctx2.moveTo(startX, y);
          ctx2.lineTo(startX + staffWidth, y);
          ctx2.stroke();
        }
        const minNoteSpacing = 12;
        const availableWidth = staffWidth - 20;
        const maxNotesInRow = Math.floor(availableWidth / minNoteSpacing);
        const actualNoteCount = Math.min(noteCount, maxNotesInRow);
        const actualSpacing = availableWidth / (actualNoteCount - 1);
        const usedPositions = new Set;
        for (let i = 0;i < actualNoteCount; i++) {
          const x = startX + 10 + actualSpacing * i;
          let y;
          let attempt = 0;
          const maxAttempts = 10;
          do {
            const lineIndex = Math.floor(random() * (composition.lines * 2));
            y = startY + lineIndex * composition.spacing / 2;
            attempt++;
          } while (usedPositions.has(`${Math.round(y)}`) && attempt < maxAttempts);
          usedPositions.add(`${Math.round(y)}`);
          const colorIndex = Math.floor(random() * colors.length);
          const rotation = y > startY + composition.lines * composition.spacing / 2 ? Math.PI : 0;
          drawNote(ctx2, x, y, noteSize, colors[colorIndex], rotation, random() > 0.3 ? "bold" : "minimal");
        }
        break;
      case "wind":
        for (let i = 0;i < noteCount; i++) {
          const t = i / (noteCount - 1);
          const x = padding + (100 - 2 * padding) * t;
          const y = 50 + Math.sin(t * composition.waves * Math.PI + random() * Math.PI) * 10;
          const colorIndex = Math.floor(random() * colors.length);
          const rotation = Math.sin(t * composition.waves * Math.PI) * 0.3;
          drawNote(ctx2, x, y, noteSize, colors[colorIndex], rotation, "minimal");
        }
        break;
    }
  }
  draw2(ctx, seed);
}
export {
  draw
};
