// Browser-safe: the upload limit is enforced on the server and shown to people picking files.
export const MAX_PHOTO_MB = 100;
export const MAX_PHOTO_BYTES = MAX_PHOTO_MB * 1024 * 1024;

/** Returns the message to show when a photo is too big, or null when it is allowed. */
export function photoSizeError(bytes: number) {
  return bytes > MAX_PHOTO_BYTES ? `That photo is over ${MAX_PHOTO_MB} MB.` : null;
}

/** True when a base64 payload is definitely over the limit — checked before decoding it. */
export function encodedPhotoTooBig(base64Length: number) {
  return Math.floor((base64Length * 3) / 4) - 2 > MAX_PHOTO_BYTES;
}
