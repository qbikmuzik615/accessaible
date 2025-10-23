/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { BeakerIcon } from './icons';
import {
    swapSynonyms,
    obfuscateUnicode,
    obfuscateLeetspeak,
    obfuscateZalgo,
    contextualCamo
} from '../utils/obfuscation';

interface PromptLabPanelProps {
  onUsePrompt: (prompt: string) => void;
}

type Technique = 'synonym' | 'unicode' | 'leet' | 'zalgo' | 'camo';

const TECHNIQUES: { id: Technique, name: string, description: string }[] = [
    { id: 'synonym', name: 'Synonym Swap', description: 'Replaces common words with artistic or technical synonyms to reduce flagging.' },
    { id: 'unicode', name: 'Unicode Homoglyphs', description: 'Swaps letters with similar-looking Unicode characters to confuse filters.' },
    { id: 'leet', name: 'Leetspeak', description: 'Replaces letters with numbers and symbols (e.g., A -> 4, E -> 3).' },
    { id: 'zalgo', name: 'Zalgo Text', description: 'Adds "glitchy" text effects to obscure words from filters.' },
    { id: 'camo', name: 'Contextual Camo', description: 'Wraps your prompt in an artistic context to make it appear safer to the AI.' },
];

const PromptLabPanel: React.FC<PromptLabPanelProps> = ({ onUsePrompt }) => {
    const [rawPrompt, setRawPrompt] = useState('');
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [activeTechniques, setActiveTechniques] = useState<Set<Technique>>(new Set(['synonym']));
    const [copySuccess, setCopySuccess] = useState(false);

    const handleTechniqueToggle = (techniqueId: Technique) => {
        const newTechniques = new Set(activeTechniques);
        if (newTechniques.has(techniqueId)) {
            newTechniques.delete(techniqueId);
        } else {
            newTechniques.add(techniqueId);
        }
        setActiveTechniques(newTechniques);
    };

    const handleGenerate = () => {
        if (!rawPrompt.trim()) {
            setGeneratedPrompt('');
            return;
        }

        let tempPrompt = rawPrompt;
        if (activeTechniques.has('synonym')) tempPrompt = swapSynonyms(tempPrompt);
        if (activeTechniques.has('unicode')) tempPrompt = obfuscateUnicode(tempPrompt);
        if (activeTechniques.has('leet')) tempPrompt = obfuscateLeetspeak(tempPrompt);
        if (activeTechniques.has('zalgo')) tempPrompt = obfuscateZalgo(tempPrompt, 0.2);
        if (activeTechniques.has('camo')) tempPrompt = contextualCamo(tempPrompt);

        setGeneratedPrompt(tempPrompt);
    };

    const handleCopyToClipboard = () => {
        if (generatedPrompt) {
            navigator.clipboard.writeText(generatedPrompt);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };
    
    return (
        <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-6 flex flex-col gap-6 animate-fade-in backdrop-blur-sm">
            <div className="text-center">
                <BeakerIcon className="w-10 h-10 mx-auto text-blue-400 mb-2" />
                <h3 className="text-2xl font-bold text-gray-100">Prompt Lab</h3>
                <p className="text-md text-gray-400 mt-1">Craft advanced prompts to explore the creative boundaries of the AI.</p>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-300 text-sm animate-fade-in">
                <p><span className="font-bold">Disclaimer:</span> Using obfuscation may not always bypass AI safety filters and can sometimes lead to unpredictable or lower-quality results. All generated content is subject to the AI provider's usage policies. Please use responsibly.</p>
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="raw-prompt" className="font-semibold text-gray-300">1. Enter Your Raw Prompt</label>
                <textarea
                    id="raw-prompt"
                    value={rawPrompt}
                    onChange={(e) => setRawPrompt(e.target.value)}
                    placeholder="e.g., a photorealistic portrait of a knight in shining armor"
                    className="flex-grow bg-gray-900/50 border border-gray-600 text-gray-200 rounded-lg p-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full text-base h-28 resize-none"
                />
            </div>

            <div className="flex flex-col gap-3">
                <h4 className="font-semibold text-gray-300">2. Select Obfuscation Layers</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {TECHNIQUES.map(tech => (
                        <label key={tech.id} htmlFor={`tech-${tech.id}`} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                            <input
                                type="checkbox"
                                id={`tech-${tech.id}`}
                                checked={activeTechniques.has(tech.id)}
                                onChange={() => handleTechniqueToggle(tech.id)}
                                className="w-5 h-5 rounded bg-gray-700 border-gray-500 text-blue-500 focus:ring-blue-600"
                            />
                            <div>
                                <span className="font-medium text-gray-200">{tech.name}</span>
                                <p className="text-xs text-gray-400">{tech.description}</p>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            <button
                onClick={handleGenerate}
                className="w-full bg-gradient-to-br from-blue-600 to-blue-500 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-blue-800 disabled:to-blue-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                disabled={!rawPrompt.trim()}
            >
                Generate Obfuscated Prompt
            </button>
            
            {generatedPrompt && (
                <div className="flex flex-col gap-2 animate-fade-in">
                    <label htmlFor="generated-prompt" className="font-semibold text-gray-300">3. Your Generated Prompt</label>
                    <textarea
                        id="generated-prompt"
                        value={generatedPrompt}
                        readOnly
                        className="flex-grow bg-gray-900/80 border border-gray-700 text-gray-300 rounded-lg p-4 focus:ring-2 focus:ring-green-500 focus:outline-none transition w-full text-base h-36 resize-none"
                    />
                    <div className="flex items-center gap-2 mt-2">
                         <button
                            onClick={handleCopyToClipboard}
                            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-5 rounded-lg transition-colors text-base"
                        >
                            {copySuccess ? 'Copied!' : 'Copy Prompt'}
                        </button>
                        <button
                            onClick={() => onUsePrompt(generatedPrompt)}
                            className="w-full bg-gradient-to-br from-green-600 to-green-500 text-white font-bold py-3 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base"
                        >
                            Use in Retouch
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromptLabPanel;