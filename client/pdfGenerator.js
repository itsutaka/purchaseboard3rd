// client/pdfGenerator.js

import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

const toMinguoDateString = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '日期無效';
  const year = d.getFullYear() - 1911;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `中華民國 ${year} 年 ${month} 月 ${day} 日`;
};

const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

export const generateVoucherPDF = async (records, currentUser) => {
  const recordsArray = Array.isArray(records) ? records : [records];
  
  if (recordsArray.length === 0) {
    alert("沒有可匯出的紀錄。");
    return;
  }

  try {
    const doc = new jsPDF();

    const fontResponse = await fetch('/fonts/NotoSansTC-Regular.ttf');
    const fontBuffer = await fontResponse.arrayBuffer();
    const fontBase64 = arrayBufferToBase64(fontBuffer);
    const fontName = 'NotoSansTC-Regular.ttf';
    doc.addFileToVFS(fontName, fontBase64);
    doc.addFont(fontName, 'NotoSansTC', 'normal');
    doc.setFont('NotoSansTC');

    const totalAmount = recordsArray.reduce((sum, rec) => sum + (rec.purchaseAmount || 0), 0);
    const preparerName = currentUser?.displayName || recordsArray[0]?.purchaserName || 'N/A';
    const voucherDate = toMinguoDateString(new Date());

    doc.setFontSize(18);
    doc.text('轉帳傳票 (板橋主恩教會)', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`${preparerName}`, 20, 35);
    doc.text('代墊費用請款單', 40, 35);
    doc.text(voucherDate, 80, 35);
    doc.text('付單據＿＿＿＿張', 140, 35);

    const tableRows = recordsArray.map(rec => ([
      rec.accountingCategory || 'N/A',
      rec.title,
      (rec.purchaseAmount || 0).toLocaleString(),
      '',
      '',
      ''
    ]));
    
    if (recordsArray.length === 1) {
      tableRows[0][3] = '銀行存款';
      tableRows[0][5] = totalAmount.toLocaleString();
    }

    autoTable(doc, {
      startY: 50,
      head: [
        [ 
          { content: '(借方)', colSpan: 3, styles: { halign: 'center' } },
          { content: '(貸方)', colSpan: 3, styles: { halign: 'center' } }
        ],
        ['會計科目', '摘要', '金額', '會計科目', '摘要', '金額']
      ],
      body: tableRows,
      theme: 'grid',
      // --- FINAL FIX: 明確指定表頭和內容的字體與樣式 ---
      headStyles: {
        font: 'NotoSansTC',      // 為表頭指定字體
        fontStyle: 'normal',   // 強制使用 normal 樣式，避免預設的 bold
        fillColor: [230, 230, 230],
        textColor: 20
      },
      bodyStyles: {
        font: 'NotoSansTC'       // 確保內容區域也使用正確字體
      },
      didDrawPage: (data) => {
        const totalY = data.cursor.y + 10;
        doc.setFont('NotoSansTC');
        doc.setFontSize(12);
        
        doc.text('合計:', 90, totalY);
        doc.text(`$ ${totalAmount.toLocaleString()}`, 125, totalY, { align: 'right' });
        doc.text('合計:', 160, totalY);
        doc.text(`$ ${totalAmount.toLocaleString()}`, 195, totalY, { align: 'right' });

        const footerY = doc.internal.pageSize.getHeight() - 30;
        doc.text('財務執事(同工)：___________', 20, footerY);
        doc.text('會計：___________', 90, footerY);
        doc.text('出納：___________', 150, footerY);
      }
    });

    const fileNameTitle = recordsArray[0]?.title ? String(recordsArray[0].title).slice(0, 10) : 'Voucher';
    
    const fileName = recordsArray.length > 1 
      ? `轉帳傳票-批次匯出-${Date.now()}.pdf`
      : `轉帳傳票-${fileNameTitle}.pdf`;
      
    doc.save(fileName);

  } catch (error) {
    console.error("生成 PDF 失敗:", error);
    alert(`無法生成 PDF：${error.message}`);
  }
};