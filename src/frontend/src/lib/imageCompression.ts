// Phone cameras routinely produce 4000x3000+ JPEGs several MB each - fine to capture,
// wasteful to store and slow to render as a student photo or worksheet attachment.
// Resizes down to a reasonable max dimension and re-encodes; falls back to the
// original file untouched if anything goes wrong or the "compressed" version isn't
// actually smaller.
export async function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.85,
): Promise<File> {
  // GIF/SVG are skipped: canvas re-encoding would destroy GIF animation and rasterize
  // SVG's resolution independence for no benefit (both are typically already small).
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    // PNG stays PNG so transparency (e.g. a logo) survives; everything else becomes
    // JPEG, which compresses photos far better than PNG ever would.
    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg"
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outputType, outputType === "image/jpeg" ? quality : undefined),
    )
    if (!blob || blob.size >= file.size) return file

    const ext = outputType === "image/png" ? "png" : "jpg"
    return new File([blob], file.name.replace(/\.\w+$/, `.${ext}`), { type: outputType })
  } catch {
    return file
  }
}
