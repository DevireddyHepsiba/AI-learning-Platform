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
    const data = await pdf(buffer);

    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info,
    };
  } catch (error) {
    console.error("❌ PDF parsing error:", error.message);
    throw error;
  }
};