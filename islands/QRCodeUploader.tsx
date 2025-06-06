import { useState, useRef } from "preact/hooks";
import { parseAuthenticatorURL } from "../lib/totp.ts";

interface QRCodeUploaderProps {
  onParsed: (data: { secret: string; issuer: string; accountName: string }) => void;
  onError: (error: string) => void;
}

export default function QRCodeUploader({ onParsed, onError }: QRCodeUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件选择
  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      onError("请选择图片文件");
      return;
    }

    setIsProcessing(true);
    try {
      // 由于我们需要在客户端处理二维码解析
      // 这里我们使用动态导入来加载 jsQR
      const jsQR = await import("https://esm.sh/jsqr@1.4.0");

      const result = await parseQRCodeFromFile(file, jsQR.default);
      if (result) {
        const parsed = parseAuthenticatorURL(result);
        if (parsed) {
          onParsed(parsed);
        } else {
          onError("二维码中没有找到有效的认证器信息");
        }
      } else {
        onError("无法识别二维码，请确保图片清晰且包含有效的二维码");
      }
    } catch (error) {
      onError("处理图片时出错: " + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 解析二维码从文件
  const parseQRCodeFromFile = (file: File, jsQR: any): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(null);
        return;
      }

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        resolve(code ? code.data : null);
      };

      img.onerror = () => resolve(null);

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  // 处理拖拽
  const handleDragOver = (e: Event) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: Event) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: Event) => {
    e.preventDefault();
    setIsDragging(false);

    const dragEvent = e as unknown as { dataTransfer?: { files?: FileList } };
    const files = dragEvent.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 处理文件输入
  const handleFileInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // 处理剪切板
  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();

      for (const clipboardItem of clipboardItems) {
        // 检查是否有图片
        for (const type of clipboardItem.types) {
          if (type.startsWith("image/")) {
            const blob = await clipboardItem.getType(type);
            const file = new File([blob], "clipboard-image.png", { type });
            await handleFileSelect(file);
            return;
          }
        }

        // 检查是否有文本
        if (clipboardItem.types.includes("text/plain")) {
          const text = await navigator.clipboard.readText();
          const parsed = parseAuthenticatorURL(text.trim());
          if (parsed) {
            onParsed(parsed);
            return;
          } else {
            onError("剪切板中的文本不是有效的认证器 URL");
            return;
          }
        }
      }

      onError("剪切板中没有找到图片或认证器 URL");
    } catch (_error) {
      onError("读取剪切板失败，请确保已授权访问剪切板");
    }
  };

  return (
    <div class="space-y-4">
      {/* 拖拽上传区域 */}
      <div
        class={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
          } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div class="space-y-2">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <div class="text-sm text-gray-600">
            <p class="font-medium">拖拽二维码图片到这里</p>
            <p>或者</p>
          </div>
          <button
            type="button"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? "处理中..." : "选择图片文件"}
          </button>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        class="hidden"
        onChange={handleFileInputChange}
      />

      {/* 剪切板按钮 */}
      <div class="text-center">
        <button
          type="button"
          class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={handlePasteFromClipboard}
          disabled={isProcessing}
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          从剪切板粘贴
        </button>
      </div>

      {/* 支持的格式说明 */}
      <div class="text-xs text-gray-500 text-center">
        <p>支持的格式：JPG, PNG, GIF, BMP, WebP</p>
        <p>支持的 URL 格式：otpauth://, phonefactor://</p>
      </div>
    </div>
  );
}
