import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import { getLocalDate } from './date';

// Format date for receipt
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${dayName} ${day}/${month}/${year}`;
};

const formatCurrencyValue = (amount) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

// Black and white only
const setBw = (doc) => {
  doc.setDrawColor(0, 0, 0);
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(255, 255, 255);
};

// Generate barcode as data URL for 58mm receipt (CODE128, compact)
function getBarcodeDataUrl(text) {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: 1,
      height: 22,
      margin: 0,
      displayValue: true,
      fontOptions: 'bold',
      fontSize: 8
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    return null;
  }
}

// --- 58mm thermal receipt (small printer) - B&W, table design like report ---
function buildReceipt58mm(doc, record, type, opts) {
  const { appName, logoUrl, location, seller_name } = opts;
  const W = 58;
  const marginH = 3;
  const topMargin = 5;
  const contentW = W - marginH * 2;
  const rowH = 3;
  let y = topMargin;

  setBw(doc);
  doc.setLineWidth(0.2);

  // ----- Logo (if available) -----
  if (logoUrl) {
    try {
      const logoWidth = 35;
      const logoHeight = 15;
      doc.addImage(logoUrl, 'PNG', (W - logoWidth) / 2, y, logoWidth, logoHeight);
      y += logoHeight + 2;
    } catch (e) {
      console.warn('Failed to add logo to receipt:', e);
    }
  }

  // ----- Header -----
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(appName.toUpperCase(), W / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const title = type === 'sale' ? 'SALES RECEIPT' : 'DEBT RECEIPT';
  doc.text(title, W / 2, y, { align: 'center' });
  y += 3.5;
  if (location) {
    doc.text(location, W / 2, y, { align: 'center' });
    y += 3;
  }
  y += 2;
  doc.line(marginH, y, W - marginH, y);
  y += 4;

  // ----- Receipt No & Date (small table) -----
  const receiptNo = type === 'sale'
    ? `SALE-${String(record.id).padStart(6, '0')}`
    : `DEBT-${String(record.id).padStart(6, '0')}`;
  doc.setFillColor(240, 240, 240);
  doc.rect(marginH, y, contentW, rowH, 'F');
  doc.rect(marginH, y, contentW, rowH);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('No', marginH + 0.5, y + 2);
  doc.text('Date', marginH + 18, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(receiptNo, marginH + 0.5, y + rowH + 2);
  doc.text(formatDate(record.date), marginH + 18, y + rowH + 2);
  doc.rect(marginH, y + rowH, contentW, rowH);
  doc.line(marginH + 16, y, marginH + 16, y + rowH * 2);
  y += rowH * 2 + 3;

  // ----- Barcode -----
  const barcodeDataUrl = getBarcodeDataUrl(receiptNo);
  if (barcodeDataUrl) {
    const barcodeW = 44;
    const barcodeH = 10;
    doc.addImage(barcodeDataUrl, 'PNG', (W - barcodeW) / 2, y, barcodeW, barcodeH);
    y += barcodeH + 4;
  }
  doc.line(marginH, y, W - marginH, y);
  y += 3;

  // ----- Client table -----
  doc.setFillColor(240, 240, 240);
  doc.rect(marginH, y, contentW, 4, 'F');
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT', marginH + 1, y + 2.5);
  y += 4;
  const clientName = record.client_name || 'Walk-in';
  const clientPhone = record.client_phone || '';
  const clientText = clientName + (clientPhone ? ' | ' + clientPhone : '');
  doc.setFont('helvetica', 'normal');
  doc.rect(marginH, y, contentW, rowH, 'F');
  doc.rect(marginH, y, contentW, rowH);
  doc.text(doc.splitTextToSize(clientText, contentW - 2)[0] || clientText.substring(0, 20), marginH + 0.5, y + 2);
  y += rowH + 3;

  // ----- Items table (report-style bordered) -----
  const colW = [20, 5, 12, 13]; // Item, Qty, Rate, Amt
  doc.setFillColor(240, 240, 240);
  doc.rect(marginH, y, contentW, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('ITEMS', marginH + 1, y + 2.5);
  y += 4;
  doc.rect(marginH, y, contentW, rowH, 'F');
  doc.rect(marginH, y, contentW, rowH);
  let x = marginH;
  ['ITEM', 'QTY', 'RATE', 'AMT'].forEach((h, i) => {
    if (i > 0) doc.line(x, y, x, y + rowH);
    doc.text(h, x + 0.5, y + 2);
    x += colW[i];
  });
  y += rowH;
  const qty = record.pcs || 1;
  const rate = record.unit_price;
  const amount = record.total_price || (qty * rate);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4);
  doc.rect(marginH, y, contentW, rowH);
  x = marginH;
  const itemName = (record.name || 'N/A').substring(0, 18);
  doc.text(itemName, x + 0.5, y + 2);
  x += colW[0];
  doc.line(x, y, x, y + rowH);
  doc.text(String(qty), x + 0.5, y + 2);
  x += colW[1];
  doc.line(x, y, x, y + rowH);
  doc.text(formatCurrencyValue(rate), x + 0.5, y + 2);
  x += colW[2];
  doc.line(x, y, x, y + rowH);
  doc.text(formatCurrencyValue(amount), x + 0.5, y + 2);
  y += rowH;

  if (type === 'debt') {
    doc.rect(marginH, y, contentW, rowH);
    doc.text('Paid', marginH + 0.5, y + 2);
    doc.text(formatCurrencyValue(record.amount_payable_now || 0), marginH + contentW - colW[3] - 0.5, y + 2, { align: 'right' });
    y += rowH;
    doc.rect(marginH, y, contentW, rowH);
    doc.text('Balance', marginH + 0.5, y + 2);
    doc.text(formatCurrencyValue(record.balance_owed || 0), marginH + contentW - colW[3] - 0.5, y + 2, { align: 'right' });
    y += rowH;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.rect(marginH, y, contentW, rowH, 'F');
  doc.rect(marginH, y, contentW, rowH);
  doc.text('TOTAL', marginH + 0.5, y + 2);
  doc.text(formatCurrencyValue(amount), marginH + contentW - 0.5, y + 2, { align: 'right' });
  y += rowH + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  const customerName = record.client_name || 'Customer';
  const itemsReceivedText = (opts.items_received_message || '{customer} received the above items in good condition.').replace(/\{customer\}/gi, customerName);
  const ackLines = doc.splitTextToSize(itemsReceivedText, contentW);
  ackLines.forEach((line) => {
    doc.text(line, W / 2, y, { align: 'center' });
    y += 3;
  });
  y += 3;

  if (seller_name) {
    doc.setFont('helvetica', 'bold');
    doc.text("Seller's name: " + seller_name, W / 2, y, { align: 'center' });
    y += 4;
    doc.setFont('helvetica', 'normal');
  }

  doc.line(marginH, y, W - marginH, y);
  y += 4;
  doc.setFontSize(5);
  doc.text(opts.thank_you_message || 'Thank you for your business', W / 2, y, { align: 'center' });
  y += 3;
  doc.text('Generated by ' + appName, W / 2, y, { align: 'center' });
  y += 4;
}

// --- Normal A4 receipt - B&W, professional ---
function buildReceiptNormal(doc, record, type, opts) {
  const { appName, logoUrl, location, items, seller_name } = opts;
  const pageWidth = 210;
  const pageHeight = 297;
  const receiptWidth = pageWidth - 20;
  const receiptHeight = pageHeight - 30;
  const startX = 10;
  const startY = 10;
  let currentY = startY + 28;

  setBw(doc);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(startX, startY, receiptWidth, receiptHeight);

  doc.setFillColor(240, 240, 240);
  doc.rect(startX, startY, receiptWidth, 22, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.rect(startX, startY, receiptWidth, 22);

  // Add logo if available
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', startX + 40, startY + 2, 18, 18);
    } catch (e) {
      console.warn('Failed to add logo to receipt:', e);
    }
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(appName.toUpperCase(), startX + 8, startY + 10);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const receiptTitle = type === 'sale' ? 'SALES RECEIPT' : 'DEBT RECEIPT';
  doc.text(receiptTitle, startX + 8, startY + 17);
  if (location) {
    doc.setFontSize(7);
    doc.text(location, startX + 8, startY + 21);
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const receiptNo = type === 'sale'
    ? `SALE-${String(record.id).padStart(6, '0')}`
    : `DEBT-${String(record.id).padStart(6, '0')}`;
  doc.text('Receipt No:', startX + receiptWidth - 38, startY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(receiptNo, startX + receiptWidth - 38, startY + 12);
  doc.text(`Date: ${formatDate(record.date)}`, startX + receiptWidth - 38, startY + 16);
  if (type === 'debt') {
    doc.text(`Due: ${formatDate(record.date)}`, startX + receiptWidth - 38, startY + 20);
  }

  doc.setFillColor(248, 248, 248);
  doc.rect(startX + 5, currentY - 3, receiptWidth - 10, 18, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.rect(startX + 5, currentY - 3, receiptWidth - 10, 18);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT INFORMATION', startX + 8, currentY + 2);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (record.client_name) {
    doc.text(`Name: ${record.client_name}`, startX + 8, currentY);
    currentY += 4;
  }
  if (record.client_phone) {
    doc.text(`Phone: ${record.client_phone}`, startX + 8, currentY);
    currentY += 4;
  }
  if (!record.client_name && !record.client_phone) {
    doc.text('Walk-in Customer', startX + 8, currentY);
    currentY += 4;
  }
  currentY += 3;

  doc.setFillColor(240, 240, 240);
  doc.rect(startX + 5, currentY, receiptWidth - 10, 7, 'F');
  doc.rect(startX + 5, currentY, receiptWidth - 10, 7);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', startX + 8, currentY + 5);
  doc.text('QTY', startX + 100, currentY + 5);
  doc.text('RATE', startX + 130, currentY + 5);
  doc.text('AMOUNT', startX + 160, currentY + 5);
  currentY += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const itemName = record.name || 'N/A';
  const qty = record.pcs || 1;
  const rate = record.unit_price;
  const amount = record.total_price || (qty * rate);
  const itemLines = doc.splitTextToSize(itemName, 80);
  doc.text(itemLines[0], startX + 8, currentY + 4);
  doc.text(String(qty), startX + 100, currentY + 4);
  doc.text(formatCurrencyValue(rate), startX + 130, currentY + 4);
  doc.text(formatCurrencyValue(amount), startX + 160, currentY + 4);
  currentY += 10;

  currentY += 4;
  doc.setLineWidth(0.5);
  doc.line(startX + 5, currentY, startX + receiptWidth - 5, currentY);
  currentY += 6;
  doc.text('Sub Total:', startX + 130, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrencyValue(amount), startX + 160, currentY);
  currentY += 6;

  if (type === 'debt') {
    doc.setFont('helvetica', 'normal');
    doc.text('Amount Paid:', startX + 130, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencyValue(record.amount_payable_now || 0), startX + 160, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Balance Owed:', startX + 130, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencyValue(record.balance_owed || 0), startX + 160, currentY);
    currentY += 6;
    doc.setFont('helvetica', 'normal');
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setFillColor(240, 240, 240);
  doc.rect(startX + 125, currentY - 2, receiptWidth - 130, 7, 'F');
  doc.rect(startX + 125, currentY - 2, receiptWidth - 130, 7);
  doc.text('GRAND TOTAL:', startX + 128, currentY + 3);
  doc.text(formatCurrencyValue(amount), startX + 160, currentY + 3);
  currentY += 12;

  const customerName = record.client_name || 'Customer';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const itemsReceivedText = (opts.items_received_message || '{customer} received the above items in good condition.').replace(/\{customer\}/gi, customerName);
  doc.text(itemsReceivedText, startX + receiptWidth / 2, currentY + 4, { align: 'center' });
  currentY += 14;

  if (items && items.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${appName} also sells:`, startX + 8, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    items.forEach((item, index) => {
      doc.text(`${index + 1}) ${item}`, startX + 8, currentY);
      currentY += 4;
    });
    currentY += 3;
  }

  currentY += 8;
  doc.line(startX + 5, currentY, startX + receiptWidth - 5, currentY);
  currentY += 10;

  if (seller_name) {
    doc.setFont('helvetica', 'bold');
    doc.text("Seller's name:", startX + 8, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(seller_name, startX + 45, currentY);
    currentY += 8;
  }

  doc.line(startX + 5, currentY, startX + receiptWidth - 5, currentY);
  currentY = startY + receiptHeight - 15;
  doc.line(startX + 5, currentY, startX + receiptWidth - 5, currentY);
  currentY += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(opts.thank_you_message || 'Thank you for your business', startX + receiptWidth / 2, currentY, { align: 'center' });
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Generated by ' + appName, startX + receiptWidth / 2, currentY, { align: 'center' });
}

