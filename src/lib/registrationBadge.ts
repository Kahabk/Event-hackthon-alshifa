import QRCode from 'qrcode';
import { Registration } from '../types';
import { createEventTicketPayload, EVENT_ID } from './eventTicket';

export const normalizeTeamName = (teamName: string) => teamName.trim().replace(/\s+/g, ' ').toLowerCase();
export const teamNameDocId = (teamName: string) => encodeURIComponent(normalizeTeamName(teamName));

// The QR intentionally contains identifiers only. Personal details remain in
// Firestore and are shown only after an authorized volunteer resolves the pass.
export const createRegistrationQrPayload = (registration: Registration) => registration.ticketId
  ? createEventTicketPayload(registration)
  : JSON.stringify({
      eventId: EVENT_ID,
      registrationId: registration.registrationId || '',
      teamId: registration.teamId || registration.teamNameKey || teamNameDocId(registration.teamName),
      teamName: registration.teamName,
    });

export const createRegistrationQrUrl = (registration: Registration, width = 320) => (
  QRCode.toDataURL(createRegistrationQrPayload(registration), {
    margin: 1,
    width,
    color: {
      dark: '#111111',
      light: '#ffffff',
    },
  })
);

export async function downloadRegistrationBadge(
  registration: Registration,
  qrUrl?: string,
  avatarUrl?: string | null,
  displayName?: string,
  locationLabel?: string,
) {
  if (!registration.registrationId) return;

  const leaderName = displayName?.trim() || registration.leaderName || 'Team leader';
  const teamName = registration.teamName || 'Registered team';
  const locationText = locationLabel?.trim() || registration.location || 'Kerala';
  const collegeText = registration.collegeName || 'Campus not added';
  const phoneText = registration.phoneNumber || 'Phone not added';
  const finalQrUrl = qrUrl || await createRegistrationQrUrl(registration);
  const qrImage = await loadImage(finalQrUrl);
  const avatarImage = avatarUrl ? await loadImage(avatarUrl).catch(() => null) : null;

  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFF8E8';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textBaseline = 'alphabetic';

  ctx.shadowColor = 'rgba(25, 26, 35, 0.16)';
  ctx.shadowBlur = 56;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 28;
  roundRect(ctx, 70, 85, 1780, 910, 58, '#FFFDF8');
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetY = 0;
  ctx.shadowBlur = 0;

  const cardX = 110;
  const cardY = 125;
  const cardHeight = 830;
  const leftWidth = 1280;
  const rightWidth = 420;
  const rightX = cardX + leftWidth;

  const gradient = ctx.createLinearGradient(cardX, cardY, rightX, cardY + cardHeight);
  gradient.addColorStop(0, '#CDB0E7');
  gradient.addColorStop(0.58, '#EFE2F7');
  gradient.addColorStop(1, '#FFF8E8');
  roundRect(ctx, cardX, cardY, leftWidth, cardHeight, 44, gradient);
  roundRect(ctx, rightX, cardY, rightWidth, cardHeight, 44, '#B9EDC8');

  roundRect(ctx, 170, 190, 360, 58, 29, 'rgba(255,255,255,0.84)');
  drawCenteredText(ctx, 'SHIFA SDG REGISTRATION', 350, 227, 18, 900, '#6E4E89', 'JetBrains Mono, monospace', 2);

  roundRect(ctx, 1150, 184, 210, 68, 34, '#B9EDC8');
  drawCenteredText(ctx, `${String(registration.teamSize || 0).padStart(2, '0')} ${registration.teamSize === 1 ? 'MEMBER' : 'MEMBERS'}`, 1255, 226, 22, 900, '#191A23', 'Inter, Arial, sans-serif');

  drawText(ctx, 'TEAM ID', 170, 338, 22, 900, '#6E4E89', 'JetBrains Mono, monospace', 3);
  drawText(ctx, registration.registrationId, 170, 390, 40, 900, '#191A23', 'JetBrains Mono, monospace');

  drawText(ctx, 'REGISTERED LEADER', 170, 500, 22, 900, '#6E4E89', 'JetBrains Mono, monospace', 3);
  const nameBottom = drawFittedWrappedText(ctx, leaderName, 170, 560, 700, getCanvasNameSize(leaderName), 44, 2, 900, '#191A23', 'Inter, Arial, sans-serif', 1.08);
  const teamY = Math.max(nameBottom + 30, 725);
  drawFittedWrappedText(ctx, teamName, 170, teamY, 680, getCanvasTeamSize(teamName), 28, 2, 900, '#191A23', 'Inter, Arial, sans-serif', 1.08);

  ctx.shadowColor = 'rgba(25, 26, 35, 0.12)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 16;
  roundRect(ctx, 960, 405, 320, 320, 36, '#ffffff');
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(qrImage, 990, 435, 260, 260);
  drawCenteredText(ctx, 'SCAN PASS', 1120, 776, 18, 900, '#6E4E89', 'JetBrains Mono, monospace', 4);

  drawInfoPill(ctx, collegeText, 170, 845, 285);
  drawInfoPill(ctx, locationText, 485, 845, 285);
  drawInfoPill(ctx, phoneText, 800, 845, 285);

  roundRect(ctx, 1460, 190, 250, 56, 28, 'rgba(255,255,255,0.62)');
  drawCenteredText(ctx, 'VERIFIED ENTRY', 1585, 226, 18, 900, '#4A6D55', 'JetBrains Mono, monospace', 2);

  if (avatarImage) {
    drawCircleImage(ctx, avatarImage, 1585, 500, 150, '#FFFDF8');
  } else {
    roundRect(ctx, 1435, 350, 300, 300, 150, '#FFFDF8');
    drawCenteredText(ctx, leaderName.trim().charAt(0).toUpperCase() || 'S', 1585, 552, 150, 900, '#6E4E89', 'Inter, Arial, sans-serif');
  }

  roundRect(ctx, 1464, 716, 242, 58, 29, 'rgba(255,255,255,0.88)');
  drawCenteredText(ctx, 'ENTRY PASS', 1585, 753, 22, 900, '#191A23', 'Inter, Arial, sans-serif');
  drawFittedWrappedText(ctx, 'Present the QR during event check-in.', 1462, 845, 246, 26, 20, 2, 800, '#4A6D55', 'Inter, Arial, sans-serif', 1.18, 'center');

  const anchor = document.createElement('a');
  anchor.href = canvas.toDataURL('image/png');
  anchor.download = `${registration.registrationId}-qr-pass.png`;
  anchor.click();
}

