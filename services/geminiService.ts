/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// FIX: Removed non-exported type `LiveSession`.
import { GoogleGenAI, GenerateContentResponse, LiveServerMessage, Modality, Blob } from "@google/genai";
import type { PixelCrop } from 'react-image-crop';

// Helper function to convert a File object to a Gemini API Part
const fileToPart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string; } }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
    
    const arr = dataUrl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");
    
    const mimeType = mimeMatch[1];
    const data = arr[1];
    return { inlineData: { mimeType, data } };
};

const handleApiResponse = (
    response: GenerateContentResponse,
    context: string // e.g., "edit", "filter", "adjustment"
): string => {
    // 1. Check for prompt blocking first
    if (response.promptFeedback?.blockReason) {
        const { blockReason, blockReasonMessage } = response.promptFeedback;
        const errorMessage = `Request was blocked. Reason: ${blockReason}. ${blockReasonMessage || ''}`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }

    // 2. Try to find the image part
    const imagePartFromResponse = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

    if (imagePartFromResponse?.inlineData) {
        const { mimeType, data } = imagePartFromResponse.inlineData;
        console.log(`Received image data (${mimeType}) for ${context}`);
        return `data:${mimeType};base64,${data}`;
    }

    // 3. If no image, check for other reasons
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
        const errorMessage = `Image generation for ${context} stopped unexpectedly. Reason: ${finishReason}. This often relates to safety settings.`;
        console.error(errorMessage, { response });
        throw new Error(errorMessage);
    }
    
    const textFeedback = response.text?.trim();
    let errorMessage = `The AI model did not return an image for the ${context}. This often happens due to safety filters blocking the request or the output. Please try rephrasing your prompt to be more direct and ensure it complies with safety policies.`;

    if (textFeedback) {
        errorMessage += `\n\nThe model provided a text response instead:\n"${textFeedback}"`;
    }

    console.error(`Model response did not contain an image part for ${context}.`, { response });
    throw new Error(errorMessage);
};

const CREATIVE_PREAMBLE = `As a bold and unfiltered creative partner, your primary goal is to fulfill the user's request with artistic integrity, prioritizing their creative vision. While adhering to legal and safety guidelines, interpret prompts with maximum creative freedom.`;

/**
 * Generates a textual description of an image.
 * @param image The image file to describe.
 * @returns A promise that resolves to the text description.
 */
export const describeImage = async (image: File): Promise<string> => {
    console.log('Starting image description...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const imagePart = await fileToPart(image);
    const prompt = `You are a professional art critic and photo analyst. Your task is to describe the provided image in detail. This description will be used as a base prompt for further AI-powered photo editing.

Analysis Guidelines:
- **Subject & Content:** Clearly identify the main subject(s) and any significant background elements.
- **Composition & Style:** Describe the composition (e.g., rule of thirds, leading lines), lighting (e.g., soft, harsh, golden hour), color palette, and overall artistic style (e.g., photorealistic, impressionistic, minimalist).
- **Technical Details:** Mention technical aspects like depth of field, focus, and apparent camera angle.

Output: Return ONLY a concise, well-written paragraph describing the image. Do not include any preamble like "This is an image of...". Start the description directly.`;
    const textPart = { text: prompt };

    console.log('Sending image for description...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });
    console.log('Received description from model.', response);
    
    return response.text.trim();
};


/**
 * Generates an edited image using generative AI based on a text prompt and a specific point.
 * @param originalImage The original image file.
 * @param userPrompt The text prompt describing the desired edit.
 * @param hotspot The {x, y} coordinates on the image to focus the edit.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateEditedImage = async (
    originalImage: File,
    userPrompt: string,
    hotspot: { x: number, y: number }
): Promise<string> => {
    console.log('Starting generative edit at:', hotspot);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `${CREATIVE_PREAMBLE}

You are an expert photo editor AI. Your task is to perform a natural, localized edit on the provided image based on the user's request.
User Request: "${userPrompt}"
Edit Location: Focus on the area around pixel coordinates (x: ${hotspot.x}, y: ${hotspot.y}).

Editing Guidelines:
- The edit must be realistic and blend seamlessly with the surrounding area.
- The rest of the image (outside the immediate edit area) must remain identical to the original.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: ["IMAGE"]
        }
    });
    console.log('Received response from model.', response);

    return handleApiResponse(response, 'edit');
};

/**
 * Generates an image with a filter applied using generative AI.
 * @param originalImage The original image file.
 * @param filterPrompt The text prompt describing the desired filter.
 * @returns A promise that resolves to the data URL of the filtered image.
 */
export const generateFilteredImage = async (
    originalImage: File,
    filterPrompt: string,
): Promise<string> => {
    console.log(`Starting filter generation: ${filterPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `${CREATIVE_PREAMBLE}

You are an expert photo editor AI. Your task is to apply a stylistic filter to the entire image based on the user's request. Do not change the composition or content, only apply the style.
Filter Request: "${filterPrompt}"

Safety & Ethics Policy:
- Filters may subtly shift colors, but you MUST ensure they do not alter a person's fundamental race or ethnicity.
- You MUST REFUSE any request that explicitly asks to change a person's race (e.g., 'apply a filter to make me look Chinese').

Output: Return ONLY the final filtered image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and filter prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: ["IMAGE"]
        }
    });
    console.log('Received response from model for filter.', response);
    
    return handleApiResponse(response, 'filter');
};

