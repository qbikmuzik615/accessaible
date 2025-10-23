/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header';
import StartScreen from './components/StartScreen';
import Sidebar, { type Tab } from './components/Sidebar';
import MainContent from './components/MainContent';
import DownloadModal from './components/DownloadModal';
import { dataURLtoFile } from './utils/image';
import { describeImage } from './services/geminiService';

export interface DownloadOptions {
  format: 'png' | 'jpeg';
  quality: number;
  scale: number;
}

export interface PromptHistoryEntry {
    id: string;
    timestamp: number;
    type: 'Initial Description' | 'Retouch' | 'Filter' | 'Adjustment' | 'Magic Fill' | 'Upscale' | 'Final Description';
    content: string;
    isStarred: boolean;
}

const App: React.FC = () => {
  const [history, setHistory] = useState<File[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('retouch');
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [initialDescription, setInitialDescription] = useState<string>('');
  const [isDescribing, setIsDescribing] = useState<boolean>(false);
  const [promptHistory, setPromptHistory] = useState<PromptHistoryEntry[]>([]);

  const currentImage = history[historyIndex] ?? null;

  useEffect(() => {
    try {
        const savedHistory = localStorage.getItem('promptHistory');
        if (savedHistory) {
            setPromptHistory(JSON.parse(savedHistory));
        }
    } catch (e) {
        console.error("Failed to load prompt history from localStorage", e);
    }
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem('promptHistory', JSON.stringify(promptHistory));
    } catch (e) {
        console.error("Failed to save prompt history to localStorage", e);
    }
  }, [promptHistory]);


  const addPromptHistoryEntry = useCallback((entry: Omit<PromptHistoryEntry, 'id' | 'timestamp'>) => {
    setPromptHistory(prev => [
      ...prev,
      {
        id: `entry-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        ...entry
      }
    ]);
  }, []);

  const starPromptHistoryEntry = useCallback((promptContent: string) => {
    setPromptHistory(prev => prev.map(entry => 
      entry.content === promptContent ? { ...entry, isStarred: true } : entry
    ));
  }, []);

  const addImageToHistory = useCallback((newImageFile: File, newActiveTab: Tab = 'retouch') => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newImageFile);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setActiveTab(newActiveTab);
  }, [history, historyIndex]);

  const handleImageUpload = useCallback(async (file: File) => {
    setError(null);
    setInitialDescription('');
    setHistory([file]);
    setHistoryIndex(0);
    setActiveTab('retouch');
    setIsDescribing(true);
    try {
        const description = await describeImage(file);
        setInitialDescription(description);
        addPromptHistoryEntry({
            type: 'Initial Description',
            content: description,
            isStarred: false,
        });
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Could not describe the image.';
        setError(errorMessage);
    } finally {
        setIsDescribing(false);
    }
  }, [addPromptHistoryEntry]);
  
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex]);
  
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history.length]);

  const handleReset = useCallback(() => {
    if (history.length > 0) {
      setHistoryIndex(0);
      setError(null);
      // Reset prompt history for this session, or clear it entirely
      setPromptHistory([]);
    }
  }, [history]);

  const handleUploadNew = useCallback(() => {
      setHistory([]);
      setHistoryIndex(-1);
      setError(null);
      setPromptHistory([]);
      setInitialDescription('');
  }, []);

  const handleExport = useCallback(async (options: DownloadOptions) => {
    if (!currentImage) return;

    // Describe final image before download
    try {
        const finalDescription = await describeImage(currentImage);
        addPromptHistoryEntry({
            type: 'Final Description',
            content: finalDescription,
            isStarred: false, // This is a description, not a prompt
        });
    } catch (err) {
        console.warn("Could not generate final description for changelog.", err);
    }
  
    const imageUrl = URL.createObjectURL(currentImage);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const newWidth = image.naturalWidth * options.scale;
      const newHeight = image.naturalHeight * options.scale;
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
  
      if (!ctx) return;
  
      ctx.drawImage(image, 0, 0, newWidth, newHeight);
  
      const mimeType = `image/${options.format}`;
      const dataUrl = canvas.toDataURL(mimeType, options.format === 'jpeg' ? options.quality / 100 : undefined);
  
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `prompt-a-pix-export.${options.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(imageUrl);
    };
    image.src = imageUrl;
    setIsDownloadModalOpen(false);
  }, [currentImage, addPromptHistoryEntry]);
  
  const handleFileSelect = (files: FileList | null) => {
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const renderContent = () => {
    if (error) {
       return (
           <div className="text-center animate-fade-in bg-red-500/10 border border-red-500/20 p-8 rounded-lg max-w-2xl mx-auto flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-red-300">An Error Occurred</h2>
            <p className="text-md text-red-400">{error}</p>
            <button
                onClick={() => setError(null)}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-lg text-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-400 focus-visible:ring-offset-gray-900"
              >
                Try Again
            </button>
          </div>
        );
    }
    
    if (!currentImage) {
      return <StartScreen onFileSelect={handleFileSelect} />;
    }

    return (
      <div className="flex flex-col md:flex-row w-full h-full gap-4 md:gap-8">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <MainContent 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          history={history}
          historyIndex={historyIndex}
          addImageToHistory={addImageToHistory}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onReset={handleReset}
          onUploadNew={handleUploadNew}
          onExport={() => setIsDownloadModalOpen(true)}
          initialDescription={initialDescription}
          isDescribing={isDescribing}
          promptHistory={promptHistory}
          addPromptHistoryEntry={addPromptHistoryEntry}
          starPromptHistoryEntry={starPromptHistoryEntry}
        />
         <DownloadModal 
            isOpen={isDownloadModalOpen}
            onClose={() => setIsDownloadModalOpen(false)}
            onDownload={handleExport}
            image={currentImage}
        />
      </div>
    );
  };
  
  return (
    <div className="min-h-screen text-gray-100 flex flex-col">
      <Header />
      <main className={`flex-grow w-full max-w-[1600px] mx-auto p-4 md:p-8 flex ${!currentImage ? 'justify-center items-center' : ''}`}>
        {renderContent()}
      </main>
    </div>
  );
};

export default App;