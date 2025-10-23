/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { MagicWandIcon } from './icons';

interface MagicFillPanelProps {
  onApplyMagicFill: () => void;
  isLoading: boolean;
  isAreaSelected: boolean;
}

const MagicFillPanel: React.FC<MagicFillPanelProps> = ({ onApplyMagicFill, isLoading, isAreaSelected }) => {
  return (
    <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex flex-col items-center gap-4 animate-fade-in backdrop-blur-sm">
      <MagicWandIcon className="w-8 h-8 text-blue-400" />
      <h3 className="text-lg font-semibold text-gray-300">Magic Fill</h3>
      <p className="text-sm text-gray-400 -mt-2 text-center">
        {isAreaSelected ? 'Great! Now hit generate to fill the selected area.' : 'Click and drag on the image to select an area to fill.'}
      </p>

      <button
        onClick={onApplyMagicFill}
        disabled={isLoading || !isAreaSelected}
        className="w-full max-w-xs mt-2 bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        Generate Fill
      </button>
    </div>
  );
};

export default MagicFillPanel;