import Sidebar from '@/components/Sidebar';  
import CanvasViewer from '@/components/CanvasViewer';  
import HistorySidebar from '@/components/HistorySidebar';
  
export default function Home() {  
  return (  
    <main className="flex h-screen w-screen overflow-hidden bg-black font-sans">  
      <Sidebar />  
      <CanvasViewer />  
      <HistorySidebar />
    </main>  
  );  
} 
