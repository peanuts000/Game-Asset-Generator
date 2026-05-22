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

export interface HistoryItem {
  id: string;
  originalUrl: string;
  processedUrl: string;
  initialProcessedUrl?: string; // Reset point state
  prompt: string;
  timestamp: number;
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

  history: HistoryItem[];
  addHistoryItem: (item: HistoryItem) => void;
  updateHistoryProcessedUrl: (id: string, newProcessedUrl: string) => void;
  updateHistoryInitialUrl: (id: string, url: string) => void;
  removeHistoryItem: (id: string) => void;
  currentHistoryId: string | null;
  setCurrentHistoryId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
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

      history: [],
      addHistoryItem: (item) => set((state) => ({ history: [item, ...state.history] })),
      updateHistoryProcessedUrl: (id, newProcessedUrl) => set((state) => ({
        history: state.history.map(item => item.id === id ? { ...item, processedUrl: newProcessedUrl } : item)
      })),
      updateHistoryInitialUrl: (id, url) => set((state) => ({
        history: state.history.map(item => item.id === id ? { ...item, initialProcessedUrl: url } : item)
      })),
      removeHistoryItem: (id) => set((state) => {
        const newHistory = state.history.filter(item => item.id !== id);
        return {
          history: newHistory,
          // If the deleted item was currently selected, select the first available or null
          currentHistoryId: state.currentHistoryId === id ? (newHistory.length > 0 ? newHistory[0].id : null) : state.currentHistoryId
        };
      }),
      currentHistoryId: null,
      setCurrentHistoryId: (id) => set({ currentHistoryId: id }),
    }),
    {
      name: 'game-asset-generator-storage',
    }
  )
);
