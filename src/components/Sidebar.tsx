'use client';

import { useAppStore } from '@/lib/store';

export default function Sidebar() {
  const { 
    apiKey, baseUrl, model, styleConfig, 
    setApiConfig, setStyleConfig,
    prompt, setPrompt,
    isGenerating, setIsGenerating, setGeneratedImageUrl
  } = useAppStore();

  const handleGenerate = async () => {
    if (!apiKey) {
      alert('Please enter your API Key first.');
      return;
    }
    if (!prompt) {
      alert('Please enter a description for the asset.');
      return;
    }

    setIsGenerating(true);
    setGeneratedImageUrl(null);

    try {
      // 1. Build the advanced industrial prompt
      let finalPrompt = prompt;
      if (styleConfig.styleType === 'pixel') {
        finalPrompt += `, strict pixel art, 8-bit retro style, flat colors, no anti-aliasing, sharp hard edges.`;
      } else {
        finalPrompt += `, 2D game asset, flat design, orthographic, NO drop shadows, NO cast shadows, shadowless, NO outlines, NO black borders.`;
      }

      if (styleConfig.itemType === 'spritesheet') {
        finalPrompt += ` Sprite sheet, multiple animation frames arranged in a perfect grid layout.`;
      } else if (styleConfig.itemType === 'environment') {
        finalPrompt += ` Seamless environment tile block, isometric or orthographic.`;
      }

      // Force a solid background for easy removal
      const bgColorHex = styleConfig.backgroundColor || '#00FF00';
      // Convert hex to a human readable hint if possible, or just pass hex
      finalPrompt += ` Solid background with color ${bgColorHex}.`;

      // 2. Prepare API payload
      const payload = {
        model: model,
        prompt: finalPrompt,
        // DALL-E / Zhipu standard parameters
      };

      // 3. Make the API Call via our Proxy
      const endpoint = baseUrl.endsWith('/images/generations') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/images/generations`;
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: endpoint,
          apiKey: apiKey,
          payload: payload
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        let errorMsg = 'Generation failed';
        if (typeof data.error === 'string') errorMsg = data.error;
        else if (data.error?.message) errorMsg = data.error.message;
        else if (data.message) errorMsg = data.message;
        
        throw new Error(errorMsg);
      }

      // Zhipu/OpenAI usually returns data[0].url
      if (data.data && data.data.length > 0 && data.data[0].url) {
        setGeneratedImageUrl(data.data[0].url);
      } else {
        throw new Error('No image URL returned from API');
      }

    } catch (err: any) {
      console.error(err);
      alert('Error generating image: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 p-6 flex flex-col h-full overflow-y-auto text-gray-200">
      <h2 className="text-xl font-bold mb-6 text-white">🔥 Game Asset Gen</h2>

      {/* API Configuration */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1">Base URL</label>
            <input 
              type="text" 
              value={baseUrl} 
              onChange={e => setApiConfig(apiKey, e.target.value, model)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" 
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">Model Name</label>
            <input 
              type="text" 
              value={model} 
              onChange={e => setApiConfig(apiKey, baseUrl, e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" 
              placeholder="e.g., z-image-turbo"
            />
          </div>
          <div>
            <label className="block text-xs mb-1">API Key</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={e => setApiConfig(e.target.value, baseUrl, model)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" 
              placeholder="sk-..."
            />
          </div>
        </div>
      </section>

      {/* Style & Item Config */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">Style Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs mb-1">Target Style</label>
            <select 
              value={styleConfig.styleType}
              onChange={e => setStyleConfig({ styleType: e.target.value as 'pixel' | '2d' })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="pixel">Pixel Art</option>
              <option value="2d">Standard 2D</option>
            </select>
          </div>

          {styleConfig.styleType === 'pixel' && (
            <div>
              <label className="block text-xs mb-1">Grid Size</label>
              <select 
                value={styleConfig.gridSize}
                onChange={e => setStyleConfig({ gridSize: parseInt(e.target.value) })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={16}>16x16</option>
                <option value={32}>32x32</option>
                <option value={64}>64x64</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs mb-1">Asset Type</label>
            <select 
              value={styleConfig.itemType}
              onChange={e => setStyleConfig({ itemType: e.target.value as any })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="character">Single Character</option>
              <option value="spritesheet">Sprite Sheet</option>
              <option value="environment">Environment Tileset</option>
            </select>
          </div>

          <div>
            <label className="block text-xs mb-1">Chroma Key (Background Color)</label>
            <div className="flex items-center space-x-2">
              <input 
                type="color"
                value={styleConfig.backgroundColor || '#00FF00'}
                onChange={e => setStyleConfig({ backgroundColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
              />
              <span className="text-xs text-gray-400 font-mono uppercase">{styleConfig.backgroundColor || '#00FF00'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-opacity-80">Used to separate foreground objects.</p>
          </div>
          
          <div>
             <label className="block text-xs mb-1">Prompt / Description</label>
             <textarea 
               value={prompt}
               onChange={e => setPrompt(e.target.value)}
               className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 h-24"
               placeholder="A knight in silver armor..."
             ></textarea>
          </div>
        </div>
      </section>

      <button 
        onClick={handleGenerate}
        disabled={isGenerating}
        className="mt-auto w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3 px-4 rounded transition-colors flex items-center justify-center"
      >
        {isGenerating ? (
          <span className="animate-pulse">Generating...</span>
        ) : (
          "Generate Asset"
        )}
      </button>
    </div>
  );
}
