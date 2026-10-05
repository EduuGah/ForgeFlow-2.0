/**
 * Turns a picked photo into a small square JPEG data URL (center crop), small
 * enough to live in the profile document and sync with it.
 */
export async function squarePhotoDataUrl(
  file: File,
  size = 320,
  quality = 0.85,
): Promise<string> {
  if (!file.type.startsWith('image/'))
    throw new Error('Escolha um arquivo de imagem.');
  if (file.size > 20 * 1024 * 1024)
    throw new Error('Imagem grande demais (máximo de 20 MB).');

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('Não foi possível abrir essa imagem. Tente JPG ou PNG.');
  });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não conseguiu editar a foto.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}
