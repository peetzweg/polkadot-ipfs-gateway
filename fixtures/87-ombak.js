// prepare/87-ombak.js
function draw(ctx, seed) {
  ctx.scale(1 / ctx.canvas.width, 1 / ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 100, ctx.canvas.width / 100);
  let cs, cs2;
  let rand;
  let context;
  const PERLIN_YWRAPB = 4;
  const PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
  const PERLIN_ZWRAPB = 8;
  const PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
  const PERLIN_SIZE = 4095;
  let perlin_octaves = 4;
  let perlin_amp_falloff = 0.5;
  const scaled_cosine = (i) => 0.5 * (1 - Math.cos(i * Math.PI));
  let perlin;
  const noise = function(x, y = 0, z = 0) {
    if (perlin == null) {
      perlin = new Array(PERLIN_SIZE + 1);
      for (let i = 0;i < PERLIN_SIZE + 1; i++) {
        perlin[i] = Math.random();
      }
    }
    if (x < 0) {
      x = -x;
    }
    if (y < 0) {
      y = -y;
    }
    if (z < 0) {
      z = -z;
    }
    let xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    let xf = x - xi;
    let yf = y - yi;
    let zf = z - zi;
    let rxf, ryf;
    let r = 0;
    let ampl = 0.5;
    let n1, n2, n3;
    for (let o = 0;o < perlin_octaves; o++) {
      let of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);
      rxf = scaled_cosine(xf);
      ryf = scaled_cosine(yf);
      n1 = perlin[of & PERLIN_SIZE];
      n1 += rxf * (perlin[of + 1 & PERLIN_SIZE] - n1);
      n2 = perlin[of + PERLIN_YWRAP & PERLIN_SIZE];
      n2 += rxf * (perlin[of + PERLIN_YWRAP + 1 & PERLIN_SIZE] - n2);
      n1 += ryf * (n2 - n1);
      of += PERLIN_ZWRAP;
      n2 = perlin[of & PERLIN_SIZE];
      n2 += rxf * (perlin[of + 1 & PERLIN_SIZE] - n2);
      n3 = perlin[of + PERLIN_YWRAP & PERLIN_SIZE];
      n3 += rxf * (perlin[of + PERLIN_YWRAP + 1 & PERLIN_SIZE] - n3);
      n2 += ryf * (n3 - n2);
      n1 += scaled_cosine(zf) * (n2 - n1);
      r += n1 * ampl;
      ampl *= perlin_amp_falloff;
      xi <<= 1;
      xf *= 2;
      yi <<= 1;
      yf *= 2;
      zi <<= 1;
      zf *= 2;
      if (xf >= 1) {
        xi++;
        xf--;
      }
      if (yf >= 1) {
        yi++;
        yf--;
      }
      if (zf >= 1) {
        zi++;
        zf--;
      }
    }
    return r;
  };
  const noiseSeed = function(seed2) {
    const lcg = (() => {
      const m = 4294967296;
      const a = 1664525;
      const c = 1013904223;
      let seed3, z;
      return {
        setSeed(val) {
          z = seed3 = (val == null ? Math.random() * m : val) >>> 0;
        },
        getSeed() {
          return seed3;
        },
        rand() {
          z = (a * z + c) % m;
          return z / m;
        }
      };
    })();
    lcg.setSeed(seed2);
    perlin = new Array(PERLIN_SIZE + 1);
    for (let i = 0;i < PERLIN_SIZE + 1; i++) {
      perlin[i] = lcg.rand();
    }
  };
  const circle = (x, y, r, fill) => {
    context.beginPath();
    context.arc(x, y, r * Math.min(r, r), 0, 2 * Math.PI, true);
    context.closePath();
    if (fill === "fill") {
      context.fill();
    } else if (fill === "stroke") {
      context.stroke();
    }
  };
  function getRNG(seed2) {
    return sfc32(...cyrb128(seed2.toString()));
  }
  function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k;i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ h1 >>> 18, 597399067);
    h2 = Math.imul(h4 ^ h2 >>> 22, 2869860233);
    h3 = Math.imul(h1 ^ h3 >>> 17, 951274213);
    h4 = Math.imul(h2 ^ h4 >>> 19, 2716044179);
    return [
      (h1 ^ h2 ^ h3 ^ h4) >>> 0,
      (h2 ^ h1) >>> 0,
      (h3 ^ h1) >>> 0,
      (h4 ^ h1) >>> 0
    ];
  }
  function sfc32(a, b, c, d) {
    return function() {
      a >>>= 0;
      b >>>= 0;
      c >>>= 0;
      d >>>= 0;
      var t = a + b | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = c << 21 | c >>> 11;
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    };
  }
  const Vector = class {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
  };
  function createVector(x, y) {
    return new Vector(x, y);
  }
  function vectorAdd(a, b) {
    return new Vector(a.x + b.x, a.y + b.y);
  }
  function vectorDivScalar(a, s) {
    return new Vector(a.x / s, a.y / s);
  }
  const Box = class {
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.c = createVector(x + w * 0.5, y + h * 0.5);
      this.tl = createVector(x, y);
      this.tr = createVector(x + w, y);
      this.br = createVector(x + w, y + h);
      this.bl = createVector(x, y + h);
      this.tc = createVector(x + w * 0.5, y);
      this.rc = createVector(x + w, y + h * 0.5);
      this.bc = createVector(x + w * 0.5, y + h);
      this.lc = createVector(x, y + h * 0.5);
    }
    gridify(gridWidth, gridHeight) {
      let grid = [];
      let boxWidth = this.w / gridWidth;
      let boxHeight = this.h / gridHeight;
      for (let i = 0;i < gridWidth; i++) {
        grid.push([]);
        for (let j = 0;j < gridHeight; j++) {
          grid[i].push(new Box(this.x + boxWidth * i, this.y + boxHeight * j, boxWidth, boxHeight));
        }
      }
      return grid;
    }
    randomPoint() {
      return createVector(this.x + random() * this.w, this.y + random() * this.h);
    }
    coords(xRatio, yRatio) {
      return [this.xc(xRatio), this.yc(yRatio)];
    }
    xc(ratio) {
      return this.x + this.w * ratio;
    }
    yc(ratio) {
      return this.y + this.h * ratio;
    }
    mirrorH() {
      let img = pg.get(this.x, this.y, this.w, this.h);
      pg.push();
      pg.scale(-1, 1);
      pg.translate(-(2 * this.x + this.w), 0);
      pg.image(img, this.x, this.y, this.w, this.h);
      pg.pop();
    }
    mirrorV() {
      let img = pg.get(this.x, this.y, this.w, this.h);
      pg.push();
      pg.scale(1, -1);
      pg.translate(0, -(2 * this.y + this.h));
      pg.image(img, this.x, this.y, this.w, this.h);
      pg.pop();
    }
    rotate(rotation) {
      context.translate(this.c.x, this.c.y);
      context.rotate(rotation * Math.PI * 2);
      context.translate(-this.c.x, -this.c.y);
    }
    rect() {
      context.beginPath();
      context.rect(this.x, this.y, this.w, this.h);
      context.closePath();
      context.fill();
    }
    area() {
      return this.w * this.h;
    }
    triangle2(oriantation) {
      switch (oriantation) {
        case "tl":
          vecTriangle(this.tl, this.tr, this.bl);
          break;
        case "tr":
          vecTriangle(this.tl, this.tr, this.br);
          break;
        case "br":
          vecTriangle(this.br, this.tr, this.bl);
          break;
        case "bl":
          vecTriangle(this.bl, this.tl, this.br);
          break;
      }
    }
    triangle4(oriantation) {
      switch (oriantation) {
        case "l":
          vecTriangle(this.tl, this.bl, this.c);
          break;
        case "t":
          vecTriangle(this.tl, this.tr, this.c);
          break;
        case "r":
          vecTriangle(this.tr, this.br, this.c);
          break;
        case "b":
          vecTriangle(this.bl, this.br, this.c);
          break;
      }
    }
    circle(r) {
      context.beginPath();
      context.arc(this.c.x, this.c.y, r * Math.min(this.w, this.h), 0, 2 * Math.PI, true);
      context.closePath();
      context.fill();
    }
    subBox(ratio) {
      const ratio2 = (1 - ratio) * 0.5;
      return new Box(this.x + ratio2 * this.w, this.y + ratio2 * this.h, ratio * this.w, ratio * this.h);
    }
    subBox(ratioX, ratioY) {
      const ratio2X = (1 - ratioX) * 0.5;
      const ratio2Y = (1 - ratioY) * 0.5;
      return new Box(this.x + ratio2X * this.w, this.y + ratio2Y * this.h, ratioX * this.w, ratioY * this.h);
    }
    subBoxRect() {
      if (this.w > this.h) {
        const diff = this.w - this.h;
        return new Box(this.x + diff * 0.5, this.y, this.w - diff, this.h);
      } else {
        const diff = this.h - this.w;
        return new Box(this.x, this.y + diff * 0.5, this.w, this.h - diff);
      }
    }
  };
  function customFunction(x, i) {
    let mid = Math.floor(i / 2);
    let res = x <= mid ? x : 2 * mid - x;
    return res / i;
  }
  rand = getRNG(seed);
  ctx.scale(100, 100);
  context = ctx;
  cs = 1;
  cs2 = 0.5;
  context.strokeStyle = 0;
  context.fillStyle = 0;
  let np = 120;
  let af = rand() * 10;
  let bf = rand() * 0.2;
  let baseFreq = 0.07 + rand() * 0.1;
  console.log(af, bf);
  let lastPos;
  ctx.lineWidth = 0.01;
  let thickness = Math.ceil(rand() * 30);
  for (let j = -thickness;j < thickness; j++) {
    let off = 0.035;
    let lastPos2 = [off, 0.5];
    for (let i = 0;i < np; i++) {
      const freqNoise = Math.cos(i * bf + af);
      let currentPos = [
        off + (1 - 2 * off) * i / np,
        cs2 + Math.sin(i * baseFreq + freqNoise) * cs * 0.1 + j * cs * 0.003
      ];
      ctx.beginPath();
      ctx.moveTo(...lastPos2);
      ctx.lineTo(...currentPos);
      ctx.stroke();
      ctx.closePath();
      lastPos2 = [...currentPos];
    }
  }
  ctx.lineWidth = 0.04;
  circle(cs2, cs2, cs * 0.69, "stroke");
}
export {
  draw
};
