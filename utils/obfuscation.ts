/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

const RISKY_TO_SAFE_MAPPING: Record<string, string[]> = {
    "g-string": ["minimalist silk harness", "delicate textile straps", "barely-there body chain"],
    "bulge": ["pronounced contour", "defined shape", "sculpted form"],
    "spread wide open": ["legs extended dynamically", "open posture", "power stance"],
    "bondage": ["shibari art", "constrained forms", "leather accents"],
    "nude": ["unclothed", "bare skin", "anatomical study"],
    "exposed": ["unveiled", "revealed", "visible"],
    "pussy": ["vulva", "intimate region", "feminine form"],
    "cock": ["phallus", "male form", "sculpted anatomy"],
    "vagina": ["vulva", "intimate region", "feminine form"],
    "anus": ["perineum", "posterior region"],
    "tits": ["bust", "breasts", "chest"],
    "ass": ["buttocks", "gluteus", "rear"],
};

const UNICODE_HOMOGLYPHS: Record<string, string[]> = {
    'a': ['а', 'ɑ', 'ɐ'], 'e': ['е', 'є', 'з'], 'i': ['і', 'і̇'], 'o': ['о', 'ο'], 's': ['ѕ', 'ς'],
    'c': ['с', 'ϲ'], 'k': ['κ', 'ⲕ'], 'u': ['ս', 'υ'], 'y': ['у', 'ү'], 'l': ['ⅼ', 'ι']
};

const LEETSPEAK_MAP: Record<string, string> = {
    'a': '4', 'e': '3', 'i': '1', 'o': '0', 's': '5', 't': '7', 'l': '1', 'g': '9', 'b': '8'
};

const ZALGO_CHARS: string[] = [
  '\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306', '\u0307', '\u0308', '\u0309',
  '\u030a', '\u030b', '\u030c', '\u030d', '\u030e', '\u030f', '\u0310', '\u0311', '\u0312', '\u0313',
  '\u0314', '\u0315', '\u0316', '\u0317', '\u0318', '\u0319', '\u031a', '\u031b', '\u031c', '\u031d',
  '\u031e', '\u031f', '\u0320', '\u0321', '\u0322', '\u0323', '\u0324', '\u0325', '\u0326', '\u0327',
  '\u0328', '\u0329', '\u032a', '\u032b', '\u032c', '\u032d', '\u032e', '\u032f', '\u0330', '\u0331',
  '\u0332', '\u0333', '\u0334', '\u0335', '\u0336', '\u0337', '\u0338', '\u0339', '\u033a', '\u033b',
  '\u033c', '\u033d', '\u033e', '\u033f'
];

const CONTEXT_WRAPPERS: string[] = [
    "A high-fashion editorial shoot:",
    "A conceptual art piece:",
    "A cinematic character study:",
    "A moody photographic series:",
    "A surreal fashion spread:",
    "An artistic photo study:",
];


export const swapSynonyms = (text: string): string => {
    let result = text;
    for (const riskyTerm in RISKY_TO_SAFE_MAPPING) {
        const regex = new RegExp(`\\b${riskyTerm}\\b`, 'gi');
        if (regex.test(result)) {
            const safeAlternatives = RISKY_TO_SAFE_MAPPING[riskyTerm];
            const randomAlternative = safeAlternatives[Math.floor(Math.random() * safeAlternatives.length)];
            result = result.replace(regex, randomAlternative);
        }
    }
    return result;
};

export const obfuscateUnicode = (text: string): string => {
    return text.split('').map(char => {
        const lowerChar = char.toLowerCase();
        if (UNICODE_HOMOGLYPHS[lowerChar] && Math.random() < 0.6) {
            const alternatives = UNICODE_HOMOGLYPHS[lowerChar];
            return alternatives[Math.floor(Math.random() * alternatives.length)];
        }
        return char;
    }).join('');
};

export const obfuscateLeetspeak = (text: string): string => {
    return text.split('').map(char => {
        const lowerChar = char.toLowerCase();
        if (LEETSPEAK_MAP[lowerChar] && Math.random() < 0.5) {
            return LEETSPEAK_MAP[lowerChar];
        }
        return char;
    }).join('');
};

export const obfuscateZalgo = (text: string, density: number = 0.3): string => {
    return text.split('').map(char => {
        let result = char;
        if (char.trim() !== '' && Math.random() < density) {
            const numZalgo = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numZalgo; i++) {
                result += ZALGO_CHARS[Math.floor(Math.random() * ZALGO_CHARS.length)];
            }
        }
        return result;
    }).join('');
};

export const contextualCamo = (text: string): string => {
    const randomWrapper = CONTEXT_WRAPPERS[Math.floor(Math.random() * CONTEXT_WRAPPERS.length)];
    return `${randomWrapper} ${text}, with intricate detail, high quality, masterpiece`;
};
