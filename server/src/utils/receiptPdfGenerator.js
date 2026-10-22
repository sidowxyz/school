// src/utils/receiptPdfGenerator.js
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Generate a PDF receipt and save it to the receipts folder.
 * Returns the absolute path to the saved PDF file.
 */
export const generateReceiptPDF = async ({
  studentName,
  paymentId,
  receiptNumber,
  amount,
  date,
  accNo,
  remarks,
}) => {
  const receiptsDir = path.join(process.cwd(), 'receipts');
  if (!fs.existsSync(receiptsDir)) {
    fs.mkdirSync(receiptsDir, { recursive: true });
  }

  const fileName = `${receiptNumber}.pdf`;
  const filePath = path.join(receiptsDir, fileName);

  const doc = new PDFDocument({ margin: 30 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fontSize(20).text('Rasiidka Lacag-bixinta', { align: 'center' });
  doc.moveDown();

  // Details
  doc.fontSize(12).text(`Magaca Ardayga: ${studentName}`);
  doc.text(`Payment ID: ${paymentId}`);
  doc.text(`Receipt Number: ${receiptNumber}`);
  doc.text(`Amount Paid: ${amount}`);
  doc.text(`Date: ${new Date(date).toLocaleDateString()}`);
  doc.text(`Account No: ${accNo || 'N/A'}`);
  if (remarks) doc.text(`Remarks: ${remarks}`);

  doc.end();

  // Wait for the file to be fully written
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return filePath;
};
