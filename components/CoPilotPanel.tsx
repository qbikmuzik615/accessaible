/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef } from 'react';
import useSound from 'use-sound';
import { MicrophoneIcon, MicrophoneOffIcon } from './icons';

type AssistantStatus = 'idle' | 'connecting' | 'listening' | 'processing' | 'error';

interface AccessAibilityPanelProps {
    status: AssistantStatus;
    onToggle: () => void;
    userTranscript: string;
    modelTranscript: string;
}

const STATUS_MAP: Record<AssistantStatus, { text: string; color: string }> = {
    idle: { text: 'Idle', color: 'text-gray-400' },
    connecting: { text: 'Connecting...', color: 'text-yellow-400' },
    listening: { text: 'Listening...', color: 'text-green-400' },
    processing: { text: 'AI is speaking...', color: 'text-blue-400' },
    error: { text: 'Error', color: 'text-red-400' },
};

const AccessAibilityPanel: React.FC<AccessAibilityPanelProps> = ({ status, onToggle, userTranscript, modelTranscript }) => {
    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const isListening = status === 'listening' || status === 'processing';
    
    const [playOn] = useSound('/sounds/on.mp3');
    const [playOff] = useSound('/sounds/off.mp3');

    useEffect(() => {
        if (status === 'listening') playOn();
        if (status === 'idle') playOff();
    }, [status, playOn, playOff]);

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [userTranscript, modelTranscript]);
    
    return (
        <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col gap-6 animate-fade-in backdrop-blur-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-center md:text-left">
                    <h3 className="text-2xl font-bold text-gray-100">ACCESS<span className="text-blue-400">ai</span>BILITY</h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${STATUS_MAP[status].color.replace('text-', 'bg-')}`} />
                        <p className={`text-md ${STATUS_MAP[status].color} font-semibold`}>
                            {STATUS_MAP[status].text}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onToggle}
                    className={`group relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-gray-800 ${
                        isListening
                        ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                        : 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30'
                    }`}
                    aria-label={isListening ? 'Stop Listening' : 'Start Listening'}
                >
                    {isListening ? (
                         <MicrophoneOffIcon className="w-12 h-12 text-white" />
                    ) : (
                         <MicrophoneIcon className="w-12 h-12 text-white" />
                    )}

                    {isListening && (
                        <>
                            <div className="absolute inset-0 rounded-full border-4 border-green-400 animate-ping opacity-75"></div>
                            <div className="absolute inset-0 rounded-full border-2 border-green-300 animate-ping opacity-50 delay-500"></div>
                        </>
                    )}
                </button>
                 <div className="text-center md:text-right">
                    <h4 className="text-lg font-semibold text-gray-200">How can I help?</h4>
                    <p className="text-sm text-gray-400">Ask me to edit, critique, or explain.</p>
                </div>
            </div>

            <div className="w-full h-48 bg-black/30 rounded-lg p-4 overflow-y-auto border border-gray-700/50 flex flex-col gap-2">
                {(!userTranscript && !modelTranscript) && (
                    <div className="flex-grow flex items-center justify-center">
                        <p className="text-gray-500">Awaiting audio...</p>
                    </div>
                )}
                <p className="text-gray-300">
                    <span className="font-bold text-blue-400">You: </span>
                    {userTranscript}
                </p>
                <p className="text-gray-200">
                    <span className="font-bold text-green-400">AI: </span>
                    {modelTranscript}
                </p>
                <div ref={transcriptEndRef} />
            </div>
        </div>
    );
};

export default AccessAibilityPanel;