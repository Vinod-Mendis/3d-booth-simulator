let logoPromise: Promise<HTMLImageElement> | null = null;

function loadLogo(): Promise<HTMLImageElement> {
  if (!logoPromise) {
    logoPromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Logo failed to load'));
      img.src = '/images/logo.svg';
    }).catch((err) => {
      logoPromise = null; // allow a retry next time
      throw err;
    }) as Promise<HTMLImageElement>;
  }
  return logoPromise;
}

/**
 * Composites the WebGL canvas (which is transparent) onto the viewer background,
 * optionally stamping the Pre-Show logo in the bottom-right corner, and returns a PNG.
 */
export async function composeScreenshot(
  source: HTMLCanvasElement,
  background: string,
  withLogo: boolean
): Promise<Blob> {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Could not create a 2D canvas');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0);

  if (withLogo) {
    try {
      const logo = await loadLogo();
      const logoH = Math.max(18, Math.round(out.height * 0.035));
      const logoW = Math.round((logo.naturalWidth / (logo.naturalHeight || 1)) * logoH);
      const margin = Math.round(logoH * 0.9);
      const fontSize = Math.round(logoH * 0.95);

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = logoH * 0.3;
      ctx.font = `600 ${fontSize}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      const textX = out.width - margin;
      const midY = out.height - margin - logoH / 2;
      ctx.fillText('Pre-Show', textX, midY);
      const textW = ctx.measureText('Pre-Show').width;
      ctx.drawImage(logo, textX - textW - logoH * 0.5 - logoW, midY - logoH / 2, logoW, logoH);
      ctx.restore();
    } catch {
      // Logo is optional; ship the screenshot without it
    }
  }

  return new Promise((resolve, reject) => {
    out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode PNG'))), 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
