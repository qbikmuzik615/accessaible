/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { PencilIcon, MagicWandIcon, SunIcon, PaletteIcon, CropIcon, UpscaleIcon, BeakerIcon, MicrophoneIcon } from './icons';

export type Tab = 'retouch' | 'magicFill' | 'adjust' | 'filters' | 'crop' | 'upscale' | 'promptLab' | 'accessAibility';

interface SidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
}

const TABS: { id: Tab; name: string; icon: React.FC<{className?: string}> }[] = [
    { id: 'retouch', name: 'Retouch', icon: PencilIcon },
    { id: 'magicFill', name: 'Magic Fill', icon: MagicWandIcon },
    { id: 'adjust', name: 'Adjust', icon: SunIcon },
    { id: 'filters', name: 'Filters', icon: PaletteIcon },
    { id: 'crop', name: 'Crop', icon: CropIcon },
    { id: 'upscale', name: 'Upscale', icon: UpscaleIcon },
    { id: 'promptLab', name: 'Prompt Lab', icon: BeakerIcon },
    { id: 'accessAibility', name: 'ACCESSaiBILITY', icon: MicrophoneIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    
    const navContent = TABS.map(tab => (
        <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group relative flex md:flex-col lg:flex-row items-center justify-center md:justify-start gap-3 w-full p-3 rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-gray-800 ${
                activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
            aria-label={tab.name}
            aria-pressed={activeTab === tab.id}
        >
            <tab.icon className="w-6 h-6 flex-shrink-0" />
            <span className="hidden lg:block font-semibold">{tab.name}</span>
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-3 py-1.5 bg-gray-900 text-white font-bold text-sm rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none hidden md:block lg:hidden whitespace-nowrap z-50 border border-gray-700">
                {tab.name}
            </div>
        </button>
    ));

  return (
    <>
        {/* Desktop/Tablet Sidebar */}
        <nav className="hidden md:flex flex-col items-center lg:items-stretch gap-2 w-16 lg:w-56 bg-gray-800/80 border border-gray-700/80 rounded-lg p-3 backdrop-blur-sm self-start sticky top-24">
            {navContent}
        </nav>

        {/* Mobile Bottom Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900/80 border-t border-gray-700/80 backdrop-blur-lg p-1.5">
            <div className="grid grid-cols-8 gap-1">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-col items-center gap-1 py-1 rounded-md transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:ring-offset-gray-900 ${
                            activeTab === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                        aria-label={tab.name}
                        aria-pressed={activeTab === tab.id}
                    >
                         <tab.icon className="w-5 h-5" />
                         <span className="text-[10px] font-medium">{tab.name}</span>
                    </button>
                ))}
            </div>
        </nav>
    </>
  );
};

export default React.memo(Sidebar);