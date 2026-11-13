/**
 * Camera API helper.
 *
 * Two ways to add photos to a report:
 *  1. Live capture  - getUserMedia streams the rear camera into a <video>,
 *     and a frame is grabbed onto a <canvas> ("Take photo").
 *  2. Photo album   - a normal file input, resized before storage
 *     (photo album size depends on storage capacity).
 *
 * Photos are stored as JPEG data URLs so they persist inside IndexedDB.
 */

let stream = null;

const MAX_DIMENSION = 1280; // px - keeps each photo small enough for IndexedDB
const JPEG_QUALITY = 0.8;

/** Stream the rear camera into the given <video> element. */
export async function startCamera(videoEl) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera API (getUserMedia) is not available in this browser.');
  }
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' }, // rear camera on phones
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

/** Stop the camera and release the hardware. */
export function stopCamera(videoEl) {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
  if (videoEl) videoEl.srcObject = null;
}

/** Grab the current video frame as a resized JPEG data URL (or null). */
export function captureFrame(videoEl, canvasEl) {
  const width = videoEl.videoWidth;
  const height = videoEl.videoHeight;
  if (!width || !height) return null;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  canvasEl.width = Math.round(width * scale);
  canvasEl.height = Math.round(height * scale);
  canvasEl.getContext('2d').drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
  return canvasEl.toDataURL('image/jpeg', JPEG_QUALITY);
}

/** Convert chosen album files into resized JPEG data URLs. */
export async function filesToPhotos(fileList) {
  const photos = [];
  for (const file of Array.from(fileList || [])) {
    if (!file.type.startsWith('image/')) continue;
    photos.push(await resizeImage(file));
  }
  return photos;
}

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read image: ${file.name}`));
    };
    img.src = url;
  });
}
