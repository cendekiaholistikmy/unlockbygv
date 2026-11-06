/**
 * Shrinks a photo in the browser before upload: longest side 1600 px, JPEG.
 * A 6 MB phone photo becomes roughly 250 to 400 KB, which keeps the Apps
 * Script upload fast and the Drive folder tidy.
 */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not read that image."));
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot process images.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
