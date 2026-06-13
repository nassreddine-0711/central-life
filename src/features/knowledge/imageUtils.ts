// Carga un File como dataURL y lo comprime a JPEG con tamaño máximo dado.
// Devuelve un string Base64 listo para guardarse en localStorage.
export async function fileToCompressedDataURL(
  file: File,
  opts: { maxSize?: number; quality?: number } = {},
): Promise<string> {
  const { maxSize = 600, quality = 0.78 } = opts;

  const dataURL = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    i.src = dataURL;
  });

  const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataURL;
  ctx.drawImage(img, 0, 0, w, h);

  // Si el archivo es PNG con transparencia mantenemos PNG, si no JPEG.
  const isPng = file.type === "image/png";
  return canvas.toDataURL(isPng ? "image/png" : "image/jpeg", quality);
}
