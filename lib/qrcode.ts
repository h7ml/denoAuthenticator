/**
 * 二维码解析工具
 * 使用 jsQR 库解析二维码图片
 */

// 导入 jsQR 库
import jsQR from "https://esm.sh/jsqr@1.4.0";

/**
 * 从图片数据中解析二维码
 */
export async function parseQRCodeFromImageData(
  imageData: ImageData
): Promise<string | null> {
  try {
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code ? code.data : null;
  } catch (error) {
    console.error("二维码解析失败:", error);
    return null;
  }
}

/**
 * 从 Canvas 中解析二维码
 */
export async function parseQRCodeFromCanvas(
  canvas: HTMLCanvasElement
): Promise<string | null> {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return await parseQRCodeFromImageData(imageData);
  } catch (error) {
    console.error("从 Canvas 解析二维码失败:", error);
    return null;
  }
}

/**
 * 从文件中解析二维码
 */
export async function parseQRCodeFromFile(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      resolve(null);
      return;
    }
    
    img.onload = async () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const result = await parseQRCodeFromCanvas(canvas);
      resolve(result);
    };
    
    img.onerror = () => {
      resolve(null);
    };
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        resolve(null);
      }
    };
    
    reader.onerror = () => {
      resolve(null);
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * 从 Base64 数据中解析二维码
 */
export async function parseQRCodeFromBase64(
  base64Data: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      resolve(null);
      return;
    }
    
    img.onload = async () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const result = await parseQRCodeFromCanvas(canvas);
      resolve(result);
    };
    
    img.onerror = () => {
      resolve(null);
    };
    
    img.src = base64Data;
  });
}

/**
 * 验证文件是否为图片
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

/**
 * 获取支持的图片格式
 */
export function getSupportedImageTypes(): string[] {
  return [
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp"
  ];
}
