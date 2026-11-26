import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Header } from './components/Header/Header';
import { Studio } from './pages/Studio';
import { Projects } from './pages/Projects';
import { Settings } from './pages/Settings';
import { useStudioStore } from './store/useStudioStore';

export function App() {
  const initializeStudio = useStudioStore((s) => s.initializeStudio);

  useEffect(() => {
    initializeStudio();
  }, [initializeStudio]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0B1020] text-[#EDF2FF]">
        <Header />
        <Routes>
          <Route path="/" element={<Studio />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
