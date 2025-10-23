/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

/**
 * Converts a data URL string to a File object.
 * @param dataurl The data URL string.
 * @param filename The desired filename for the new File object.
 * @returns A File object.
 */
export const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    if (arr.length < 2) throw new Error("Invalid data URL");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch || !mimeMatch[1]) throw new Error("Could not parse MIME type from data URL");

    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
};


/**
 * Converts a Blob object to a base64 encoded string, without the data URL prefix.
 * @param blob The Blob object to convert.
 * @returns A promise that resolves to the base64 encoded string.
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove the data URL prefix e.g., "data:image/jpeg;base64,"
      const base64String = base64data.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
