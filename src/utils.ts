export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function drawImageToCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  fitMode: 'stretch' | 'fit' | 'fill',
  bgImg?: HTMLImageElement | null,
  offsetX: number = 0,
  offsetY: number = 0,
  scale: number = 100,
  cropShape: 'rect' | 'circle' = 'rect'
) {
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Ensure top-tier image scaling quality
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Clear canvas
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  if (bgImg) {
    const bgSrcWidth = bgImg.naturalWidth || bgImg.width;
    const bgSrcHeight = bgImg.naturalHeight || bgImg.height;
    // Cover the area completely for background
    const ratio = Math.max(targetWidth / bgSrcWidth, targetHeight / bgSrcHeight);
    const nw = bgSrcWidth * ratio;
    const nh = bgSrcHeight * ratio;
    const x = (targetWidth - nw) / 2;
    const y = (targetHeight - nh) / 2;
    ctx.drawImage(bgImg, x, y, nw, nh);
  }

  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;

  let nw = targetWidth;
  let nh = targetHeight;
  let x = 0;
  let y = 0;

  if (fitMode === 'stretch') {
    nw = targetWidth;
    nh = targetHeight;
  } else if (fitMode === 'fit') {
    const ratio = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
    nw = srcWidth * ratio;
    nh = srcHeight * ratio;
    x = (targetWidth - nw) / 2;
    y = (targetHeight - nh) / 2;
  } else if (fitMode === 'fill') {
    const ratio = Math.max(targetWidth / srcWidth, targetHeight / srcHeight);
    nw = srcWidth * ratio;
    nh = srcHeight * ratio;
    x = (targetWidth - nw) / 2;
    y = (targetHeight - nh) / 2;
  }

  // Apply scale
  const scaleRatio = scale / 100;
  const scaledWidth = nw * scaleRatio;
  const scaledHeight = nh * scaleRatio;
  
  // Center adjust while scaling, plus offsets
  const finalX = x + (nw - scaledWidth) / 2 + offsetX;
  const finalY = y + (nh - scaledHeight) / 2 + offsetY;

  ctx.save();
  
  if (cropShape === 'circle') {
    ctx.beginPath();
    ctx.arc(finalX + scaledWidth / 2, finalY + scaledHeight / 2, Math.min(scaledWidth, scaledHeight) / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  ctx.drawImage(img, finalX, finalY, scaledWidth, scaledHeight);
  
  ctx.restore();
}

export async function resizeImageToWebP(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  fitMode: 'stretch' | 'fit' | 'fill',
  quality: number,
  bgImg?: HTMLImageElement | null,
  offsetX: number = 0,
  offsetY: number = 0,
  scale: number = 100,
  cropShape: 'rect' | 'circle' = 'rect'
): Promise<{ dataUrl: string; blob: Blob; size: number }> {
  const canvas = document.createElement('canvas');
  
  drawImageToCanvas(
    canvas,
    img,
    targetWidth,
    targetHeight,
    fitMode,
    bgImg,
    offsetX,
    offsetY,
    scale,
    cropShape
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas conversion to Blob failed'));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            dataUrl: reader.result as string,
            blob,
            size: blob.size,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      },
      'image/webp',
      quality
    );
  });
}

// Generate unique short IDs
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
