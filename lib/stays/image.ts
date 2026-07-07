"use client";

// 画像ユーティリティ: アップロード前にクライアント側で縮小・圧縮する
// （巨大画像の投稿を防ぎ、表示も高速に）
export const MAX_UPLOAD_MB = 8;

export async function resizeImage(file: File, maxPx = 512, quality = 0.85): Promise<Blob> {
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`画像が大きすぎます（最大${MAX_UPLOAD_MB}MB） / Image too large (max ${MAX_UPLOAD_MB}MB)`);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b || file), "image/jpeg", quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像を読み込めませんでした"));
    };
    img.src = url;
  });
}
