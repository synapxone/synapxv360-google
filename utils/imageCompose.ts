
export interface LogoOverlayOptions {
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
  scale: number;        // 0.0 a 1.0 — proporção da logo em relação à largura da arte
  opacity: number;      // 0.0 a 1.0
  padding: number;      // pixels de margem das bordas
}

export async function composeImageWithLogo(
  artUrl: string,
  logoUrl: string,
  options: LogoOverlayOptions = {
    position: 'bottom-right',
    scale: 0.18,
    opacity: 0.9,
    padding: 32
  }
): Promise<string> {
  // Carregar as duas imagens
  const [art, logo] = await Promise.all([
    loadImage(artUrl),
    loadImage(logoUrl)
  ]);

  // Criar canvas com dimensões da arte
  const canvas = document.createElement('canvas');
  canvas.width = art.width;
  canvas.height = art.height;
  const ctx = canvas.getContext('2d')!;

  // Desenhar arte base
  ctx.drawImage(art, 0, 0);

  // Calcular dimensões da logo proporcional
  const logoWidth = canvas.width * options.scale;
  const logoHeight = (logo.height / logo.width) * logoWidth;

  // Calcular posição
  const { x, y } = getLogoPosition(
    canvas.width, canvas.height,
    logoWidth, logoHeight,
    options.position, options.padding
  );

  // Aplicar opacidade e desenhar logo
  ctx.globalAlpha = options.opacity;
  ctx.drawImage(logo, x, y, logoWidth, logoHeight);
  ctx.globalAlpha = 1.0;

  // Retornar como Data URL (PNG)
  return canvas.toDataURL('image/png', 0.95);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // necessário para URLs do Supabase
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function getLogoPosition(
  canvasW: number, canvasH: number,
  logoW: number, logoH: number,
  position: LogoOverlayOptions['position'],
  padding: number
): { x: number; y: number } {
  switch (position) {
    case 'bottom-right': return { x: canvasW - logoW - padding, y: canvasH - logoH - padding };
    case 'bottom-left':  return { x: padding, y: canvasH - logoH - padding };
    case 'top-right':    return { x: canvasW - logoW - padding, y: padding };
    case 'top-left':     return { x: padding, y: padding };
    case 'center':       return { x: (canvasW - logoW) / 2, y: (canvasH - logoH) / 2 };
  }
}
