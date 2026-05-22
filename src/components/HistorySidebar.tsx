'use client';

import { useAppStore } from '@/lib/store';

export default function HistorySidebar() {
  const { history, currentHistoryId, setCurrentHistoryId, removeHistoryItem } = useAppStore();

  if (history.length === 0) {
    return (
      <div className="w-64 bg-gray-900 border-l border-gray-800 flex flex-col h-full hidden xl:flex">
        <div className="p-4 border-b border-gray-800 font-semibold text-gray-300">History</div>
        <div className="flex-1 flex items-center justify-center text-sm text-gray-600 p-4 text-center">
          No assets generated yet.
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col h-full flex-shrink-0 z-20">
      <div className="p-4 border-b border-gray-800 font-semibold text-gray-300 flex justify-between items-center">
        <span>History</span>
        <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">{history.length} items</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.map((item) => {
          const isSelected = item.id === currentHistoryId;
          
          return (
            <div 
              key={item.id} 
              onClick={() => setCurrentHistoryId(item.id)}
              className={`relative cursor-pointer rounded overflow-hidden group transition-all duration-200 border-2 ${isSelected ? 'border-blue-500 shadow-lg shadow-blue-900/20' : 'border-gray-700 hover:border-gray-500'}`}
            >
               {/* Delete button, shown on group hover */}
               <button
                 onClick={(e) => {
                   e.stopPropagation();
                   removeHistoryItem(item.id);
                 }}
                 className="absolute top-1 right-1 z-30 p-1 bg-red-600/80 hover:bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                 title="Delete"
               >
                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>

               <div className="aspect-square bg-black relative">
                  <img 
                    src={item.processedUrl} 
                    alt="History thumbnail" 
                    className="w-full h-full object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {/* Subtle split view preview in history thumbnail */}
                  <div className="absolute inset-0 right-1/2 overflow-hidden border-r border-gray-600/30">
                    <img 
                      src={item.originalUrl}
                      alt="original"
                      className="w-[200%] max-w-none h-full object-cover opacity-60"
                    />
                  </div>
               </div>
               <div className={`text-xs p-2 truncate ${isSelected ? 'bg-blue-900 text-blue-100' : 'bg-gray-800 text-gray-400'}`}>
                 {item.prompt}
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}