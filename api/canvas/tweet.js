// tweet_image_generator.js

const { createCanvas, loadImage } = require('@napi-rs/canvas');

const meta = {
  name: 'tweet',
  desc: 'Generate a high-quality, professional image mimicking a Twitter post design with dynamic height based on text content',
  method: ['get', 'post'],
  category: 'canvas',
  params: [
    {
      name: 'text',
      description: 'The main text content of the tweet',
      example: 'Tinuruan ko lang pano mag if-else mahal nya daw agad ako.',
      required: true
    },
    {
      name: 'name',
      description: 'The display name of the user',
      example: 'Lance Cochangco',
      required: false
    },
    {
      name: 'username',
      description: 'Username of the user',
      example: '@ajirodesu',
      required: false
    },
    {
      name: 'avatar_url',
      description: 'URL to the avatar image',
      example: 'https://raw.githubusercontent.com/lanceajiro/Storage/refs/heads/main/1756728735205.jpg',
      required: false
    },
    {
      name: 'time',
      description: 'The time of the post',
      example: '2:17 AM',
      required: false
    },
    {
      name: 'day',
      description: 'The day of the post',
      example: 'Tuesday',
      required: false
    },
    {
      name: 'views',
      description: 'The view count',
      example: '192.6K Views',
      required: false
    },
    {
      name: 'tag',
      description: 'The tag or category',
      example: 'AJIRO HQ',
      required: false
    },
    {
      name: 'verified',
      description: 'Whether to show verified badge (true/false)',
      example: 'true',
      required: false
    },
    {
      name: 'theme',
      description: 'Theme options, e.g. "dark" for dark mode',
      example: 'dark',
      required: false,
      options: ['light', 'dark']
    }
  ]
};

function getLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (let word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== '') {
      lines.push(line.trim());
      line = word + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());
  return lines;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

async function onStart({ req, res }) {
  let text, name = 'Doji Creates', handle = '@dojicreates', avatar_url = null,
      time = '2:17 AM', day = 'Tuesday', views = '192.6K Views',
      tag = 'CODING LESSONS AND CODING MEMES', verified = true, options;

  if (req.method === 'POST') {
    ({ text, name, handle, avatar_url, time, day, views, tag, verified, options } = req.body);
  } else {
    ({ text, name, handle, avatar_url, time, day, views, tag, verified, options } = req.query);
  }

  if (!text) {
    return res.status(400).json({
      error: 'Missing required parameter: text'
    });
  }

  verified = verified === 'true' || verified === true;
  const mode = (options || 'light').toLowerCase();

  const theme_list = {
    light: {
      background: '#ffffff',
      avatarDefault: '#ccd6dd',
      name: '#000000',
      handle: '#536471',
      bubble: '#f7f9f9',
      shadowColor: 'rgba(0, 0, 0, 0.05)',
      text: '#000000',
      footer: '#75808a'
    },
    dark: {
      background: '#000000',
      avatarDefault: '#333333',
      name: '#E7E9EA',
      handle: '#8B98A5',
      bubble: '#16181C',
      shadowColor: 'rgba(0, 0, 0, 0.2)',
      text: '#E7E9EA',
      footer: '#6E767D'
    }
  };

  if (!theme_list[mode]) {
    return res.status(400).json({
      error: `Invalid theme. Available themes: ${Object.keys(theme_list).join(', ')}`
    });
  }

  const colors = theme_list[mode];

  const scale = 2; // For higher quality (retina-like)
  const baseWidth = 600;
  const canvasWidth = baseWidth * scale;

  try {
    // Create temporary canvas for measurements (unscaled)
    const tempCanvas = createCanvas(baseWidth, 300);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = '18px Helvetica, Arial, sans-serif'; // Better font stack for professional look

    // Calculate text lines
    const maxTextWidth = 500; // Adjusted for better fit
    const lineHeight = 24;
    const lines = getLines(tempCtx, text, maxTextWidth);
    const textHeight = lines.length * lineHeight;
    const bubblePadding = 30; // Top/bottom padding for bubble
    const bubbleHeight = textHeight + bubblePadding * 2;
    const headerHeight = 80;
    const footerHeight = 40;
    const margins = 20;
    const baseHeight = headerHeight + bubbleHeight + footerHeight + margins;
    const canvasHeight = baseHeight * scale;

    // Create actual high-resolution canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    // Avatar
    let avatar;
    if (avatar_url) {
      avatar = await loadImage(avatar_url);
    } else {
      // Default professional placeholder: a gray circle
      avatar = createCanvas(60, 60);
      const avatarCtx = avatar.getContext('2d');
      avatarCtx.fillStyle = colors.avatarDefault;
      avatarCtx.beginPath();
      avatarCtx.arc(30, 30, 30, 0, Math.PI * 2);
      avatarCtx.fill();
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(50, 40, 25, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 25, 15, 50, 50);
    ctx.restore();

    // Name
    ctx.font = 'bold 16px Helvetica, Arial, sans-serif';
    ctx.fillStyle = colors.name;
    const nameX = 85;
    const nameY = 35;
    ctx.fillText(name, nameX, nameY);
    const nameWidth = ctx.measureText(name).width;

    // Verified badge
    if (verified) {
      const badgeX = nameX + nameWidth + 5;
      const badgeY = nameY - 12;
      const radius = 8;
      ctx.fillStyle = '#1d9bf0'; // Twitter blue
      ctx.beginPath();
      ctx.arc(badgeX + radius, badgeY + radius, radius, 0, Math.PI * 2);
      ctx.fill();

      // Accurate white checkmark
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const cx = badgeX + radius;
      const cy = badgeY + radius;
      const sf = 16 / 22;
      const sx = (x) => cx + (x - 11) * sf;
      const sy = (y) => cy + (y - 11) * sf;
      ctx.moveTo(sx(9.662), sy(14.85));
      ctx.lineTo(sx(6.233), sy(11.422));
      ctx.lineTo(sx(7.526), sy(10.12));
      ctx.lineTo(sx(9.598), sy(12.192));
      ctx.lineTo(sx(13.998), sy(7.398));
      ctx.lineTo(sx(15.345), sy(8.644));
      ctx.closePath();
      ctx.fill();
    }

    // Handle
    ctx.font = '14px Helvetica, Arial, sans-serif';
    ctx.fillStyle = colors.handle;
    ctx.fillText(handle, nameX, nameY + 20);

    // Text bubble
    const bubbleX = 30;
    const bubbleY = 70;
    const bubbleWidth = baseWidth - 60;
    const bubbleRadius = 12;
    ctx.fillStyle = colors.bubble;
    ctx.shadowColor = colors.shadowColor;
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    roundedRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius);
    ctx.shadowColor = 'transparent'; // Reset shadow

    // Tweet text
    ctx.font = '18px Helvetica, Arial, sans-serif';
    ctx.fillStyle = colors.text;
    const textX = bubbleX + 20;
    const textY = bubbleY + bubblePadding;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], textX, textY + (i * lineHeight));
    }

    // Footer info
    const footerY = bubbleY + bubbleHeight + 15;
    ctx.font = '12px Helvetica, Arial, sans-serif';
    ctx.fillStyle = colors.footer;
    const footerText = `${time} · ${day} · ${views} | ${tag.toUpperCase()}`;
    ctx.fillText(footerText, bubbleX + 20, footerY);

    // Send the image
    res.setHeader('Content-Type', 'image/png');
    res.send(canvas.toBuffer('image/png'));
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

module.exports = { meta, onStart };