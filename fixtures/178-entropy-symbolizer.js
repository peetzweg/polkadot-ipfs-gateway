// prepare/178-entropy-symbolizer.js
function getByte(seed, index) {
  return seed[index % seed.length];
}
function numeric(seed) {
  if (seed.length > 64)
    throw "Seed too long to safely convert to a bigint";
  let result = 0n;
  for (let i = 0;i < seed.length; i++)
    result = result << 8n | BigInt(getByte(seed, i));
  return result;
}
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  const value = numeric(seed);
  const threeBitParts = [];
  for (let i = 0;i < 11; i++) {
    threeBitParts.push(7n & value >> BigInt(i) * 3n);
  }
  const length = (x, y) => Math.sqrt(x * x + y * y);
  const translate = (sdf, dx, dy) => (x, y) => sdf(x - dx, y - dy);
  const rotate = (sdf, angle) => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return (x, y) => sdf(x * cos - y * sin, x * sin + y * cos);
  };
  const union = (sdfs) => (x, y) => Math.min.apply(null, sdfs.map((sdf) => sdf(x, y)));
  const intersection = (sdfs) => (x, y) => Math.max.apply(null, sdfs.map((sdf) => sdf(x, y)));
  const subtract = (adds, subs) => (x, y) => Math.max.apply(null, adds.map((sdf) => sdf(x, y)).concat(subs.map((sdf) => -1 * sdf(x, y))));
  const circle = (r) => (x, y) => Math.sqrt(x * x + y * y) - r;
  const rectangle = (w, h) => (x, y) => {
    const dx = Math.abs(x) - w / 2;
    const dy = Math.abs(y) - h / 2;
    return Math.min(Math.max(dx, dy), 0) + length(Math.max(dx, 0), Math.max(dy, 0));
  };
  const triangle = (r) => (x1, y1) => {
    const k = Math.sqrt(3);
    let x = Math.abs(x1);
    let y = y1;
    x -= 0.5 * Math.max(x + k * y, 0);
    y -= 0.5 * k * Math.max(Math.abs(x1) + k * y, 0);
    x -= Math.max(-r, Math.min(r, x));
    y = -y - r * (1 / k);
    return length(x, y) * Math.sign(y);
  };
  const moon = (r) => subtract([circle(r)], [translate(circle(r * 0.8), r * 0.3, 0)]);
  const ring = (r) => subtract([circle(r)], [circle(r * 0.75)]);
  const box = (r) => subtract([rectangle(r, r)], [rectangle(r * 0.8, r * 0.8)]);
  const burger = (r) => union([
    rectangle(r, r * 0.125),
    translate(rectangle(r, r * 0.125), 0, r * -0.35),
    translate(rectangle(r, r * 0.125), 0, r * 0.35)
  ]);
  const cross = (r) => union([
    rotate(rectangle(r * 1.25, r * 0.125), Math.PI / 4),
    rotate(rectangle(r * 1.25, r * 0.125), -Math.PI / 4)
  ]);
  const check = (r) => union([
    translate(rotate(rectangle(r * 1, r * 0.125), Math.PI / 3.5), r * 0.2, 0),
    translate(rotate(rectangle(r * 0.5, r * 0.125), -Math.PI / 3.5), -r * 0.25, r * 0.25)
  ]);
  const emptyTriangle = (r) => translate(rotate(subtract([triangle(r)], [triangle(r * 0.75)]), Math.PI), 0, r * 0.25);
  const shapes = [
    circle(2),
    emptyTriangle(11),
    moon(10),
    ring(10),
    check(20),
    cross(20),
    box(18),
    burger(20)
  ];
  const world = union([
    translate(subtract([rectangle(100, 20)], [
      translate(rotate(rectangle(10, 40), -Math.PI / 6), -12, 0),
      translate(subtract([circle(17)], [
        translate(rotate(rectangle(30, 40), -Math.PI / 6), -17, 0)
      ]), 8, -5)
    ]), 0, -43),
    ...threeBitParts.map((num, i) => translate(shapes[num], -50 + 12 + 25 * (i % 4), -26 + 10 + 26 * Math.floor(i / 4)))
  ]);
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const imageData = ctx.createImageData(width, height);
  for (let y = 0;y < width; y++) {
    for (let x = 0;x < width; x++) {
      let d = world(100 / width * (x - width / 2), 100 / height * (y - width / 2));
      if (d <= 0) {
        imageData.data[4 * (y * width + x)] = 0;
        imageData.data[4 * (y * width + x) + 3] = 255;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
export {
  draw
};
