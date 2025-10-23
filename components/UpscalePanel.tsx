/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UpscaleIcon } from './icons';

interface UpscalePanelProps {
  onApplyUpscale: (factor: number) => void;
  isLoading: boolean;
  imageDimensions: { width: number, height: number } | null;
}

const UpscalePanel: React.FC<UpscalePanelProps> = ({ onApplyUpscale, isLoading, imageDimensions }) => {
  const [factor] = useState(2); // Default to 2x upscale

  const targetDimensions = imageDimensions 
    ? { width: imageDimensions.width * factor, height: imageDimensions.height * factor }
    : null;

  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col items-center gap-6 animate-fade-in backdrop-blur-sm">
      <UpscaleIcon className="w-10 h-10 text-blue-400" />
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-200">AI Image Upscaler</h3>
        <p className="text-sm text-gray-400 mt-1">Enhance image resolution while preserving quality.</p>
      </div>

      <div className="flex flex-col items-center gap-2 p-4 bg-black/20 rounded-lg w-full max-w-md">
        <div className="text-center">
            <p className="text-sm font-medium text-gray-400">Current Resolution</p>
            <p className="text-lg font-semibold text-gray-200">
                {imageDimensions ? `${imageDimensions.width} x ${imageDimensions.height}` : 'Loading...'}
            </p>
        </div>
        <div className="text-2xl font-bold text-blue-400">&darr;</div>
        <div className="text-center">
            <p className="text-sm font-medium text-gray-400">Target Resolution ({factor}x)</p>
            <p className="text-xl font-bold text-green-400">
                {targetDimensions ? `${targetDimensions.width} x ${targetDimensions.height}` : 'Loading...'}
            </p>
        </div>
      </div>
      
      <p className="text-xs text-gray-500">Currently, only 2x upscaling is supported for optimal quality.</p>
      
      <button
        onClick={() => onApplyUpscale(factor)}
        disabled={isLoading || !imageDimensions}
        className="w-full max-w-xs mt-2 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        {isLoading ? 'Upscaling...' : `Apply ${factor}x Upscale`}
      </button>
    </div>
  );
};

export default UpscalePanel;