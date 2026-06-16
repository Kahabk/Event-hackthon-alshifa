import QRCode from 'qrcode';
import { Registration } from '../types';
import badgeTemplateUrl from '../../regster_badge.png';

export { badgeTemplateUrl };

export const normalizeTeamName = (teamName: string) => teamName.trim().replace(/\s+/g, ' ').toLowerCase();
export const teamNameDocId = (teamName: string) => encodeURIComponent(normalizeTeamName(teamName));

export const createRegistrationQrPayload = (registration: Registration) => JSON.stringify({
  event: 'Shifa SDG',
  registrationId: registration.registrationId || '',
  teamName: registration.teamName,
  leaderName: registration.leaderName,
  phoneNumber: registration.phoneNumber,
  collegeName: registration.collegeName,
  location: registration.location,
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

export async function downloadRegistrationBadge(registration: Registration, qrUrl?: string) {
  if (!registration.registrationId) return;

  const finalQrUrl = qrUrl || await createRegistrationQrUrl(registration);
  const [templateImage, qrImage] = await Promise.all([
    loadImage(badgeTemplateUrl),
    loadImage(finalQrUrl),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  roundRect(ctx, 1388, 132, 280, 280, 18, '#ffffff');
  ctx.drawImage(qrImage, 1404, 148, 248, 248);

  roundRect(ctx, 120, 92, 320, 94, 14, 'rgba(0,0,0,0.44)');
  drawText(ctx, 'SHIFA SDG ID', 148, 132, 22, 700, '#d7dfe4', 'JetBrains Mono, monospace', 4);
  drawText(ctx, registration.registrationId, 148, 166, 30, 900, '#B9FF66', 'JetBrains Mono, monospace');

  drawText(ctx, 'REGISTERED TEAM LEADER', 120, 368, 24, 900, '#B9FF66', 'JetBrains Mono, monospace', 8);
  drawWrappedText(ctx, registration.leaderName, 120, 444, 980, getCanvasNameSize(registration.leaderName), 700, '#ffffff', 'Inter, Arial, sans-serif', 1.02);
  drawText(ctx, registration.fieldOfStudy, 120, 642, 58, 800, '#ffffff', 'Inter, Arial, sans-serif');
  drawText(ctx, `TID - ${registration.teamName}`, 120, 718, 46, 800, '#ffffff', 'Inter, Arial, sans-serif');
  drawWrappedText(ctx, registration.collegeName, 120, 780, 940, 38, 700, '#f0f3f6', 'Inter, Arial, sans-serif', 1.14);
  drawWrappedText(ctx, registration.location, 120, 850, 920, 30, 700, '#f0f3f6', 'Inter, Arial, sans-serif', 1.12);
  drawText(ctx, `${registration.track} | ${registration.phoneNumber}`, 120, 902, 26, 700, '#d8dde7', 'JetBrains Mono, monospace');

  drawText(ctx, 'VERIFIED SHIFA SDG REGISTRATION', 120, 942, 24, 900, '#ffffff', 'JetBrains Mono, monospace', 7);
  drawText(ctx, String(registration.teamSize).padStart(2, '0'), 1620, 940, 52, 900, '#ffffff', 'Inter, Arial, sans-serif');

  const anchor = document.createElement('a');
  anchor.href = canvas.toDataURL('image/png');
  anchor.download = `${registration.registrationId}-badge.png`;
  anchor.click();
}

export function getPreviewNameSize(name: string) {
  if (name.length > 30) return 'clamp(20px, 3.4vw, 40px)';
  if (name.length > 22) return 'clamp(22px, 4vw, 46px)';
  if (name.length > 14) return 'clamp(24px, 4.6vw, 52px)';
  return 'clamp(26px, 5vw, 58px)';
}

function getCanvasNameSize(name: string) {
  if (name.length > 30) return 70;
  if (name.length > 22) return 82;
  if (name.length > 14) return 94;
  return 106;
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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string) {
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
