import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StyleConfig {
  styleType: 'pixel' | '2d';
  gridSize?: number; // e.g., 16, 32, 64 (only for pixel)
  itemType: 'character' | 'spritesheet' | 'environment';
  styleReferenceImage?: string; // base64
  globalStylePrompt?: string;
  seed?: number;
  backgroundColor: string; // Background color hex code, e.g. '#00FF00'
}

interface AppState {
  apiKey: string;
  baseUrl: string;
  model: string;
  setApiConfig: (key: string, url: string, model: string) => void;
  
  styleConfig: StyleConfig;
  setStyleConfig: (config: Partial<StyleConfig>) => void;

  prompt: string;
  setPrompt: (prompt: string) => void;
  
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
  
  generatedImageUrl: string | null;
  setGeneratedImageUrl: (url: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: 'sk-ac038a1182254bb6869aa80db10ae88d',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: 'wanx2.1-t2i-turbo', // 阿里云百炼的通义万相模型
      setApiConfig: (apiKey, baseUrl, model) => set({ apiKey, baseUrl, model }),

      styleConfig: {
        styleType: 'pixel',
        gridSize: 16,
        itemType: 'character',
        backgroundColor: '#00FF00', // Default green
      },
      setStyleConfig: (config) => set((state) => ({ 
        styleConfig: { ...state.styleConfig, ...config } 
      })),

      prompt: '',
      setPrompt: (prompt) => set({ prompt }),
      
      isGenerating: false,
      setIsGenerating: (isGenerating) => set({ isGenerating }),
      
      generatedImageUrl: null,
      setGeneratedImageUrl: (url) => set({ generatedImageUrl: url }),
    }),
    {
      name: 'game-asset-generator-storage',
    }
  )
);
