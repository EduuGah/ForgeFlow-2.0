/*
 * A 1080 × 1920 picture for Instagram/WhatsApp stories: a title, four big
 * numbers and, for a workout, its exercises. Drawn on a canvas, so it needs
 * no server and works offline.
 */

export interface StoryContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  stats: { label: string; value: string }[];
  /** Left text and right text, e.g. exercise and best set. */
  rows?: [string, string][];
  footer: string;
}

const W = 1080;
const H = 1920;

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (context.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && context.measureText(`${cut}…`).width > maxWidth)
    cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function drawStory(content: StoryContent): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const css = getComputedStyle(document.documentElement);
  const brand = css.getPropertyValue('--color-brand').trim() || '#ff7a1a';
  const font =
    getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';

  // Background: near black with the theme colour glowing from the top.
  context.fillStyle = '#0b0c0e';
  context.fillRect(0, 0, W, H);
  context.globalAlpha = 0.45;
  context.fillStyle = brand;
  context.beginPath();
  context.arc(W / 2, 120, 700, 0, Math.PI * 2);
  context.filter = 'blur(160px)';
  context.fill();
  context.filter = 'none';
  context.globalAlpha = 1;

  const left = 96;
  let y = 200;
  context.textBaseline = 'alphabetic';

  context.fillStyle = brand;
  context.font = `800 34px ${font}`;
  context.letterSpacing = '8px';
  context.fillText('FORGEFLOW', left, y);
  context.letterSpacing = '0px';

  y += 150;
  context.fillStyle = 'rgba(255,255,255,0.7)';
  context.font = `600 40px ${font}`;
  context.fillText(fitText(context, content.eyebrow, W - left * 2), left, y);

  y += 110;
  context.fillStyle = '#ffffff';
  context.font = `800 96px ${font}`;
  context.fillText(fitText(context, content.title, W - left * 2), left, y);

  y += 70;
  context.fillStyle = 'rgba(255,255,255,0.6)';
  context.font = `500 38px ${font}`;
  context.fillText(fitText(context, content.subtitle, W - left * 2), left, y);

  // Four numbers in a 2 × 2 grid of cards.
  y += 80;
  const gap = 28;
  const cardW = (W - left * 2 - gap) / 2;
  const cardH = 230;
  content.stats.slice(0, 4).forEach((stat, index) => {
    const x = left + (index % 2) * (cardW + gap);
    const top = y + Math.floor(index / 2) * (cardH + gap);
    roundRect(context, x, top, cardW, cardH, 36);
    context.fillStyle = 'rgba(255,255,255,0.07)';
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.6)';
    context.font = `600 34px ${font}`;
    context.fillText(stat.label, x + 40, top + 72);
    context.fillStyle = '#ffffff';
    // Long values ("1h 05min") get a smaller size before any cut.
    let size = 76;
    context.font = `800 ${size}px ${font}`;
    while (size > 44 && context.measureText(stat.value).width > cardW - 80) {
      size -= 4;
      context.font = `800 ${size}px ${font}`;
    }
    context.fillText(
      fitText(context, stat.value, cardW - 80),
      x + 40,
      top + 172,
    );
  });
  y += cardH * 2 + gap + 90;

  if (content.rows?.length) {
    const rows = content.rows.slice(0, 7);
    for (const [label, value] of rows) {
      context.fillStyle = brand;
      context.beginPath();
      context.arc(left + 10, y - 14, 10, 0, Math.PI * 2);
      context.fill();
      context.font = `700 40px ${font}`;
      context.fillStyle = 'rgba(255,255,255,0.65)';
      const valueWidth = context.measureText(value).width;
      context.fillText(value, W - left - valueWidth, y);
      context.fillStyle = '#ffffff';
      context.font = `600 42px ${font}`;
      context.fillText(
        fitText(context, label, W - left * 2 - valueWidth - 70),
        left + 40,
        y,
      );
      y += 84;
    }
    if (content.rows.length > rows.length) {
      context.fillStyle = 'rgba(255,255,255,0.5)';
      context.font = `500 36px ${font}`;
      context.fillText(
        `+${content.rows.length - rows.length} exercícios`,
        left + 40,
        y,
      );
    }
  }

  context.fillStyle = 'rgba(255,255,255,0.55)';
  context.font = `600 36px ${font}`;
  context.fillText(content.footer, left, H - 120);
  return canvas;
}

/** Shares the picture (phone share sheet) or, if not possible, downloads it. */
export async function shareStory(
  content: StoryContent,
  fileName: string,
): Promise<'shared' | 'downloaded' | 'failed'> {
  await document.fonts?.ready;
  const canvas = drawStory(content);
  if (!canvas) return 'failed';
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) return 'failed';
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (error) {
      if ((error as Error).name === 'AbortError') return 'shared';
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
