import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Generates a PDF report for a tithing task.
 * @param {object} task - The task object from Firestore, including the summary.
 * @param {Array<object>} dedications - An array of dedication objects from the subcollection.
 */
export const generateTithingReport = async (task, dedications) => {
  const doc = new jsPDF();

  // 1. Load and add the custom CJK font
  try {
    const fontResponse = await fetch('/fonts/NotoSansTC-Regular.ttf');
    const font = await fontResponse.arrayBuffer();
    const fontBase64 = btoa(String.fromCharCode.apply(null, new Uint8Array(font)));
    
    doc.addFileToVFS('NotoSansTC-Regular.ttf', fontBase64);
    doc.addFont('NotoSansTC-Regular.ttf', 'NotoSansTC', 'normal');
    doc.setFont('NotoSansTC');
  } catch (error) {
    console.error("Could not load font. Chinese characters may not render correctly.", error);
    // Continue without the font, with a console warning.
  }

  // 2. Set up the header
  const reportDate = task.calculationTimestamp?.toDate() || new Date();
  const title = `改革宗長老會板橋主恩教會 ${reportDate.getFullYear()}年 ${reportDate.getMonth() + 1}月 ${reportDate.getDate()}日 收支表`;
  
  doc.setFontSize(18);
  doc.text(title, 105, 20, { align: 'center' });

  // 3. Create the summary table (Income Summary)
  const summary = task.summary || { byCategory: {}, totalAmount: 0 };
  const summaryBody = Object.entries(summary.byCategory).map(([category, amount]) => [
    category,
    amount.toLocaleString(),
    '' // Placeholder for "憑證"
  ]);

  doc.autoTable({
    startY: 30,
    head: [['奉獻科目', '金額', '憑據']],
    body: summaryBody,
    foot: [['收入合計', summary.totalAmount.toLocaleString(), '']],
    theme: 'grid',
    headStyles: { font: 'NotoSansTC', fillColor: [220, 220, 220], textColor: 20 },
    bodyStyles: { font: 'NotoSansTC' },
    footStyles: { font: 'NotoSansTC', fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 20 },
    columnStyles: { 1: { align: 'right' } },
  });

  // 4. Create the breakdown table (Income Breakdown)
  const breakdownBody = dedications.map(d => [
    d.dedicatorId,
    d.dedicationCategory,
    d.amount.toLocaleString(),
    d.method === 'cash' ? '現金' : '支票'
  ]);

  doc.autoTable({
    startY: doc.autoTable.previous.finalY + 15,
    head: [['奉獻者代號', '奉獻科目', '奉獻款額', '現金/支票']],
    body: breakdownBody,
    foot: [['收入合計', '', summary.totalAmount.toLocaleString(), '']],
    theme: 'grid',
    headStyles: { font: 'NotoSansTC', fillColor: [220, 220, 220], textColor: 20 },
    bodyStyles: { font: 'NotoSansTC' },
    footStyles: { font: 'NotoSansTC', fontStyle: 'bold', fillColor: [220, 220, 220], textColor: 20 },
    columnStyles: { 2: { align: 'right' } },
  });

  // 5. Add the signature footer
  const finalY = doc.autoTable.previous.finalY;
  let signatureY = finalY + 30;
  if (finalY > 240) {
    doc.addPage();
    signatureY = 30;
  }
  doc.setFontSize(12);
  doc.text('司庫同工: __________', 20, signatureY);
  doc.text('財務同工: __________', 80, signatureY);
  doc.text('出納: __________', 140, signatureY);
  doc.text('會計: __________', 20, signatureY + 15);

  // 6. Save the PDF
  const fileName = `奉獻報表_${reportDate.toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
