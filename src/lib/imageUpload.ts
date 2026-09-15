/** Largest image a creator can upload for artwork, avatars and collection art. */
export const MAX_UPLOAD_MB = 15;

/** Returns a message for the person uploading, or null when the file can be uploaded. */
export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/"))
    return "Choose an image file, such as JPG, PNG, WebP or GIF.";
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    return `Images must be ${MAX_UPLOAD_MB} MB or smaller.`;
  }
  return null;
}

/** Uploads an image to Cloudinary and returns its public URL. Errors are written for the user. */
export async function uploadImageFile(file: File): Promise<string> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error("Image uploads aren't available right now. Please try again later.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("upload_preset", uploadPreset);

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body,
    });
  } catch {
    throw new Error("Upload failed. Check your connection and try again.");
  }

  const data = (await response.json().catch(() => null)) as { secure_url?: string } | null;
  if (!response.ok || !data?.secure_url) {
    throw new Error("Upload failed. Try another image.");
  }
  return data.secure_url;
}
