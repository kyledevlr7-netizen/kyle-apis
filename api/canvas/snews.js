// snews.js
const { Canvas, createCanvas, loadImage: loadImageOrig, Path2D } = require('@napi-rs/canvas');

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidURL(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

class CanvCass {
  static async loadImage(source) {
    return await loadImageOrig(source);
  }

  static createRect(basis) {
    const { width, height } = basis;

    if (typeof width !== "number" || typeof height !== "number") {
      throw new Error("createRect: width and height must be provided as numbers.");
    }

    const x = basis.centerX;
    const y = basis.centerY;

    const left = basis.left ?? (typeof x === "number" ? x - width / 2 : typeof basis.right === "number" ? basis.right - width : undefined);

    const top = basis.top ?? (typeof y === "number" ? y - height / 2 : typeof basis.bottom === "number" ? basis.bottom - height : undefined);

    if (typeof left !== "number" || typeof top !== "number") {
      throw new Error("createRect: insufficient data to calculate position. Provide at least (x/y), (right/bottom), or (left/top).");
    }

    return {
      width,
      height,
      left,
      top,
      right: left + width,
      bottom: top + height,
      centerX: left + width / 2,
      centerY: top + height / 2,
    };
  }

  static rectToPath(rect) {
    const path = new Path2D();
    path.rect(rect.left, rect.top, rect.width, rect.height);
    return path;
  }

  static createCirclePath(center, radius) {
    const path = new Path2D();
    path.arc(center[0], center[1], radius, 0, Math.PI * 2);
    return path;
  }

  static colorA = "#9700af";
  static colorB = "#a69a00";

  constructor(config) {
    if (!("width" in config && "height" in config)) {
      throw new TypeError("Invalid Config: width and height required");
    }

    this._config = config;
    this._canvas = createCanvas(config.width, config.height);
    this._context = this._canvas.getContext("2d");
  }

  get width() {
    return this._config.width;
  }

  get height() {
    return this._config.height;
  }

  get left() {
    return 0;
  }

  get top() {
    return 0;
  }

  get right() {
    return this.width;
  }

  get bottom() {
    return this.height;
  }

  get centerX() {
    return this.width / 2;
  }

  get centerY() {
    return this.height / 2;
  }

  toPng() {
    return this._canvas.toBuffer("image/png");
  }

  drawBox(config) {
    let rect;
    let style = {};

    if ("rect" in config) {
      rect = config.rect;
      style = config;
      delete style.rect;
    } else {
      rect = CanvCass.createRect(config);
      style = config;
    }

    const ctx = this._context;
    ctx.save();
    ctx.beginPath();
    let path = CanvCass.rectToPath(rect);

    if (style.fill) {
      ctx.fillStyle = style.fill;
      ctx.fill(path);
    }

    ctx.restore();
  }

  drawCircle(config) {
    const [centerX, centerY] = config.center;
    const radius = config.radius;
    const { fill, stroke, strokeWidth } = config;

    const ctx = this._context;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);

    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = Number(strokeWidth ?? "1");
      ctx.stroke();
    }

    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }

    ctx.restore();
  }

  drawText(config) {
    const ctx = this._context;

    const text = config.text;
    const x = config.x ?? 0;
    const y = config.y ?? 0;

    this._processFont(config);

    const {
      fill = "white",
      stroke,
      strokeWidth = 1,
      cssFont: font = "",
      align = "center",
      baseline = "middle",
      vAlign = "middle",
      size,
      yMargin = 0,
      breakTo = "bottom",
      breakMaxWidth = Infinity,
    } = config;
    const origY = y;

    let modY = y;

    if (vAlign === "top") {
      modY -= size / 2;
    } else if (vAlign === "bottom") {
      modY += size / 2;
    }

    ctx.save();

    const lineHeight = size + yMargin;
    const direction = breakTo === "top" ? -1 : 1;

    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;

    let { lines, maxWidth } = this.splitBreakDetailed(
      config,
      breakMaxWidth
    );
    lines = lines.filter(Boolean);

    let tx = x;
    let ty = modY;

    if (breakTo === "top") {
      lines.reverse();
    }
    if (breakTo === "center") {
      ty -= ((lines.length - 1) / 2) * lineHeight;
    }

    const linePos = [];

    for (const line of lines) {
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeWidth;
        ctx.strokeText(line, tx, ty);
      }
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillText(line, tx, ty);
      }
      linePos.push([tx, ty]);
      ty += lineHeight * direction;
    }

    modY = y;

    if (vAlign === "top") {
      modY += size;
    } else if (vAlign === "bottom") {
      modY -= size;
    }

    const rect = CanvCass.createRect({
      width: maxWidth,
      height: Math.abs(modY - linePos.at(-1)[1]),
      ...(breakTo === "bottom" ? { top: origY } : {}),
      ...(breakTo === "top" ? { bottom: origY } : {}),
      ...(breakTo === "center" ? { centerY: origY } : {}),
      ...(align === "left" || align === "start" ? { left: x } : {}),
      ...(align === "right" || align === "end" ? { right: x } : {}),
      ...(align === "center" ? { centerX: x } : {}),
    });

    ctx.restore();

    return {
      lines,
      rect,
      text,
      linePos,
      fill,
      lineHeight,
      direction,
      stroke,
      strokeWidth,
      cssFont: font,
      align,
      baseline,
      vAlign,
      size,
      yMargin,
      breakTo,
      breakMaxWidth,
      x,
      y: origY,
      fontType: config.fontType,
    };
  }

  createDim(rect, options = {}) {
    const { fadeStart = 0, fadeEnd = 1, color = "rgba(0, 0, 0, 0.7)" } = options;
    const ctx = this._context;

    const gradient = ctx.createLinearGradient(rect.left, rect.top, rect.left, rect.bottom);

    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(fadeStart, "transparent");
    gradient.addColorStop(fadeEnd, color);

    return gradient;
  }

  _processFont(options) {
    if (!options.cssFont) {
      options.fontType ??= "cnormal";
      options.size ??= 50;
      if (options.fontType === "cbold") {
        options.cssFont = `bold ${options.size}px sans-serif`;
      } else if (options.fontType === "cnormal") {
        options.cssFont = `normal ${options.size}px sans-serif`;
      } else if (options.fontType === "auto") {
        options.cssFont = `${options.size}px sans-serif`;
      }
    }
  }

  measureText(style) {
    const ctx = this._context;
    ctx.save();
    this._processFont(style);
    const { cssFont: font = "" } = style;
    ctx.font = font;
    const result = ctx.measureText(style.text);
    ctx.restore();
    return result;
  }

  splitBreakDetailed(style, maxW) {
    const lines = [];
    const widths = [];
    const paragraphs = style.text.split("\n");
    for (const paragraph of paragraphs) {
      let words = paragraph.split(" ");
      let currentLine = "";
      let accuW = 0;
      for (let word of words) {
        let wordWidth = this.measureText({ ...style, text: word }).width;
        while (wordWidth > maxW) {
          let splitIndex = word.length;
          while (splitIndex > 0) {
            const part = word.slice(0, splitIndex) + "-";
            const partWidth = this.measureText({ ...style, text: part }).width;
            if (partWidth <= maxW) break;
            splitIndex--;
          }
          const part = word.slice(0, splitIndex) + "-";
          lines.push(currentLine ? currentLine + " " + part : part);
          widths.push(this.measureText({ ...style, text: currentLine ? currentLine + " " + part : part }).width);
          currentLine = "";
          word = word.slice(splitIndex);
          wordWidth = this.measureText({ ...style, text: word }).width;
        }
        const addSpace = currentLine ? " " : "";
        const totalWidth = accuW + this.measureText({ ...style, text: addSpace + word }).width;
        if (totalWidth > maxW) {
          if (currentLine) {
            lines.push(currentLine);
            widths.push(accuW);
          }
          currentLine = word;
          accuW = this.measureText({ ...style, text: word }).width;
        } else {
          currentLine += addSpace + word;
          accuW = totalWidth;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
        widths.push(accuW);
      }
    }
    const maxWidth = Math.max(...widths);
    return {
      lines,
      maxWidth,
    };
  }

  async drawImage(imageOrSrc, left, top, options = {}) {
    const ctx = this._context;

    let image;
    if (typeof imageOrSrc !== "string") {
      image = imageOrSrc;
    } else {
      image = await CanvCass.loadImage(imageOrSrc);
    }

    ctx.save();

    let clipPath = null;
    if (options.clipTo) {
      clipPath = options.clipTo;
    } else {
      const r = CanvCass.createRect({
        width: options.width || image.width,
        height: options.height || image.height,
        left,
        top,
      });
      clipPath = CanvCass.rectToPath(r);
    }
    ctx.clip(clipPath);

    let sourceX = options.sourceOffsetLeft ?? 0;
    let sourceY = options.sourceOffsetTop ?? 0;
    let sourceWidth = options.cropWidth ?? image.width;
    let sourceHeight = options.cropHeight ?? image.height;
    let destWidth = options.width ?? image.width;
    let destHeight = options.height ?? image.height;

    if (options.fit === 'cover') {
      const scale = Math.max(destWidth / image.width, destHeight / image.height);
      sourceWidth = destWidth / scale;
      sourceHeight = destHeight / scale;
      sourceX = (image.width - sourceWidth) / 2;
      sourceY = (image.height - sourceHeight) / 2;
    }

    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      left,
      top,
      destWidth,
      destHeight
    );

    ctx.restore();
  }
}

