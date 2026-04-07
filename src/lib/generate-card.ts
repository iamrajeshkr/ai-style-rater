import { type StyleRating, ratingLabels } from "./prompts";

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1920;

function getScoreColor(score: number): string {
  if (score >= 8) return "#22c55e";
  if (score >= 6) return "#eab308";
  if (score >= 4) return "#f97316";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 9) return "ICONIC";
  if (score >= 8) return "FIRE";
  if (score >= 7) return "CLEAN";
  if (score >= 6) return "SOLID";
  if (score >= 5) return "MID";
  if (score >= 4) return "MEH";
  return "SOS";
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
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
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[i] + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY + lineHeight;
}

export async function generateShareCard(
  imageDataUrl: string,
  result: StyleRating
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  const color = getScoreColor(result.overall_score);
  const label = getScoreLabel(result.overall_score);

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bgGrad.addColorStop(0, "#0a0a1a");
  bgGrad.addColorStop(1, "#111128");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Load and draw the outfit image (top portion)
  const img = await loadImage(imageDataUrl);
  const imgAreaHeight = 900;
  const imgAspect = img.width / img.height;
  const drawWidth = CARD_WIDTH - 80;
  const drawHeight = drawWidth / imgAspect;
  const imgX = 40;
  const imgY = 120;

  // Clip rounded rect for image
  ctx.save();
  drawRoundedRect(
    ctx,
    imgX,
    imgY,
    drawWidth,
    Math.min(drawHeight, imgAreaHeight),
    24
  );
  ctx.clip();

  // Center-crop the image
  const finalH = Math.min(drawHeight, imgAreaHeight);
  if (drawHeight > imgAreaHeight) {
    const offsetY = (drawHeight - imgAreaHeight) / 2;
    ctx.drawImage(img, imgX, imgY - offsetY, drawWidth, drawHeight);
  } else {
    ctx.drawImage(img, imgX, imgY, drawWidth, drawHeight);
  }

  // Gradient overlay on bottom of image
  const imgOverlay = ctx.createLinearGradient(
    0,
    imgY + finalH - 200,
    0,
    imgY + finalH
  );
  imgOverlay.addColorStop(0, "rgba(10,10,26,0)");
  imgOverlay.addColorStop(1, "rgba(10,10,26,0.9)");
  ctx.fillStyle = imgOverlay;
  ctx.fillRect(imgX, imgY + finalH - 200, drawWidth, 200);
  ctx.restore();

  // Score badge on image (bottom-right)
  const badgeSize = 120;
  const badgeX = CARD_WIDTH - 80 - badgeSize + 10;
  const badgeY = imgY + finalH - badgeSize + 10;

  // Badge background
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeSize / 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(10,10,26,0.85)";
  ctx.fill();

  // Badge ring
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeSize / 2 - 6, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 6;
  ctx.stroke();

  // Score arc
  const arcStart = -Math.PI / 2;
  const arcEnd = arcStart + (result.overall_score / 10) * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(badgeX, badgeY, badgeSize / 2 - 6, arcStart, arcEnd);
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.stroke();

  // Score text
  ctx.fillStyle = color;
  ctx.font = "bold 44px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${result.overall_score}`, badgeX, badgeY + 12);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "14px system-ui, -apple-system, sans-serif";
  ctx.fillText("/10", badgeX, badgeY + 32);

  // Content area below image
  const contentY = imgY + finalH + 30;
  ctx.textAlign = "left";

  // Label + Vibe
  ctx.fillStyle = color;
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  ctx.fillText(label, 60, contentY);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 38px system-ui, -apple-system, sans-serif";
  ctx.fillText(`"${result.vibe}"`, 60, contentY + 48);

  // Rating bars
  let barY = contentY + 90;
  const barStartX = 60;
  const barWidth = CARD_WIDTH - 120;
  const barHeight = 10;
  const entries = Object.entries(result.ratings);

  for (const [key, val] of entries) {
    const info = ratingLabels[key];
    if (!info) continue;

    // Label and score
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = "18px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${info.emoji} ${info.label}`, barStartX, barY);

    const barColor = getScoreColor(val.score);
    ctx.fillStyle = barColor;
    ctx.textAlign = "right";
    ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${val.score}`, CARD_WIDTH - 60, barY);
    ctx.textAlign = "left";

    // Bar background
    barY += 10;
    drawRoundedRect(ctx, barStartX, barY, barWidth, barHeight, 5);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();

    // Bar fill
    const fillW = (val.score / 10) * barWidth;
    if (fillW > 0) {
      drawRoundedRect(
        ctx,
        barStartX,
        barY,
        Math.max(fillW, 10),
        barHeight,
        5
      );
      ctx.fillStyle = barColor;
      ctx.fill();
    }

    barY += barHeight + 24;
  }

  // Roast
  barY += 10;
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "18px system-ui, -apple-system, sans-serif";
  barY = wrapText(
    ctx,
    `💀  ${result.roast}`,
    60,
    barY,
    CARD_WIDTH - 120,
    26
  );

  // Celeb match
  barY += 10;
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  wrapText(
    ctx,
    `⭐  ${result.celebrity_match}`,
    60,
    barY,
    CARD_WIDTH - 120,
    26
  );

  // Watermark / branding at bottom
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("STYLECHECK AI", CARD_WIDTH / 2, CARD_HEIGHT - 50);
  ctx.font = "14px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    "ai-style-rater.vercel.app",
    CARD_WIDTH / 2,
    CARD_HEIGHT - 28
  );

  // App name at top
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
  ctx.fillText("StyleCheck", CARD_WIDTH / 2 - 20, 80);
  ctx.fillStyle = "#a855f7";
  ctx.fillText("AI", CARD_WIDTH / 2 + 80, 80);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      "image/jpeg",
      0.92
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
