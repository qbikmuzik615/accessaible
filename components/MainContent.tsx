/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { generateEditedImage, generateFilteredImage, generateAdjustedImage, generateMagicFill, generateUpscaledImage, connectToAssistant } from '../services/geminiService';
// FIX: Removed non-exported type `LiveSession`.
import type { LiveServerMessage } from '@google/genai';
import { decode, decodeAudioData, createBlob } from '../utils/audio';
import { dataURLtoFile, blobToBase64 } from '../utils/image';
import Spinner from './Spinner';
import FilterPanel from './FilterPanel';
import AdjustmentPanel from './AdjustmentPanel';
import CropPanel from './CropPanel';
import MagicFillPanel from './MagicFillPanel';
import UpscalePanel from './UpscalePanel';
import PromptLabPanel from './PromptLabPanel';
import AccessAibilityPanel from './CoPilotPanel';
import PromptHistoryModal from './PromptHistoryModal';
import { UndoIcon, RedoIcon, ExportIcon, CompareIcon, HistoryIcon, DocumentTextIcon } from './icons';
import { type Tab } from './Sidebar';
import { type PromptHistoryEntry } from '../App';

interface MainContentProps {
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    history: File[];
    historyIndex: number;
    addImageToHistory: (newImageFile: File, newActiveTab?: Tab) => void;
    onUndo: () => void;
    onRedo: () => void;
    onReset: () => void;
    onUploadNew: () => void;
    onExport: () => void;
    initialDescription: string;
    isDescribing: boolean;
    promptHistory: PromptHistoryEntry[];
    addPromptHistoryEntry: (entry: Omit<PromptHistoryEntry, 'id' | 'timestamp'>) => void;
    starPromptHistoryEntry: (promptContent: string) => void;
}

type AssistantStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'error';