const meta = {
  name: 'snews',
  desc: 'Generate a satire news image via CanvCass from CassidyBot by lianecagara',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'headline',
      description: 'The headline text for the satire news',
      example: 'he love Jea',
      required: true
    },
    {
      name: 'name',
      description: 'The name to use in the headline (e.g., "Lance claims that ...")',
      example: 'Lance',
      required: true
    },
    {
      name: 'pfp',
      description: 'URL to the profile picture',
      example: 'https://raw.githubusercontent.com/lanceajiro/Storage/refs/heads/main/1756728735205.jpg',
      required: true
    },
    {
      name: 'bg',
      description: 'Optional URL to the background image (defaults to pfp)',
      example: 'https://raw.githubusercontent.com/lanceajiro/Storage/refs/heads/main/backiee-265579-landscape.jpg',
      required: false
    }
  ]
};

async function onStart({ req, res }) {
  let headline, name, pfp, bg;
  if (req.method === 'POST') {
    ({ headline, name, pfp, bg } = req.body);
  } else {
    ({ headline, name, pfp, bg } = req.query);
  }

  if (!headline || !name || !pfp) {
    return res.status(400).json({ error: 'Missing required parameters: headline, name, pfp' });
  }

  if (!isValidURL(pfp)) {
    return res.status(400).json({ error: 'Invalid pfp URL' });
  }

  bg ||= pfp;

  if (!isValidURL(bg)) {
    return res.status(400).json({ error: 'Invalid bg URL' });
  }

  const isBgDifferent = bg !== pfp;

  headline = `${name} claims that ${headline}`;

  try {
    const canv = new CanvCass({ width: 720, height: 720 });
    const margin = 55;

    const bgImage = await CanvCass.loadImage(bg);
    await canv.drawImage(bgImage, canv.left, canv.top, {
      width: canv.width,
      height: canv.height,
      fit: 'cover',
    });

    const bottomHalf = CanvCass.createRect({
      bottom: canv.bottom,
      left: 0,
      width: canv.width,
      height: canv.height / 1.1,
    });
    const gradient = canv.createDim(bottomHalf, { color: "rgba(0,0,0,1)" });
    canv.drawBox({ rect: bottomHalf, fill: gradient });

    const headlineRect = CanvCass.createRect({
      top: canv.bottom - 200,
      left: margin,
      width: canv.width - margin * 2,
      height: 100,
    });
    const headlineResult = canv.drawText({
      text: headline,
      align: "left",
      vAlign: "top",
      baseline: "middle",
      fontType: "cbold",
      size: 38,
      fill: "white",
      x: headlineRect.left,
      breakTo: "top",
      y: headlineRect.bottom,
      breakMaxWidth: headlineRect.width,
      yMargin: 4,
    });

    if (isBgDifferent || true) {
      const cw = (canv.width - margin * 2) / 3;

      const circleBox = CanvCass.createRect({
        left: canv.left + margin,
        bottom: headlineResult.rect.top - headlineResult.lineHeight / 2,
        width: cw,
        height: cw,
      });

      const ccc = [circleBox.centerX, circleBox.centerY];
      const r = cw / 2;

      const circlePath = CanvCass.createCirclePath(ccc, r);

      const pfpImage = await CanvCass.loadImage(pfp);
      await canv.drawImage(pfpImage, circleBox.left, circleBox.top, {
        width: cw,
        height: cw,
        clipTo: circlePath,
        fit: 'cover',
      });

      canv.drawCircle({
        center: ccc,
        radius: r,
        stroke: CanvCass.colorA,
        strokeWidth: 5
      });
    }

    const lineH = 4;
    const lineTop = headlineRect.bottom + 20;
    const lineLeft = margin;
    const lineW = canv.width - margin * 2;

    const lineRectA = CanvCass.createRect({
      top: lineTop,
      left: lineLeft,
      width: lineW / 2,
      height: lineH,
    });
    const lineRectB = CanvCass.createRect({
      top: lineTop,
      left: lineLeft + lineW / 2,
      width: lineW / 2,
      height: lineH,
    });
    canv.drawBox({ rect: lineRectA, fill: CanvCass.colorA });
    canv.drawBox({ rect: lineRectB, fill: CanvCass.colorB });

    const logoRect = CanvCass.createRect({
      width: canv.width - margin * 2,
      height: 20,
      left: canv.left + margin,
      top: lineRectA.bottom + 10,
    });

    const titleText = "News";
    const titleFontType = "cbold";
    const titleSize = logoRect.height;

    canv.drawText({
      text: titleText,
      align: "left",
      vAlign: "top",
      fontType: titleFontType,
      size: titleSize,
      x: logoRect.left,
      y: logoRect.bottom,
      fill: "cyan",
    });

    const subtitleText = "News and Nonsense";
    const subtitleFontType = "cnormal";
    const subtitleSize = 10;

    canv.drawText({
      text: subtitleText,
      align: "left",
      vAlign: "bottom",
      fontType: subtitleFontType,
      size: subtitleSize,
      x: logoRect.left,
      y: logoRect.bottom + 2,
      fill: "white",
    });

    canv.drawText({
      text: "Note: This is purely a work of satire",
      align: "right",
      vAlign: "top",
      baseline: "middle",
      fontType: "cnormal",
      size: 15,
      fill: "rgba(255,255,255,0.6)",
      x: logoRect.right,
      y: logoRect.bottom,
    });

    const buffer = canv.toPng();
    res.type('image/png').send(buffer);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

module.exports = { meta, onStart };