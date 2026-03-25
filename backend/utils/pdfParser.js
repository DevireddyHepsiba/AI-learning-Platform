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
    // 🔍 Validate buffer is actually a PDF (check magic bytes)
    if (!buffer || buffer.length < 4) {
      throw new Error('Buffer is empty or too small to be a valid PDF');
    }

    // Check for PDF magic bytes: %PDF
    const magicBytes = buffer.subarray(0, 4).toString('ascii');
    console.log('[PDF Parser] Magic bytes:', magicBytes);
    
    if (!magicBytes.startsWith('%PDF')) {
      throw new Error(`Invalid PDF magic bytes. Got: ${magicBytes}, expected: %PDF`);
    }

    console.log('[PDF Parser] Buffer validation passed:', buffer.length, 'bytes');

    // Parse the PDF with timeout
    const data = await Promise.race([
      pdf(buffer),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PDF parsing timeout (30s)')), 30000)
      ),
    ]);

    console.log('[PDF Parser] Successfully parsed:', {
      pages: data.numpages,
      textLength: data.text?.length || 0,
    });

    return {
      text: data.text || '',
      numPages: data.numpages,
      info: data.info,
    };
  } catch (error) {
    console.error('❌ PDF parsing error:', {
      message: error.message,
      bufferSize: buffer?.length,
      bufferType: buffer?.constructor?.name,
      stack: error.stack,
    });
    throw error;
  }
};