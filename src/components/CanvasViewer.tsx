'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { processPixelImage } from '@/lib/pixel-engine';

export default function CanvasViewer() {
  const { generatedImageUrl, isGenerating, styleConfig } = useAppStore();
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tolerance, setTolerance] = useState(120); // Tolerance for background removal

  // Auto-process logic when a new image comes from the API
  useEffect(() => {
    if (!generatedImageUrl) {
      setDisplayUrl(null);
      return;
    }

    const processImage = async () => {
      setIsProcessing(true);
      try {
        // 1. First, fetch the image via our backend proxy to avoid Canvas CORS poisoning
        const proxyRes = await fetch('/api/image-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: generatedImageUrl })
        });
        
        const proxyData = await proxyRes.json();
        if (!proxyRes.ok) throw new Error(proxyData.error);
        
        const safeBase64Image = proxyData.base64;

        if (styleConfig.styleType === 'pixel' && styleConfig.gridSize) {
          // 2. Pass the SAFE base64 image through our engine
          // 只做像素化降维，保留绿幕，等用户手动点击按钮再处理
          const processedDataUrl = await processPixelImage(safeBase64Image, styleConfig.gridSize, null);
          setDisplayUrl(processedDataUrl);
        } else {
          // For Standard 2D
          setDisplayUrl(safeBase64Image);
        }
      } catch (err) {
        console.error("Error processing image:", err);
        setDisplayUrl(generatedImageUrl); // Fallback to raw external image
      } finally {
        setIsProcessing(false);
      }
    };

    processImage();
  }, [generatedImageUrl, styleConfig]);

  const handleRemoveBackground = async () => {
    if (!displayUrl) return;
    setIsProcessing(true);
    try {
      const size = styleConfig.styleType === 'pixel' ? (styleConfig.gridSize || 16) : 1024;
      
      // Convert hex color (e.g. #00FF00) to RGB array
      const hex = styleConfig.backgroundColor || '#00FF00';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      const newUrl = await processPixelImage(displayUrl, size, [r, g, b], null, tolerance);
      setDisplayUrl(newUrl);
    } catch (err) {
       console.error("Remove bg failed", err);
    } finally {
       setIsProcessing(false);
    }
  };

  const handleAddOutline = async () => {
    if (!displayUrl) return;
    setIsProcessing(true);
    try {
      const size = styleConfig.styleType === 'pixel' ? (styleConfig.gridSize || 16) : 1024;
      // Pass null for background color (don't remove anything new) and [0,0,0] for black outline
      const newUrl = await processPixelImage(displayUrl, size, null, [0, 0, 0, 255]);
      setDisplayUrl(newUrl);
    } catch (err) {
       console.error("Add outline failed", err);
    } finally {
       setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!displayUrl) return;
    const a = document.createElement('a');
    a.href = displayUrl;
    a.download = `game-asset-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 bg-gray-950 flex flex-col h-full relative">
      {/* Top Toolbar */}
      <div className="h-auto py-2 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900 text-gray-300 flex-wrap gap-2">
        <div className="font-semibold flex items-center space-x-4">
          <span>Canvas Viewer</span>
          
          <div className="flex items-center space-x-2 text-xs bg-gray-800 px-3 py-1 rounded">
            <div className="w-24 font-mono">Tolerance:{tolerance.toString().padStart(3, '\u00A0')}</div>
            <input 
              type="range" 
              min="10" 
              max="255" 
              value={tolerance} 
              onChange={e => setTolerance(parseInt(e.target.value))}
              className="w-24 accent-blue-500"
            />
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={handleRemoveBackground}
            disabled={!displayUrl || isProcessing}
            className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors disabled:opacity-50"
          >
            Remove Background
          </button>
          <button 
            onClick={handleAddOutline}
            disabled={!displayUrl || isProcessing}
            className="px-4 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded text-sm text-white transition-colors disabled:opacity-50"
          >
            Add Outline
          </button>
          <button 
            onClick={handleDownload}
            disabled={!displayUrl || isProcessing}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm text-white transition-colors disabled:opacity-50 font-medium"
          >
            Download PNG
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-8">
        <div className="w-full max-w-2xl aspect-square bg-gray-900 border border-gray-800 shadow-2xl rounded-lg flex items-center justify-center relative overflow-hidden pattern-dots">
          
          {(isGenerating || isProcessing) && (
            <div className="absolute inset-0 z-10 bg-gray-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-blue-400 font-medium tracking-wide animate-pulse">
                {isGenerating ? "AI is drawing your asset..." : "Pixel Engine is crunching data..."}
              </p>
            </div>
          )}

          {!displayUrl && !isGenerating && !isProcessing ? (
            <div className="text-gray-600 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>Configure parameters and click Generate to see the result.</p>
              <p className="text-sm mt-2 opacity-50">Images will be strictly aligned to pixel-perfect layouts.</p>
            </div>
          ) : (
            displayUrl && (
              <img 
                src={displayUrl} 
                alt="Generated Asset"
                className="max-w-full max-h-full transition-all duration-300"
                style={{ imageRendering: 'pixelated', width: '100%' }} // Expanded for easy viewing
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
