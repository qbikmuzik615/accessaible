/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import type { DownloadOptions } from '../App';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (options: DownloadOptions) => void;
  image: File | null;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, onDownload, image }) => {
  const [format, setFormat] = useState<'png' | 'jpeg'>('jpeg');
  const [quality, setQuality] = useState(90);
  const [scale, setScale] = useState(1);
  const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);

  useEffect(() => {
    if (isOpen && image) {
      // Reset state when modal opens
      setFormat('jpeg');
      setQuality(90);
      setScale(1);

      // Get image dimensions from the file
      const objectUrl = URL.createObjectURL(image);
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    } else {
        setImageDimensions(null);
    }
  }, [isOpen, image]);
  
  if (!isOpen) return null;

  const targetWidth = imageDimensions ? Math.round(imageDimensions.width * scale) : 0;
  const targetHeight = imageDimensions ? Math.round(imageDimensions.height * scale) : 0;

  const handleDownloadClick = () => {
    onDownload({ format, quality, scale });
  };
  
  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-modal-title"
    >
      <div 
        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg p-8 flex flex-col gap-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="download-modal-title" className="text-2xl font-bold text-center">Export Options</h2>
        
        {/* Format Selection */}
        <div className="space-y-2">
            <label className="font-semibold text-gray-300">File Format</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-900/50 rounded-lg">
                <button onClick={() => setFormat('jpeg')} className={`px-4 py-3 rounded-md font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 focus-visible:ring-offset-gray-800 ${format === 'jpeg' ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}>JPEG</button>
                <button onClick={() => setFormat('png')} className={`px-4 py-3 rounded-md font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 focus-visible:ring-offset-gray-800 ${format === 'png' ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}>PNG</button>
            </div>
            <p className="text-xs text-gray-500 px-1">{format === 'jpeg' ? 'Best for sharing, smaller file size.' : 'Best for quality, supports transparency.'}</p>
        </div>

        {/* Quality Slider (for JPEG) */}
        {format === 'jpeg' && (
            <div className="space-y-2 animate-fade-in">
                <div className="flex justify-between items-baseline">
                    <label htmlFor="quality" className="font-semibold text-gray-300">Quality</label>
                    <span className="text-lg font-bold text-blue-400">{quality}</span>
                </div>
                <input
                    id="quality"
                    type="range"
                    min="1"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
            </div>
        )}

        {/* Size/Scale Selection */}
        <div className="space-y-2">
            <label className="font-semibold text-gray-300">Size</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-900/50 rounded-lg">
                <button onClick={() => setScale(1)} className={`px-4 py-3 rounded-md font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 focus-visible:ring-offset-gray-800 ${scale === 1 ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}>1x</button>
                <button onClick={() => setScale(0.5)} className={`px-4 py-3 rounded-md font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 focus-visible:ring-offset-gray-800 ${scale === 0.5 ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}>0.5x</button>
                <button onClick={() => setScale(0.25)} className={`px-4 py-3 rounded-md font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-400 focus-visible:ring-offset-gray-800 ${scale === 0.25 ? 'bg-blue-600 text-white' : 'hover:bg-white/10'}`}>0.25x</button>
            </div>
             <p className="text-xs text-gray-500 px-1">
                Final dimensions: <span className="font-medium text-gray-400">{targetWidth > 0 ? `${targetWidth} x ${targetHeight} pixels` : 'Calculating...'}</span>
             </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 focus-visible:ring-offset-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadClick}
            className="w-full bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-400 focus-visible:ring-offset-gray-800"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;