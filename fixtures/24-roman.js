// prepare/24-roman.js
function getByte(seed, index) {
  return seed[index % seed.length];
}
function split(seed, parts) {
  const r = [];
  let last = 0;
  for (let i = 0;i < parts; ++i) {
    const next = Math.round((i + 1) * 32 / parts);
    r.push(bits(seed, last, next));
    last = next;
  }
  return r;
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
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  function roman(n) {
    let d = [
      "M",
      1000,
      "CM",
      900,
      "D",
      500,
      "CD",
      400,
      "C",
      100,
      "XC",
      90,
      "L",
      50,
      "XL",
      40,
      "X",
      10,
      "IX",
      9,
      "V",
      5,
      "IV",
      4,
      `I`,
      1
    ];
    let result = "";
    for (let i = 0;i < d.length; i += 2) {
      let l = d[i];
      let q = d[i + 1];
      while (n >= q) {
        n -= q;
        result += l;
      }
    }
    return result;
  }
  let size = 100;
  let numbers = split(seed, 3);
  ctx.strokeStyle = "";
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.font = size / 3 + "px serif";
  for (let i = 0;i < 3; ++i) {
    ctx.fillText(roman(numbers[i]), size / 2, size / 3 * (i + 1), size);
  }
}
export {
  draw
};
