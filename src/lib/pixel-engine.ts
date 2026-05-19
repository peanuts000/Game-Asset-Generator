// A simple pseudo-quantization function.
// For a real engine, we'd use k-means or octree, but this is a placeholder showing the structure.
function findNearestColor(r: number, g: number, b: number, palette: number[][]): number[] {
  let minDistance = Infinity;
  let nearestColor = palette[0];

  for (const color of palette) {
    const dr = r - color[0];
    const dg = g - color[1];
    const db = b - color[2];
    const distance = Math.sqrt(dr * dr + dg * dg + db * db);
    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = color;
    }
  }
  return nearestColor;
}

export async function processPixelImage(
  imageSource: string, 
  targetSize: number, 
  backgroundColorToMakeTransparent: number[] | null = [0, 255, 0], // Default: green
  outlineColor: number[] | null = null, // Default: no outline
  tolerance: number = 120 // Configurable tolerance
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      // 1. Draw original large image onto a canvas
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = img.width;
      srcCanvas.height = img.height;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) return reject("Failed to get 2d context");
      srcCtx.drawImage(img, 0, 0);

      // 2. Create target canvas of exact physical size (e.g., 16x16)
      const dstCanvas = document.createElement('canvas');
      dstCanvas.width = targetSize;
      dstCanvas.height = targetSize;
      const dstCtx = dstCanvas.getContext('2d');
      if (!dstCtx) return reject("Failed to get 2d context for dst");

      const blockWidth = img.width / targetSize;
      const blockHeight = img.height / targetSize;

      const dstImageData = dstCtx.createImageData(targetSize, targetSize);
      
      const srcData = srcCtx.getImageData(0, 0, img.width, img.height).data;

      // Pass 1: Copy to dstImageData
      for (let y = 0; y < targetSize; y++) {
        for (let x = 0; x < targetSize; x++) {
          const centerX = Math.floor(x * blockWidth + blockWidth / 2);
          const centerY = Math.floor(y * blockHeight + blockHeight / 2);
          const srcIndex = (centerY * img.width + centerX) * 4;
          const dstIndex = (y * targetSize + x) * 4;
          
          dstImageData.data[dstIndex] = srcData[srcIndex];
          dstImageData.data[dstIndex + 1] = srcData[srcIndex + 1];
          dstImageData.data[dstIndex + 2] = srcData[srcIndex + 2];
          dstImageData.data[dstIndex + 3] = srcData[srcIndex + 3]; // Usually 255 for jpeg/opaque
        }
      }

      // Pass 2: Background removal using Flood Fill (Edge-connected components)
      // This protects inner pixels even if they match the background color (e.g. green characters)
      if (backgroundColorToMakeTransparent) {
        const [bgR, bgG, bgB] = backgroundColorToMakeTransparent;
        const visited = new Uint8Array(targetSize * targetSize);
        const queue: [number, number][] = [];
        
        // Start from all 4 borders of the image
        for (let i = 0; i < targetSize; i++) {
            queue.push([i, 0], [i, targetSize - 1], [0, i], [targetSize - 1, i]);
        }

        let head = 0;
        while(head < queue.length) {
            const [x, y] = queue[head++];
            if (x < 0 || x >= targetSize || y < 0 || y >= targetSize) continue;
            
            const idx = y * targetSize + x;
            if (visited[idx] !== 0) continue;

            const dstIndex = idx * 4;
            const pxR = dstImageData.data[dstIndex];
            const pxG = dstImageData.data[dstIndex + 1];
            const pxB = dstImageData.data[dstIndex + 2];
            
            // Calculate color distance from the selected chroma key (background color)
            const dist = Math.sqrt(Math.pow(pxR-bgR, 2) + Math.pow(pxG-bgG, 2) + Math.pow(pxB-bgB, 2));
            
            // 只要当前颜色与背景色相距在 tolerance（容差）以内，就认为是背景。
            // 超过 tolerance 就视为实体边界，停止蔓延。
            let isBg = false;
            if (dist < tolerance) {
               isBg = true;
            }

            if (isBg) {
                visited[idx] = 1; // 1 means transparent background
                dstImageData.data[dstIndex + 3] = 0; // Erase alpha
                // Flood neighbors
                queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
            } else {
                visited[idx] = 2; // 2 means solid boundary, stop flooding this direction
            }
        }
      }

      // Pass 3: Optional pass: Add outline
      if (outlineColor && outlineColor.length >= 3) {
        // We need a copy of the alpha states so we don't chain-react outlines
        const alphaMap = new Uint8Array(targetSize * targetSize);
        for (let i = 0; i < targetSize * targetSize; i++) {
            alphaMap[i] = dstImageData.data[i * 4 + 3] > 0 ? 1 : 0; // Any solid or semi-transparent pixel counts as body
        }
        
        // Define outline thickness based on target size (e.g., 1px for 16x16 to 32x32, thicker for larger)
        const thickness = Math.max(1, Math.floor(targetSize / 128)); 
        
        for (let y = 0; y < targetSize; y++) {
          for (let x = 0; x < targetSize; x++) {
            const idx = y * targetSize + x;
            
            // Only add outline in transparent space around solid pixels
            if (alphaMap[idx] === 0) {
              let hasSolidNeighbor = false;
              
              // Check in a radius (thickness)
              for (let dy = -thickness; dy <= thickness; dy++) {
                for (let dx = -thickness; dx <= thickness; dx++) {
                  const ny = y + dy;
                  const nx = x + dx;
                  if (nx >= 0 && nx < targetSize && ny >= 0 && ny < targetSize) {
                      if (alphaMap[ny * targetSize + nx] === 1) {
                          hasSolidNeighbor = true;
                          break;
                      }
                  }
                }
                if (hasSolidNeighbor) break;
              }
                
              if (hasSolidNeighbor) {
                 const dstIndex = idx * 4;
                 dstImageData.data[dstIndex] = outlineColor[0];
                 dstImageData.data[dstIndex + 1] = outlineColor[1];
                 dstImageData.data[dstIndex + 2] = outlineColor[2];
                 dstImageData.data[dstIndex + 3] = outlineColor.length > 3 ? outlineColor[3] : 255;
              }
            }
          }
        }
      }

      dstCtx.putImageData(dstImageData, 0, 0);
      resolve(dstCanvas.toDataURL('image/png'));
    };
    img.onerror = (e) => {
      console.error("Image loading error inside processPixelImage:", e);
      reject("CORS or Image Load Error. The image URL might be blocking Canvas processing.");
    };
    img.src = imageSource;
  });
}
