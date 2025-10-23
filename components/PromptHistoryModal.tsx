/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import type { PromptHistoryEntry } from '../App';

interface PromptHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: PromptHistoryEntry[];
  onUsePrompt: (prompt: string) => void;
}

const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
    </svg>
);


const PromptHistoryModal: React.FC<PromptHistoryModalProps> = ({ isOpen, onClose, history, onUsePrompt }) => {
    if (!isOpen) return null;
    
    const reversedHistory = [...history].reverse();

    const formatTimestamp = (timestamp: number) => {
        return new Intl.DateTimeFormat('default', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        }).format(new Date(timestamp));
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
        >
            <div 
                className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl p-8 flex flex-col gap-6 text-white max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="history-modal-title" className="text-2xl font-bold text-center">Prompt & Action History</h2>
                
                <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4">
                    {reversedHistory.length > 0 ? reversedHistory.map(entry => (
                        <div key={entry.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/80">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2">
                                        {entry.isStarred && <StarIcon className="w-5 h-5 text-yellow-400 flex-shrink-0" />}
                                        <span className="font-semibold text-blue-400">{entry.type}</span>
                                    </div>
                                    <p className="mt-1 text-gray-300 break-words">{entry.content}</p>
                                    <p className="text-xs text-gray-500 mt-2">{formatTimestamp(entry.timestamp)}</p>
                                </div>
                                <div className="flex flex-col gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => onUsePrompt(entry.content)}
                                        className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm"
                                    >
                                        Use
                                    </button>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(entry.content)}
                                        className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 py-8">No history recorded for this session yet.</p>
                    )}
                </div>

                <div className="flex items-center gap-4 mt-4">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 focus-visible:ring-offset-gray-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PromptHistoryModal;