/** Client-side image shrinking: phone photos (2-5 MB) become ~30-120 KB WebP before upload. */

export type ImageKind = 'logo' | 'cover' | 'product';

const SIZES: Record<ImageKind, number> = { logo: 384, cover: 1280, product: 800 };

const loadBitmap = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible.')); };
    img.src = url;
  });

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise(resolve => canvas.toBlob(resolve, type, quality));

/** Resizes to the kind's max side and encodes as WebP (JPEG if the browser can't). */
export const compressImage = async (file: File, kind: ImageKind): Promise<Blob> => {
  if (!file.type.startsWith('image/')) throw new Error('Choisissez un fichier image.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Image trop lourde (20 Mo maximum).');

  const img = await loadBitmap(file);
  const max = SIZES[kind];
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Compression d’image indisponible sur cet appareil.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const quality of [0.8, 0.65, 0.5]) {
    const blob = (await toBlob(canvas, 'image/webp', quality)) || (await toBlob(canvas, 'image/jpeg', quality));
    if (blob && blob.size <= 140 * 1024) return blob;
    if (blob && quality === 0.5) return blob;
  }
  throw new Error('Compression d’image impossible.');
};

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Lecture de l’image impossible.'));
    r.readAsDataURL(blob);
  });
