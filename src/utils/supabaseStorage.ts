import { EnvironmentMode } from '../types/pos';

/**
 * Compresses an image file client-side before storage to ensure quick loading
 * and small footprint in Base64 / LocalStorage / Supabase.
 */
export async function compressImage(file: File, maxDim = 800, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into element'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context unavailable'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas blob conversion failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Blob or File to a Base64 Data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to convert blob to data URL'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads a product image based on environment mode.
 * - In DEMO mode: converts to compressed Base64 Data URL.
 * - In LIVE mode: attempts upload to Supabase Storage 'product-images' bucket if credentials exist.
 *   Gracefully falls back to Base64 Data URL if Supabase is unconfigured or fails.
 */
export async function uploadProductImage(
  file: File,
  productId: string,
  mode: EnvironmentMode = 'DEMO'
): Promise<string> {
  // 1. Client-side compress to standard dimensions (max 800px)
  const compressedBlob = await compressImage(file, 800, 0.85);

  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const supabaseUrl = metaEnv.VITE_SUPABASE_URL;
  const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY;

  if (mode === 'LIVE' && supabaseUrl && supabaseAnonKey) {
    try {
      const ext = 'jpg';
      const cleanId = productId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${cleanId}_${Date.now()}.${ext}`;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/product-images/${fileName}`;

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'true',
        },
        body: compressedBlob,
      });

      if (res.ok) {
        // Construct public URL
        return `${supabaseUrl}/storage/v1/object/public/product-images/${fileName}`;
      } else {
        console.warn('Supabase storage upload failed with status:', res.status, 'Falling back to local Data URL');
      }
    } catch (err) {
      console.warn('Error uploading to Supabase storage:', err, 'Falling back to local Data URL');
    }
  }

  // Demo mode or fallback: return compressed Base64 Data URL
  return blobToDataUrl(compressedBlob);
}