const MainContent: React.FC<MainContentProps> = (props) => {
    const { 
        activeTab, setActiveTab, history, historyIndex, addImageToHistory,
        onUndo, onRedo, onReset, onUploadNew, onExport,
        initialDescription, isDescribing, promptHistory, addPromptHistoryEntry, starPromptHistoryEntry
     } = props;
    
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [editHotspot, setEditHotspot] = useState<{ x: number, y: number } | null>(null);
    const [displayHotspot, setDisplayHotspot] = useState<{ x: number, y: number } | null>(null);
    
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [aspect, setAspect] = useState<number | undefined>();
    const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null); // For capturing the view

    // Compare State
    const [compareMode, setCompareMode] = useState<'slider' | 'flicker' | 'off'>('slider');
    const [isComparingFlicker, setIsComparingFlicker] = useState(false);
    const [compareTo, setCompareTo] = useState<'previous' | 'original'>('previous');
    
    // Prompt History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
    // AI Assistant State
    const [assistantStatus, setAssistantStatus] = useState<AssistantStatus>('idle');
    const [userTranscript, setUserTranscript] = useState('');
    const [modelTranscript, setModelTranscript] = useState('');
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const videoFrameIntervalRef = useRef<number | null>(null);
    const audioResourcesRef = useRef<{
        stream: MediaStream,
        inputAudioContext: AudioContext,
        outputAudioContext: AudioContext,
        scriptProcessor: ScriptProcessorNode,
        source: MediaStreamAudioSourceNode,
        sources: Set<AudioBufferSourceNode>
    } | null>(null);
    const nextStartTimeRef = useRef(0);

    const currentImage = history[historyIndex] ?? null;
    const previousImage = history[historyIndex - 1] ?? null;
    const originalImage = history[0] ?? null;
    const compareImage = compareTo === 'previous' ? previousImage : originalImage;
  
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const [compareImageUrl, setCompareImageUrl] = useState<string | null>(null);
    
    useEffect(() => {
        if (initialDescription) {
            setPrompt(initialDescription);
        }
    }, [initialDescription]);
  
    // Effect to create and revoke object URLs safely for the current image
    useEffect(() => {
      if (currentImage) {
        const url = URL.createObjectURL(currentImage);
        setCurrentImageUrl(url);
        return () => URL.revokeObjectURL(url);
      } else {
        setCurrentImageUrl(null);
      }
    }, [currentImage]);
    
    // Effect to create and revoke object URLs safely for the compare image
    useEffect(() => {
      if (compareImage) {
        const url = URL.createObjectURL(compareImage);
        setCompareImageUrl(url);
        return () => URL.revokeObjectURL(url);
      } else {
        setCompareImageUrl(null);
      }
    }, [compareImage]);

    // Effect to draw the current image onto the capture canvas when it changes
    useEffect(() => {
        if (currentImageUrl && canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx?.drawImage(img, 0, 0);
            };
            img.src = currentImageUrl;
        }
    }, [currentImageUrl]);


    // Reset transient states when history changes
    useEffect(() => {
        setCrop(undefined);
        setCompletedCrop(undefined);
        setEditHotspot(null);
        setDisplayHotspot(null);
        if (imgRef.current) {
            setImageDimensions({ width: imgRef.current.naturalWidth, height: imgRef.current.naturalHeight });
        }
    }, [historyIndex]);
  
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
  
    const handleGenerate = useCallback(async () => {
      if (!currentImage) return;
      if (!prompt.trim() || !editHotspot) return;
  
      setIsLoading(true);
      setError(null);
      
      try {
          addPromptHistoryEntry({ type: 'Retouch', content: prompt, isStarred: false });
          const editedImageUrl = await generateEditedImage(currentImage, prompt, editHotspot);
          const newImageFile = dataURLtoFile(editedImageUrl, `edited-${Date.now()}.png`);
          addImageToHistory(newImageFile);
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(errorMessage);
          console.error(err);
      } finally {
          setIsLoading(false);
      }
    }, [currentImage, prompt, editHotspot, addImageToHistory, addPromptHistoryEntry]);
    
    const handleApplyFilter = useCallback(async (filterPrompt: string) => {
      if (!currentImage) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
          addPromptHistoryEntry({ type: 'Filter', content: filterPrompt, isStarred: false });
          const filteredImageUrl = await generateFilteredImage(currentImage, filterPrompt);
          const newImageFile = dataURLtoFile(filteredImageUrl, `filtered-${Date.now()}.png`);
          addImageToHistory(newImageFile);
          starPromptHistoryEntry(filterPrompt);
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(errorMessage);
          console.error(err);
      } finally {
          setIsLoading(false);
      }
    }, [currentImage, addImageToHistory, addPromptHistoryEntry, starPromptHistoryEntry]);
    
    const handleApplyAdjustment = useCallback(async (adjustmentPrompt: string) => {
      if (!currentImage) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
          addPromptHistoryEntry({ type: 'Adjustment', content: adjustmentPrompt, isStarred: false });
          const adjustedImageUrl = await generateAdjustedImage(currentImage, adjustmentPrompt);
          const newImageFile = dataURLtoFile(adjustedImageUrl, `adjusted-${Date.now()}.png`);
          addImageToHistory(newImageFile);
          starPromptHistoryEntry(adjustmentPrompt);
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(errorMessage);
          console.error(err);
      } finally {
          setIsLoading(false);
      }
    }, [currentImage, addImageToHistory, addPromptHistoryEntry, starPromptHistoryEntry]);
  
    const handleApplyMagicFill = useCallback(async () => {
      if (!currentImage || !completedCrop) return;
  
      setIsLoading(true);
      setError(null);
      
      try {
          const prompt = `Fill region: x:${completedCrop.x}, y:${completedCrop.y}, w:${completedCrop.width}, h:${completedCrop.height}`;
          addPromptHistoryEntry({ type: 'Magic Fill', content: prompt, isStarred: false });
          const filledImageUrl = await generateMagicFill(currentImage, completedCrop);
          const newImageFile = dataURLtoFile(filledImageUrl, `filled-${Date.now()}.png`);
          addImageToHistory(newImageFile);
          starPromptHistoryEntry(prompt);
      } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(errorMessage);
          console.error(err);
      } finally {
          setIsLoading(false);
      }
    }, [currentImage, completedCrop, addImageToHistory, addPromptHistoryEntry, starPromptHistoryEntry]);
  
    const handleApplyCrop = useCallback(() => {
        if (!completedCrop || !imgRef.current) return;

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = completedCrop.width * pixelRatio;
        canvas.height = completedCrop.height * pixelRatio;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(
            image,
            completedCrop.x * scaleX, completedCrop.y * scaleY,
            completedCrop.width * scaleX, completedCrop.height * scaleY,
            0, 0, completedCrop.width, completedCrop.height
        );
        
        const croppedImageUrl = canvas.toDataURL('image/png');
        const newImageFile = dataURLtoFile(croppedImageUrl, `cropped-${Date.now()}.png`);
        addImageToHistory(newImageFile);
    }, [completedCrop, addImageToHistory]);
  
    const handleApplyUpscale = useCallback(async (factor: number) => {
        if (!currentImage) return;
        setIsLoading(true);
        setError(null);
        try {
            const prompt = `Upscale by ${factor}x`;
            addPromptHistoryEntry({ type: 'Upscale', content: prompt, isStarred: false });
            const upscaledImageUrl = await generateUpscaledImage(currentImage, factor);
            const newImageFile = dataURLtoFile(upscaledImageUrl, `upscaled-${Date.now()}.png`);
            addImageToHistory(newImageFile);
            starPromptHistoryEntry(prompt);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [currentImage, addImageToHistory, addPromptHistoryEntry, starPromptHistoryEntry]);
    
    const handleImageClick = (e: React.MouseEvent<HTMLElement>) => {
      if (activeTab !== 'retouch' || !imgRef.current) return;
      
      const imageElement = imgRef.current;
      if (!imageElement.clientWidth || !imageElement.clientHeight) return;
      const rect = imageElement.getBoundingClientRect();
      
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      if (offsetX < 0 || offsetX > rect.width || offsetY < 0 || offsetY > rect.height) {
          return;
      }
      
      setDisplayHotspot({ x: offsetX, y: offsetY });
  
      const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imageElement;
      const scaleX = naturalWidth / clientWidth;
      const scaleY = naturalHeight / clientHeight;
      setEditHotspot({ x: Math.round(offsetX * scaleX), y: Math.round(offsetY * scaleY) });
    };
  
    const handleUseGeneratedPrompt = (generatedPrompt: string) => {
        setPrompt(generatedPrompt);
        setActiveTab('retouch');
        if (!editHotspot && imgRef.current) {
            const { naturalWidth, naturalHeight, clientWidth, clientHeight } = imgRef.current;
            setEditHotspot({ x: Math.round(naturalWidth / 2), y: Math.round(naturalHeight / 2) });
            setDisplayHotspot({ x: Math.round(clientWidth / 2), y: Math.round(clientHeight / 2) });
        }
    };
  
    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = e.currentTarget;
      if (naturalWidth > 0 && naturalHeight > 0) {
          setImageDimensions({ width: naturalWidth, height: naturalHeight });
      }
    };

    const stopAssistant = useCallback(() => {
        console.log('Stopping Assistant session...');
        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;

        if (videoFrameIntervalRef.current) {
            clearInterval(videoFrameIntervalRef.current);
            videoFrameIntervalRef.current = null;
        }

        audioResourcesRef.current?.stream.getTracks().forEach(track => track.stop());
        audioResourcesRef.current?.inputAudioContext.close();
        audioResourcesRef.current?.outputAudioContext.close();
        audioResourcesRef.current = null;

        setAssistantStatus('idle');
    }, []);
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (assistantStatus !== 'idle') {
                stopAssistant();
            }
        };
    }, [assistantStatus, stopAssistant]);

    const handleToggleAssistant = useCallback(async () => {
        if (assistantStatus !== 'idle') {
            stopAssistant();
            return;
        }

        setAssistantStatus('connecting');
        setUserTranscript('');
        setModelTranscript('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const outputNode = outputAudioContext.createGain();
            outputNode.connect(outputAudioContext.destination);

            const sources = new Set<AudioBufferSourceNode>();
            audioResourcesRef.current = { stream, inputAudioContext, outputAudioContext, scriptProcessor: null as any, source: null as any, sources };

            let currentInput = '';
            let currentOutput = '';
            
            sessionPromiseRef.current = connectToAssistant({
                onopen: () => {
                    // Start audio streaming
                    const source = inputAudioContext.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (event) => {
                        const inputData = event.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);

                    // Start video (canvas) streaming
                    if (canvasRef.current) {
                        videoFrameIntervalRef.current = window.setInterval(() => {
                            canvasRef.current?.toBlob(async (blob) => {
                                if (blob) {
                                    const base64Data = await blobToBase64(blob);
                                    sessionPromiseRef.current?.then((session) => {
                                        session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' }});
                                    });
                                }
                            }, 'image/jpeg', 0.8);
                        }, 2000); // Send a frame every 2 seconds
                    }
                    
                    if (audioResourcesRef.current) {
                        audioResourcesRef.current.source = source;
                        audioResourcesRef.current.scriptProcessor = scriptProcessor;
                    }
                    setAssistantStatus('listening');
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        currentInput += message.serverContent.inputTranscription.text;
                        setUserTranscript(currentInput);
                    }
                    if (message.serverContent?.outputTranscription) {
                        currentOutput += message.serverContent.outputTranscription.text;
                        setModelTranscript(currentOutput);
                    }
                    if (message.serverContent?.turnComplete) {
                        currentInput = '';
                        currentOutput = '';
                    }

                    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (audioData) {
                        setAssistantStatus('processing');
                        const decodedData = decode(audioData);
                        const audioBuffer = await decodeAudioData(decodedData, outputAudioContext, 24000, 1);
                        
                        const nextStartTime = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                        const source = outputAudioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.start(nextStartTime);
                        nextStartTimeRef.current = nextStartTime + audioBuffer.duration;
                        sources.add(source);
                        source.addEventListener('ended', () => {
                           sources.delete(source);
                           if (sources.size === 0) {
                               setAssistantStatus('listening');
                           }
                        });
                    }
                },
                onerror: (e) => {
                    console.error("Assistant Error:", e);
                    setError(`Assistant connection error: ${e.type}`);
                    setAssistantStatus('error');
                    stopAssistant();
                },
                onclose: () => {
                    console.log("Assistant session closed.");
                    setAssistantStatus('idle');
                }
            });
            await sessionPromiseRef.current;

        } catch (err) {
            console.error("Failed to start Assistant:", err);
            setError(err instanceof Error ? `Microphone access denied or failed: ${err.message}` : "An unknown error occurred.");
            setAssistantStatus('error');
        }

    }, [assistantStatus, stopAssistant]);

    const handleCompareToggle = () => {
        if (compareMode === 'slider') setCompareMode('flicker');
        else if (compareMode === 'flicker') setCompareMode('off');
        else setCompareMode('slider');
    };
    
    const handleDownloadHistory = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(promptHistory, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `prompt-a-pix-history-${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleUseHistoryPrompt = (content: string) => {
        setPrompt(content);
        setIsHistoryModalOpen(false);
        setActiveTab('retouch');
    };
    
    if (!currentImageUrl) return null;

    const imageDisplay = (
      <div 
        onClick={activeTab === 'retouch' ? handleImageClick : undefined}
        onMouseDown={() => compareMode === 'flicker' && canUndo && setIsComparingFlicker(true)}
        onMouseUp={() => compareMode === 'flicker' && canUndo && setIsComparingFlicker(false)}
        onMouseLeave={() => compareMode === 'flicker' && canUndo && setIsComparingFlicker(false)}
        onTouchStart={() => compareMode === 'flicker' && canUndo && setIsComparingFlicker(true)}
        onTouchEnd={() => compareMode === 'flicker' && canUndo && setIsComparingFlicker(false)}
        className={`relative w-full h-full flex items-center justify-center 
          ${activeTab === 'retouch' ? 'cursor-crosshair' : ''} 
          ${compareMode === 'flicker' && canUndo ? 'cursor-pointer' : ''}`}
      >
        {canUndo && compareImageUrl && compareMode === 'slider' ? (
          <ReactCompareSlider
            itemOne={<ReactCompareSliderImage src={compareImageUrl} alt="Compare against" />}
            itemTwo={<ReactCompareSliderImage ref={imgRef} src={currentImageUrl} alt="Current" onLoad={handleImageLoad} />}
            className="w-full max-w-full h-auto max-h-full object-contain"
          />
        ) : canUndo && compareImageUrl && compareMode === 'flicker' ? (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Compare-against image (bottom layer) */}
            <img
                src={compareImageUrl}
                alt="Compare against"
                className="absolute w-full max-w-full h-auto max-h-full object-contain pointer-events-none"
            />
            {/* Current image (top layer, toggles opacity) */}
            <img
                ref={imgRef}
                src={currentImageUrl}
                alt="Current"
                onLoad={handleImageLoad}
                className={`w-full max-w-full h-auto max-h-full object-contain transition-opacity duration-150 ${isComparingFlicker ? 'opacity-0' : 'opacity-100'}`}
            />
          </div>
        ) : (
          <img
            ref={imgRef}
            src={currentImageUrl}
            alt="Current"
            onLoad={handleImageLoad}
            className="w-full max-w-full h-auto max-h-full object-contain"
          />
        )}
      </div>
    );
    
    const cropImageElement = (
        <img 
            ref={imgRef}
            key={`crop-${currentImageUrl}`}
            src={currentImageUrl} 
            alt="Crop this image"
            onLoad={handleImageLoad}
            className="w-full h-auto object-contain"
        />
    );
  
    const isSelectionTabActive = activeTab === 'crop' || activeTab === 'magicFill';
  
    return (
        <div className="flex-grow flex flex-col items-center gap-4 w-full min-w-0 pb-20 md:pb-0">
            {/* Hidden canvas for screen capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Main Image Display Area */}
            <div className="relative w-full flex-grow min-h-0 flex items-center justify-center bg-black/20 rounded-xl overflow-hidden shadow-2xl">
                {(isLoading || isDescribing) && (
                    <div className="absolute inset-0 bg-black/70 z-30 flex flex-col items-center justify-center gap-4 animate-fade-in">
                        <Spinner />
                        <p className="text-gray-300">{isDescribing ? 'Analyzing image...' : 'AI is working its magic...'}</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 bg-black/80 z-40 flex flex-col items-center justify-center gap-4 animate-fade-in p-8 text-center backdrop-blur-sm">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/30">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-bold text-red-300">Generation Failed</h3>
                        <p className="text-md text-red-400 max-w-lg whitespace-pre-wrap">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg text-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-400 focus-visible:ring-offset-gray-900"
                        >
                            Acknowledge
                        </button>
                    </div>
                )}
                
                {isSelectionTabActive ? (
                <ReactCrop 
                    crop={crop} 
                    onChange={c => setCrop(c)} 
                    onComplete={c => setCompletedCrop(c)}
                    aspect={activeTab === 'crop' ? aspect : undefined}
                    className="flex justify-center items-center h-full"
                >
                    {cropImageElement}
                </ReactCrop>
                ) : imageDisplay }
    
                {displayHotspot && !isLoading && activeTab === 'retouch' && (
                    <div 
                        className="absolute rounded-full w-6 h-6 bg-blue-500/50 border-2 border-white pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10"
                        style={{ left: `${displayHotspot.x}px`, top: `${displayHotspot.y}px` }}
                    >
                        <div className="absolute inset-0 rounded-full w-6 h-6 animate-ping bg-blue-400"></div>
                    </div>
                )}
            </div>
            
            {/* Tool Panel & Actions */}
            <div className="w-full flex flex-col gap-4">
                {activeTab === 'retouch' && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-md text-gray-400">
                            {editHotspot ? 'Great! Now describe your localized edit below.' : 'Click an area on the image to make a precise edit.'}
                        </p>
                        <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="w-full flex items-center gap-2">
                            <div className="relative flex-grow">
                                <input
                                    type="text"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={isDescribing ? "Analyzing image..." : (editHotspot ? "e.g., 'change my shirt color to blue'" : "First click a point on the image")}
                                    className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg p-5 text-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 pr-14"
                                    disabled={isLoading || isDescribing || !editHotspot}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsHistoryModalOpen(true)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                                    aria-label="View prompt history"
                                >
                                    <HistoryIcon className="w-6 h-6" />
                                </button>
                            </div>
                            <button 
                                type="submit"
                                className="bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-5 px-8 text-lg rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                                disabled={isLoading || isDescribing || !prompt.trim() || !editHotspot}
                            >
                                Generate
                            </button>
                        </form>
                    </div>
                )}
                {activeTab === 'magicFill' && <MagicFillPanel onApplyMagicFill={handleApplyMagicFill} isLoading={isLoading} isAreaSelected={!!completedCrop?.width && completedCrop.width > 0} />}
                {activeTab === 'crop' && <CropPanel onApplyCrop={handleApplyCrop} onSetAspect={setAspect} isLoading={isLoading} isCropping={!!completedCrop?.width && completedCrop.width > 0} />}
                {activeTab === 'upscale' && <UpscalePanel onApplyUpscale={handleApplyUpscale} isLoading={isLoading} imageDimensions={imageDimensions} />}
                {activeTab === 'adjust' && <AdjustmentPanel onApplyAdjustment={handleApplyAdjustment} isLoading={isLoading} />}
                {activeTab === 'filters' && <FilterPanel onApplyFilter={handleApplyFilter} isLoading={isLoading} />}
                {activeTab === 'promptLab' && <PromptLabPanel onUsePrompt={handleUseGeneratedPrompt} />}
                {activeTab === 'accessAibility' && (
                    <AccessAibilityPanel
                        status={assistantStatus}
                        onToggle={handleToggleAssistant}
                        userTranscript={userTranscript}
                        modelTranscript={modelTranscript}
                    />
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                    <button onClick={onUndo} disabled={!canUndo} className="flex items-center justify-center text-center bg-white/10 border border-transparent text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5" aria-label="Undo last action">
                        <UndoIcon className="w-5 h-5 mr-2" /> Undo
                    </button>
                    <button onClick={onRedo} disabled={!canRedo} className="flex items-center justify-center text-center bg-white/10 border border-transparent text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5" aria-label="Redo last action">
                        <RedoIcon className="w-5 h-5 mr-2" /> Redo
                    </button>
                    
                    <button onClick={handleDownloadHistory} disabled={promptHistory.length === 0} className="flex items-center justify-center text-center bg-white/10 border border-transparent text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-white/5" aria-label="Download prompt history">
                        <DocumentTextIcon className="w-5 h-5 mr-2" /> History
                    </button>

                    <div className="flex items-center bg-white/10 rounded-md overflow-hidden">
                      <button onClick={handleCompareToggle} disabled={!canUndo} className="flex items-center gap-2 py-3 px-4 text-gray-200 font-semibold hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent" aria-label={`Toggle compare mode, current is ${compareMode}`}>
                          <CompareIcon className="w-5 h-5" />
                          <span>{compareMode.charAt(0).toUpperCase() + compareMode.slice(1)}</span>
                      </button>
                      <div className="w-px h-6 bg-gray-600/50"></div>
                      <button onClick={() => setCompareTo(ct => ct === 'previous' ? 'original' : 'previous')} disabled={!canUndo || history.length < 2} className="py-3 px-4 text-gray-200 font-semibold hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent" aria-label={`Toggle compare target, current is ${compareTo}`}>
                          vs. {compareTo.charAt(0).toUpperCase() + compareTo.slice(1)}
                      </button>
                    </div>

                    <div className="flex-grow flex justify-end gap-3">
                        <button onClick={onReset} disabled={!canUndo} className="text-center bg-transparent border border-white/20 text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/10 active:scale-95 text-base disabled:opacity-50 disabled:cursor-not-allowed">
                            Reset
                        </button>
                        <button onClick={onUploadNew} className="text-center bg-white/10 border border-transparent text-gray-200 font-semibold py-3 px-5 rounded-md transition-all duration-200 ease-in-out hover:bg-white/20 active:scale-95 text-base">
                            Upload New
                        </button>
                        <button onClick={onExport} disabled={!currentImage} className="flex items-center justify-center bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-md transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-green-800">
                            <ExportIcon className="w-5 h-5 mr-2" /> Export
                        </button>
                    </div>
                </div>
            </div>
            <PromptHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                history={promptHistory}
                onUsePrompt={handleUseHistoryPrompt}
            />
        </div>
    );
};

export default React.memo(MainContent);