// --- 58mm repayment receipt (table design like report) ---
function buildReceipt58mmRepayment(doc, record, opts) {
  const { appName, logoUrl, location, seller_name } = opts;
  const W = 58;
  const marginH = 3;
  const topMargin = 5;
  const contentW = W - marginH * 2;
  const rowH = 3;
  let y = topMargin;
  setBw(doc);
  doc.setLineWidth(0.2);

  // ----- Logo (if available) -----
  if (logoUrl) {
    try {
      const logoWidth = 35;
      const logoHeight = 15;
      doc.addImage(logoUrl, 'PNG', (W - logoWidth) / 2, y, logoWidth, logoHeight);
      y += logoHeight + 2;
    } catch (e) {
      console.warn('Failed to add logo to receipt:', e);
    }
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(appName.toUpperCase(), W / 2, y, { align: 'center' });
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text('DEBT REPAYMENT RECEIPT', W / 2, y, { align: 'center' });
  y += 3.5;
  if (location) { doc.text(location, W / 2, y, { align: 'center' }); y += 3; }
  y += 2;
  doc.line(marginH, y, W - marginH, y);
  y += 4;

  // ----- Receipt No & Date table -----
  const receiptNo = record.receipt_number || 'REPAY-' + String(record.id).padStart(6, '0');
  doc.setFillColor(240, 240, 240);
  doc.rect(marginH, y, contentW, rowH, 'F');
  doc.rect(marginH, y, contentW, rowH);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text('No', marginH + 0.5, y + 2);
  doc.text('Date', marginH + 18, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.text(receiptNo, marginH + 0.5, y + rowH + 2);
  doc.text(formatDate(record.payment_date), marginH + 18, y + rowH + 2);
  doc.rect(marginH, y + rowH, contentW, rowH);
  doc.line(marginH + 16, y, marginH + 16, y + rowH * 2);
  y += rowH * 2 + 3;

  // ----- Details table (Debt Ref, Item, Client, Amount) -----
  doc.setFillColor(240, 240, 240);
  doc.rect(marginH, y, contentW, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('DETAILS', marginH + 1, y + 2.5);
  y += 4;
  const details = [
    ['Debt Ref', 'DEBT-' + String(record.debt_id).padStart(6, '0')],
    ['Item', (record.item_name || 'N/A').substring(0, 22)],
    ['Client', (record.client_name || record.client_phone || 'N/A').substring(0, 22)],
    ['Amount Paid', formatCurrencyValue(record.amount)]
  ];
  details.forEach(([label, value]) => {
    doc.rect(marginH, y, contentW, rowH);
    doc.line(marginH + 20, y, marginH + 20, y + rowH);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text(label, marginH + 0.5, y + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(value, marginH + 20.5, y + 2);
    y += rowH;
  });
  y += 3;

  if (seller_name) {
    doc.setFillColor(240, 240, 240);
    doc.rect(marginH, y, contentW, rowH, 'F');
    doc.rect(marginH, y, contentW, rowH);
    doc.setFont('helvetica', 'bold');
    doc.text("Seller's name", marginH + 0.5, y + 2);
    doc.setFont('helvetica', 'normal');
    doc.text(seller_name, marginH + 20.5, y + 2);
    y += rowH + 3;
  }

  doc.line(marginH, y, W - marginH, y);
  y += 4;
  doc.setFontSize(5);
  doc.text(opts.thank_you_message || 'Thank you for your business', W / 2, y, { align: 'center' });
  y += 3;
  doc.text('Generated by ' + appName, W / 2, y, { align: 'center' });
}

// --- Normal A4 repayment receipt ---
function buildReceiptNormalRepayment(doc, record, opts) {
  const { appName, logoUrl, location, seller_name } = opts;
  const startX = 10;
  const startY = 10;
  const receiptWidth = 190;
  const receiptHeight = 277;
  let currentY = startY + 28;
  setBw(doc);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.rect(startX, startY, receiptWidth, receiptHeight);
  doc.setFillColor(240, 240, 240);
  doc.rect(startX, startY, receiptWidth, 22, 'F');
  doc.rect(startX, startY, receiptWidth, 22);

  // Add logo if available
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', startX + 100, startY + 2, 18, 18);
    } catch (e) {
      console.warn('Failed to add logo to receipt:', e);
    }
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(appName.toUpperCase(), startX + 8, startY + 10);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('DEBT REPAYMENT RECEIPT', startX + 8, startY + 17);
  if (location) { doc.setFontSize(7); doc.text(location, startX + 8, startY + 21); }
  const receiptNo = record.receipt_number || 'REPAY-' + String(record.id).padStart(6, '0');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Receipt No:', startX + receiptWidth - 38, startY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(receiptNo, startX + receiptWidth - 38, startY + 12);
  doc.text('Date: ' + formatDate(record.payment_date), startX + receiptWidth - 38, startY + 16);
  currentY += 8;
  doc.setFillColor(248, 248, 248);
  doc.rect(startX + 5, currentY - 3, receiptWidth - 10, 28, 'F');
  doc.rect(startX + 5, currentY - 3, receiptWidth - 10, 28);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DEBT REF: DEBT-' + String(record.debt_id).padStart(6, '0'), startX + 8, currentY + 2);
  doc.setFont('helvetica', 'normal');
  doc.text('Item: ' + (record.item_name || 'N/A'), startX + 8, currentY + 8);
  doc.text('Client: ' + (record.client_name || record.client_phone || 'N/A'), startX + 8, currentY + 14);
  doc.text('Amount paid: ' + formatCurrencyValue(record.amount), startX + 8, currentY + 20);
  currentY += 32;
  if (seller_name) {
    doc.setFont('helvetica', 'bold');
    doc.text("Seller's name:", startX + 8, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(seller_name, startX + 45, currentY);
    currentY += 8;
  }
  currentY = startY + receiptHeight - 15;
  doc.line(startX + 5, currentY, startX + receiptWidth - 5, currentY);
  currentY += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(opts.thank_you_message || 'Thank you for your business', startX + receiptWidth / 2, currentY, { align: 'center' });
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Generated by ' + appName, startX + receiptWidth / 2, currentY, { align: 'center' });
}

/**
 * Generate receipt for sale, debt, or repayment.
 * @param {Object} record - Sale, debt, or repayment record
 * @param {'sale'|'debt'|'repayment'} type
 * @param {Object} options - { appName, logoUrl, location, items, seller_name, printerType: 'small'|'normal', action: 'download'|'print' }
 */
export const generateReceipt = (record, type = 'sale', options = {}) => {
  const {
    appName = 'Shop Accountant',
    logoUrl = null,
    location = null,
    items = [],
    seller_name = (record && record.seller_name) || '',
    thank_you_message = 'Thank you for your business',
    items_received_message = '{customer} received the above items in good condition.',
    printerType = 'normal',
    action = 'download'
  } = options;

  const opts = { appName, logoUrl, location, items, seller_name, thank_you_message, items_received_message };

  if (type === 'repayment') {
    if (printerType === 'small') {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [58, 297] });
      buildReceipt58mmRepayment(doc, record, opts);
      const filename = `${appName.replace(/\s+/g, '-')}-Repay-${record.id}.pdf`;
      if (action === 'print') {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const w = window.open(url, '_blank', 'width=400,height=600');
        if (w) w.onload = () => { setTimeout(() => w.print(), 400); };
        setTimeout(() => URL.revokeObjectURL(url), 15000);
      } else doc.save(filename);
      return;
    }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    buildReceiptNormalRepayment(doc, record, opts);
    const timestamp = getLocalDate();
    const filename = `${appName.replace(/\s+/g, '-')}-Repay-${record.id}-${timestamp}.pdf`;
    if (action === 'print') {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'width=800,height=600');
      if (w) w.onload = () => { setTimeout(() => w.print(), 400); };
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else doc.save(filename);
    return;
  }

  if (printerType === 'small') {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [58, 297]
    });
    buildReceipt58mm(doc, record, type, opts);
    const filename = type === 'sale'
      ? `${appName.replace(/\s+/g, '-')}-Sale-${record.id}.pdf`
      : `${appName.replace(/\s+/g, '-')}-Debt-${record.id}.pdf`;
    if (action === 'print') {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'width=400,height=600');
      if (w) {
        w.onload = () => { setTimeout(() => w.print(), 400); };
      }
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } else {
      doc.save(filename);
    }
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  buildReceiptNormal(doc, record, type, opts);
  const timestamp = getLocalDate();
  const filename = type === 'sale'
    ? `${appName.replace(/\s+/g, '-')}-Sale-${record.id}-${timestamp}.pdf`
    : `${appName.replace(/\s+/g, '-')}-Debt-${record.id}-${timestamp}.pdf`;
  if (action === 'print') {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank', 'width=800,height=600');
    if (w) {
      w.onload = () => { setTimeout(() => w.print(), 400); };
    }
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  } else {
    doc.save(filename);
  }
};