function getCanvasNameSize(name: string) {
  if (name.length > 44) return 44;
  if (name.length > 34) return 50;
  if (name.length > 26) return 58;
  if (name.length > 18) return 66;
  return 72;
}

function getCanvasTeamSize(teamName: string) {
  if (teamName.length > 42) return 28;
  if (teamName.length > 28) return 32;
  return 36;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string | CanvasGradient | CanvasPattern,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCircleImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, centerX: number, centerY: number, radius: number, background = '#FFF8E8') {
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 18, 0, Math.PI * 2);
  ctx.fillStyle = background;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(25, 26, 35, 0.16)';
  ctx.shadowBlur = 34;
  ctx.shadowOffsetY = 18;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = background;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();

  const sourceSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
  const sourceX = ((image.naturalWidth || image.width) - sourceSize) / 2;
  const sourceY = ((image.naturalHeight || image.height) - sourceSize) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, centerX - radius, centerY - radius, radius * 2, radius * 2);
  ctx.restore();
}

function drawInfoPill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number) {
  roundRect(ctx, x, y, width, 70, 18, 'rgba(255,255,255,0.72)');
  drawFittedWrappedText(ctx, text, x + 28, y + 31, width - 56, 23, 17, 2, 800, '#5F5968', 'Inter, Arial, sans-serif', 1.08);
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  family: string,
  letterSpacing = 0,
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${family}`;
  if (!letterSpacing) {
    ctx.fillText(text, centerX - ctx.measureText(text).width / 2, y);
    return;
  }

  const width = measureSpacedText(ctx, text, letterSpacing);
  let cursor = centerX - width / 2;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + letterSpacing;
  }
}

function drawFittedWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  preferredSize: number,
  minSize: number,
  maxLines: number,
  weight: number,
  color: string,
  family: string,
  lineHeight = 1.12,
  align: 'left' | 'center' = 'left',
) {
  let size = preferredSize;
  let lines: string[] = [];

  while (size >= minSize) {
    ctx.font = `${weight} ${size}px ${family}`;
    lines = wrapCanvasText(ctx, text, maxWidth);
    if (lines.length <= maxLines) break;
    size -= 2;
  }

  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${family}`;
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length) {
    visibleLines[visibleLines.length - 1] = ellipsizeText(ctx, visibleLines[visibleLines.length - 1], maxWidth);
  }

  visibleLines.forEach((lineText, index) => {
    const lineX = align === 'center' ? x + (maxWidth - ctx.measureText(lineText).width) / 2 : x;
    ctx.fillText(lineText, lineX, y + index * size * lineHeight);
  });

  return y + Math.max(visibleLines.length - 1, 0) * size * lineHeight + size;
}

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const chunks = splitWordToFit(ctx, word, maxWidth);
    chunks.forEach((chunk) => {
      const nextLine = line ? `${line} ${chunk}` : chunk;
      if (ctx.measureText(nextLine).width > maxWidth && line) {
        lines.push(line);
        line = chunk;
      } else {
        line = nextLine;
      }
    });
  });

  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function splitWordToFit(ctx: CanvasRenderingContext2D, word: string, maxWidth: number) {
  if (ctx.measureText(word).width <= maxWidth) return [word];

  const chunks: string[] = [];
  let chunk = '';
  for (const char of word) {
    const nextChunk = `${chunk}${char}`;
    if (ctx.measureText(nextChunk).width > maxWidth && chunk) {
      chunks.push(chunk);
      chunk = char;
    } else {
      chunk = nextChunk;
    }
  }

  if (chunk) chunks.push(chunk);
  return chunks;
}

function ellipsizeText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;

  let nextText = text;
  while (nextText.length > 1 && ctx.measureText(`${nextText}...`).width > maxWidth) {
    nextText = nextText.slice(0, -1);
  }
  return `${nextText}...`;
}

function measureSpacedText(ctx: CanvasRenderingContext2D, text: string, letterSpacing: number) {
  return Array.from(text).reduce((width, char) => width + ctx.measureText(char).width + letterSpacing, 0) - letterSpacing;
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  stroke: string,
  lineWidth: number,
  fill?: string | CanvasGradient | CanvasPattern,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }

  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  family: string,
  letterSpacing = 0,
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${family}`;
  if (!letterSpacing) {
    ctx.fillText(text, x, y);
    return;
  }

  let cursor = x;
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + letterSpacing;
  }
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight: number,
  color: string,
  family: string,
  lineHeight = 1.12,
) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${family}`;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(nextLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  });

  if (line) lines.push(line);
  lines.slice(0, 2).forEach((lineText, index) => {
    ctx.fillText(lineText, x, y + index * size * lineHeight);
  });
}
