import { DetectionSettings, AnalysisResult } from '../types';
import { analyzeMedicalImage } from './geminiService';

// Helper to map 0-1 float to Jet Colormap
function getJetColor(v: number): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (v < 0.125) { r = 0; g = 0; b = 128 + 4 * (v - 0) * 255; }
  else if (v < 0.375) { r = 0; g = 255 * (v - 0.125) * 4; b = 255; }
  else if (v < 0.625) { r = 255 * (v - 0.375) * 4; g = 255; b = 255 - 255 * (v - 0.375) * 4; }
  else if (v < 0.875) { r = 255; g = 255 - 255 * (v - 0.625) * 4; b = 0; }
  else { r = 255 - 128 * (v - 0.875) * 8; g = 0; b = 0; }
  return [Math.min(255, Math.max(0, r)), Math.min(255, Math.max(0, g)), Math.min(255, Math.max(0, b))];
}

export const processImage = async (
  file: File, 
  settings: DetectionSettings
): Promise<AnalysisResult> => {
  const startTime = performance.now();
  
  // 1. Basic Validation
  if (!file) {
      throw new Error("No file selected.");
  }
  if (!file.type.startsWith('image/')) {
      throw new Error("Invalid file type. Please upload a valid image (JPEG, PNG, etc).");
  }

  // 2. Load Image safely
  let imgBitmap: ImageBitmap;
  try {
      imgBitmap = await createImageBitmap(file);
  } catch (e) {
      console.error("Image Load Error:", e);
      throw new Error("Failed to read image file. The file may be corrupted or unreadable.");
  }
  
  const size = 512;
  
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error("Browser Error: Could not initialize graphics context.");

  ctx.drawImage(imgBitmap, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  
  // Buffers
  const grayBuffer = new Float32Array(size * size);
  const maskImageData = ctx.createImageData(size, size);
  const overlayImageData = ctx.createImageData(size, size);
  
  let nodulePixels = 0;
  const totalPixels = size * size;

  // 3. Grayscale Conversion
  for (let i = 0; i < totalPixels; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    grayBuffer[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
  }

  // 4. Enhanced Nodule Detection (Intensity + Local Circularity)
  const threshold = 0.45 + (settings.threshold * 0.15); // Dynamic threshold
  const searchRadius = 3; 

  for (let y = searchRadius; y < size - searchRadius; y++) {
    for (let x = searchRadius; x < size - searchRadius; x++) {
      const idx = y * size + x;
      const val = grayBuffer[idx];
      
      let isSuspect = false;

      // Primary Intensity Check
      if (val > threshold && val < 0.95) {
        
        // Local Contrast
        let surroundSum = 0;
        let count = 0;
        for(let dy = -searchRadius; dy <= searchRadius; dy+=3) {
            for(let dx = -searchRadius; dx <= searchRadius; dx+=3) {
                if(dx===0 && dy===0) continue;
                surroundSum += grayBuffer[(y+dy)*size + (x+dx)];
                count++;
            }
        }
        const avgSurround = surroundSum / count;

        if (val > avgSurround + 0.08) {
            isSuspect = true;
        }
      }

      if (isSuspect) {
          nodulePixels++;
          // Red Mask
          maskImageData.data[idx * 4] = 255;
          maskImageData.data[idx * 4 + 1] = 0;
          maskImageData.data[idx * 4 + 2] = 0;
          maskImageData.data[idx * 4 + 3] = 255;
          
          // Overlay on original
          overlayImageData.data[idx * 4] = 255;
          overlayImageData.data[idx * 4 + 1] = 0;
          overlayImageData.data[idx * 4 + 2] = 0;
          overlayImageData.data[idx * 4 + 3] = 160;
      } else {
          // Transparent mask
          maskImageData.data[idx * 4 + 3] = 0;
          
          // Original grayscale
          const grayVal = Math.floor(val * 255);
          overlayImageData.data[idx * 4] = grayVal;
          overlayImageData.data[idx * 4 + 1] = grayVal;
          overlayImageData.data[idx * 4 + 2] = grayVal;
          overlayImageData.data[idx * 4 + 3] = 255;
      }
    }
  }

  // Heatmap Logic
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = size;
  tempCanvas.height = size;
  const tempCtx = tempCanvas.getContext('2d');
  if(tempCtx) {
      tempCtx.putImageData(maskImageData, 0, 0);
      // Blur reduces noise and creates "hotspots"
      tempCtx.filter = 'blur(15px)'; 
      tempCtx.drawImage(tempCanvas, 0, 0);
  }
  const heatmapData = tempCtx?.getImageData(0,0,size,size);
  
  const coloredHeatmap = ctx.createImageData(size, size);
  if (heatmapData) {
      for(let i=0; i<totalPixels; i++) {
          const intensity = heatmapData.data[i*4] / 255;
          if (intensity > 0.1) {
            const color = getJetColor(intensity);
            coloredHeatmap.data[i*4] = color[0];
            coloredHeatmap.data[i*4+1] = color[1];
            coloredHeatmap.data[i*4+2] = color[2];
            coloredHeatmap.data[i*4+3] = Math.min(255, intensity * 450); 
          } else {
            coloredHeatmap.data[i*4+3] = 0;
          }
      }
  }

  const toUrl = (imgData: ImageData) => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      c.getContext('2d')?.putImageData(imgData, 0, 0);
      return c.toDataURL();
  };

  const originalUrl = toUrl(imageData);
  
  // Call AI
  const base64Image = originalUrl.split(',')[1];
  
  // We allow the AI analysis to throw specific errors, which we then propagate to the UI
  const geminiResult = await analyzeMedicalImage(base64Image, file.type || 'image/png');

  const endTime = performance.now();

  return {
    originalUrl,
    maskUrl: toUrl(maskImageData),
    overlayUrl: toUrl(overlayImageData),
    heatmapUrl: toUrl(coloredHeatmap),
    
    // We cast this because analyzeMedicalImage now returns a partial that we trust fits the schema due to the try/catch blocks in geminiService
    nodulePercentage: (nodulePixels / totalPixels) * 100,
    riskLevel: geminiResult.riskLevel || 'Low',
    confidenceScore: geminiResult.confidenceScore || 0,
    findings: geminiResult.findings || [],
    summary: geminiResult.summary || "Analysis complete.",
    recommendations: geminiResult.recommendations || [],
    detailedMetrics: geminiResult.detailedMetrics || { spiculation: 0, density: 0, marginDefinition: 0, calcification: 0, sizeScore: 0 },
    
    processingTimeMs: endTime - startTime
  };
};
