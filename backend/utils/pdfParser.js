// // utils/pdfParser.js

// import fs from "fs/promises";
// import { PDFParse } from "pdf-parse";

// /*
//  * Extract text from PDF file or buffer
//  * @param {string|Buffer} input - Path to PDF file OR Buffer containing PDF data
//  * @returns {Promise<{text: string, numPages: number}>}
//  */
// export const extractTextFromPDF = async (input) => {
//   try {
//     let dataBuffer;

//     // Handle both file path (string) and buffer input
//     if (typeof input === 'string') {
//       dataBuffer = await fs.readFile(input);
//     } else if (Buffer.isBuffer(input)) {
//       dataBuffer = input;
//     } else {
//       throw new Error('Invalid input: expected file path (string) or Buffer');
//     }

//     // pdf-parse expects a Uint8Array, not a Buffer
//     const parser = new PDFParse(new Uint8Array(dataBuffer));
//     const data = await parser.getText();

//     return {
//       text: data.text,
//       numPages: data.numpages,
//       info: data.info,
//     };
//   } catch (error) {
//     console.error("PDF parsing error:", error);
//     throw new Error("Failed to extract text from PDF");
//   }
// };





// utils/pdfParser.js

import pdf from "pdf-parse";

/*
 * Extract text from PDF buffer
 * @param {Buffer} buffer
 * @returns {Promise<{text: string, numPages: number}>}
 */
export const extractTextFromPDF = async (buffer) => {
  try {
    if (!buffer || buffer.length === 0) {
      throw new Error('Buffer is empty or invalid');
    }

    console.log(`[PDF Parse] Processing buffer of ${buffer.length} bytes`);
    
    // Parse PDF
    const data = await pdf(buffer);

    console.log(`[PDF Parse] ✅ PDF parsed successfully`);
    console.log(`[PDF Parse] Pages: ${data.numpages}`);
    console.log(`[PDF Parse] Text length: ${data.text?.length || 0}`);
    console.log(`[PDF Parse] First 100 chars: ${data.text?.substring(0, 100)}`);

    if (!data.text || data.text.trim().length === 0) {
      console.warn(`[PDF Parse] ⚠️ WARNING: PDF has no extractable text!`);
      // Return minimal data even if empty
      return {
        text: data.text || '',
        numPages: data.numpages || 0,
        info: data.info || {},
      };
    }

    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info,
    };
  } catch (error) {
    console.error(`[PDF Parse] ❌ ERROR:`, error.message || error);
    console.error(`[PDF Parse] Stack:`, error.stack);
    throw error;
  }
};