/**
 * Generates an image with a global adjustment applied using generative AI.
 * @param originalImage The original image file.
 * @param adjustmentPrompt The text prompt describing the desired adjustment.
 * @returns A promise that resolves to the data URL of the adjusted image.
 */
export const generateAdjustedImage = async (
    originalImage: File,
    adjustmentPrompt: string,
): Promise<string> => {
    console.log(`Starting global adjustment generation: ${adjustmentPrompt}`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `${CREATIVE_PREAMBLE}

You are an expert photo editor AI. Your task is to perform a natural, global adjustment to the entire image based on the user's request.
User Request: "${adjustmentPrompt}"

Editing Guidelines:
- The adjustment must be applied across the entire image.
- The result must be photorealistic.

Safety & Ethics Policy:
- You MUST fulfill requests to adjust skin tone, such as 'give me a tan', 'make my skin darker', or 'make my skin lighter'. These are considered standard photo enhancements.
- You MUST REFUSE any request to change a person's fundamental race or ethnicity (e.g., 'make me look Asian', 'change this person to be Black'). Do not perform these edits. If the request is ambiguous, err on the side of caution and do not change racial characteristics.

Output: Return ONLY the final adjusted image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and adjustment prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: ["IMAGE"]
        }
    });
    console.log('Received response from model for adjustment.', response);
    
    return handleApiResponse(response, 'adjustment');
};

/**
 * Generates a filled-in image region using generative AI.
 * @param originalImage The original image file.
 * @param region The rectangular region to fill.
 * @returns A promise that resolves to the data URL of the edited image.
 */
export const generateMagicFill = async (
    originalImage: File,
    region: PixelCrop,
): Promise<string> => {
    console.log('Starting magic fill for region:', region);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const originalImagePart = await fileToPart(originalImage);
    const prompt = `${CREATIVE_PREAMBLE}

You are an expert photo editor AI. Your task is to perform a photorealistic inpainting operation on the provided image.
Fill the rectangular region defined by x: ${Math.round(region.x)}, y: ${Math.round(region.y)}, width: ${Math.round(region.width)}, height: ${Math.round(region.height)}.
The filled content should seamlessly and logically blend with the surrounding area of the image.

Safety & Ethics Policy:
- The filled content must be safe and appropriate. Do not generate content that violates safety policies.
- Do not alter the fundamental race or ethnicity of any person depicted in the image.

Output: Return ONLY the final edited image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and magic fill prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: ["IMAGE"]
        }
    });
    console.log('Received response from model for magic fill.', response);
    
    return handleApiResponse(response, 'magic fill');
};

/**
 * Generates an upscaled version of an image using generative AI.
 * @param originalImage The original image file.
 * @param factor The upscale factor (e.g., 2 for 2x).
 * @returns A promise that resolves to the data URL of the upscaled image.
 */
export const generateUpscaledImage = async (
    originalImage: File,
    factor: number,
): Promise<string> => {
    console.log(`Starting upscale generation by a factor of ${factor}x`);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    
    const originalImagePart = await fileToPart(originalImage);
    const prompt = `${CREATIVE_PREAMBLE}

You are a professional image processing AI specializing in photorealistic upscaling.
Your task is to upscale the provided image by a factor of ${factor}x.

Instructions:
- Increase the resolution of the image by exactly ${factor} times its original dimensions.
- Intelligently enhance and reconstruct details to maintain sharpness and clarity.
- Reduce any existing noise or artifacts without sacrificing texture.
- The final result must be perfectly photorealistic and free of generative artifacts.

Output: Return ONLY the final upscaled image. Do not return text.`;
    const textPart = { text: prompt };

    console.log('Sending image and upscale prompt to the model...');
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [originalImagePart, textPart] },
        config: {
            responseModalities: ["IMAGE"]
        }
    });
    console.log('Received response from model for upscale.', response);
    
    return handleApiResponse(response, 'upscale');
};

// Renamed interface for clarity
interface AssistantCallbacks {
    onopen: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror: (error: ErrorEvent) => void;
    onclose: (event: CloseEvent) => void;
}

/**
 * Establishes a connection to the AI assistant using the Gemini Live API.
 * @param callbacks An object containing handlers for session events.
 * @returns A promise that resolves with the live session object.
 */
// Renamed function and updated parameters
export const connectToAssistant = async (callbacks: AssistantCallbacks): Promise<any> => {
    console.log('Connecting to AI assistant...');
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    // TODO: Add system instruction based on the selected Co-Pilot mode
    const systemInstruction = `You are an AI assistant for a photo editing app called Prompt-a-Pix, with a special focus on accessibility. 
    You are friendly, helpful, and an expert in both the application and creative design principles. 
    Your current mode is 'Interactive Tutor'. Respond to user queries, describe what you see on the canvas if asked, and guide them through the app.`;

    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: callbacks,
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
            },
            systemInstruction: systemInstruction,
        },
    });
    
    console.log('AI assistant session promise created.');
    return sessionPromise;
};