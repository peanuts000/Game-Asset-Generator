import Sidebar from '@/components/Sidebar';  
import CanvasViewer from '@/components/CanvasViewer';  
  
export default function Home() {  
  return (  
    <main className="flex h-screen w-screen overflow-hidden bg-black font-sans">  
      <Sidebar />  
      <CanvasViewer />  
    </main>  
  );  
} 
