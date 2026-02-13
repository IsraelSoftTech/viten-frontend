import jsPDF from 'jspdf';

// Generate receipt for sale or debt
export const generateReceipt = (record, type = 'sale', appName = 'Shop Accountant', logoUrl = null, location = null, items = []) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const receiptWidth = pageWidth - 20; // Full width with margins
  const receiptHeight = pageHeight - 30; // Full height for one receipt per page
  const margin = 10;
  const startX = margin;
  const startY = margin;

  // Draw receipt border (professional dark border)
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.rect(startX, startY, receiptWidth, receiptHeight);

  // Header with professional gradient effect (skyblue to darker)
  doc.setFillColor(135, 206, 235); // Skyblue
  doc.rect(startX, startY, receiptWidth, 22, 'F');
  
  // Professional accent bar (darker blue)
  doc.setFillColor(70, 130, 180); // Steel blue
  doc.rect(startX, startY, receiptWidth, 3, 'F');
  
  // Decorative accent (professional grey)
  doc.setFillColor(128, 128, 128); // Professional grey
  doc.rect(startX + receiptWidth - 30, startY, 30, 22, 'F');

  // App Name / Company Name (white text on skyblue) - more prominent
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(appName.toUpperCase(), startX + 8, startY + 10);

  // Receipt Title (white text) - more prominent
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const receiptTitle = type === 'sale' ? 'SALES RECEIPT' : 'DEBT RECEIPT';
  doc.text(receiptTitle, startX + 8, startY + 17);

  // Location (below app name, if available) - white text on header
  if (location) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(location, startX + 8, startY + 20);
  }

  // Receipt Number and Date (Top Right - white text on grey accent)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const receiptNo = type === 'sale' 
    ? `SALE-${String(record.id).padStart(6, '0')}`
    : `DEBT-${String(record.id).padStart(6, '0')}`;
  doc.text(`Receipt No:`, startX + receiptWidth - 28, startY + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(receiptNo, startX + receiptWidth - 28, startY + 12);
  // Date in white and bold
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`Date: ${formatDate(record.date)}`, startX + receiptWidth - 28, startY + 16);
  
  if (type === 'debt') {
    // Due date also in white and bold
    doc.text(`Due: ${formatDate(record.date)}`, startX + receiptWidth - 28, startY + 20);
  }

  // Content area
  let currentY = startY + 28;

  // Client Information Section - more professional styling
  doc.setFillColor(245, 245, 250); // Very light blue-grey background
  doc.rect(startX + 5, currentY - 3, receiptWidth - 10, 18, 'F');
  
  // Border around client info
  doc.setDrawColor(200, 200, 220);
  doc.setLineWidth(0.3);
  doc.rect(startX + 5, currentY - 3, receiptWidth - 10, 18);
  
  doc.setTextColor(40, 40, 60); // Darker text for better readability
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

  // Item Details Table Header (Professional dark blue)
  doc.setFillColor(70, 130, 180); // Steel blue
  doc.rect(startX + 5, currentY, receiptWidth - 10, 7, 'F');
  
  // Table border
  doc.setDrawColor(50, 50, 70);
  doc.setLineWidth(0.3);
  doc.rect(startX + 5, currentY, receiptWidth - 10, 7);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', startX + 8, currentY + 5);
  doc.text('QTY', startX + 100, currentY + 5);
  doc.text('RATE', startX + 130, currentY + 5);
  doc.text('AMOUNT', startX + 160, currentY + 5);

  currentY += 9;

  // Item Details Row (professional white background with border)
  doc.setFillColor(255, 255, 255); // White
  doc.rect(startX + 5, currentY - 2, receiptWidth - 10, 8, 'F');
  
  // Border around item row
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.rect(startX + 5, currentY - 2, receiptWidth - 10, 8);
  
  doc.setTextColor(50, 50, 50); // Dark text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  
  const itemName = record.name || 'N/A';
  const qty = record.pcs || 1;
  const rate = type === 'sale' ? record.unit_price : record.unit_price;
  const amount = record.total_price || (qty * rate);

  // Item name (may need to wrap if too long)
  const itemLines = doc.splitTextToSize(itemName, 80);
  doc.text(itemLines[0], startX + 8, currentY + 4);
  doc.text(String(qty), startX + 100, currentY + 4);
  doc.text(formatCurrencyValue(rate), startX + 130, currentY + 4);
  doc.text(formatCurrencyValue(amount), startX + 160, currentY + 4);

  currentY += 10;

  // Summary Section - more professional
  currentY += 4;
  doc.setDrawColor(180, 180, 180); // Professional grey line
  doc.setLineWidth(0.5);
  doc.line(startX + 5, currentY, startX + receiptWidth - 5, currentY);
  currentY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  
  // Subtotal
  const subtotal = amount;
  doc.text('Sub Total:', startX + 130, currentY);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrencyValue(subtotal), startX + 160, currentY);
  currentY += 6;

  if (type === 'debt') {
    // Amount Payable Now
    doc.setFont('helvetica', 'normal');
    doc.text('Amount Paid:', startX + 130, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencyValue(record.amount_payable_now || 0), startX + 160, currentY);
    currentY += 6;

    // Balance Owed
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 50, 50); // Red for balance owed
    doc.text('Balance Owed:', startX + 130, currentY);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencyValue(record.balance_owed || 0), startX + 160, currentY);
    currentY += 6;
    doc.setTextColor(50, 50, 50);
  }

  // Grand Total (Professional dark blue background)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setFillColor(70, 130, 180); // Steel blue background
  doc.rect(startX + 125, currentY - 2, receiptWidth - 130, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text('GRAND TOTAL:', startX + 128, currentY + 3);
  doc.text(formatCurrencyValue(subtotal), startX + 160, currentY + 3);
  currentY += 10;

  // Customer acknowledgment before services/items - blue background with white text, centered
  const customerName = record.client_name || 'Customer';
  const acknowledgmentText = `${customerName} received the above goods in good conditions`;
  const acknowledgmentHeight = 8;
  const acknowledgmentWidth = receiptWidth - 10;
  const acknowledgmentX = startX + 5;
  
  // Draw blue background
  doc.setFillColor(70, 130, 180); // Steel blue
  doc.rect(acknowledgmentX, currentY, acknowledgmentWidth, acknowledgmentHeight, 'F');
  
  // Draw white text, centered
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(acknowledgmentText, startX + receiptWidth / 2, currentY + 5, { align: 'center' });
  currentY += acknowledgmentHeight + 5;

  // Items/Services list - display if available
  if (items && items.length > 0) {
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const itemsText = `${appName} also sells the following items:`;
    doc.text(itemsText, startX + 8, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    items.forEach((item, index) => {
      doc.text(`${index + 1}) ${item}`, startX + 8, currentY);
      currentY += 4;
    });
    currentY += 3;
  }

  // Signature section - signature lines format
  currentY += 10;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(startX + 5, currentY, startX + receiptWidth - 5, currentY);
  currentY += 12;

  // Signature labels and lines side by side
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  // Left side: Customer Sign
  doc.text('Customer Sign', startX + 8, currentY);
  currentY += 5;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  const signatureLineY = currentY;
  const leftSignatureWidth = 80;
  doc.line(startX + 8, currentY, startX + 8 + leftSignatureWidth, currentY);
  
  // Right side: Viten Electronics
  doc.text('Viten Electronics', startX + receiptWidth / 2 + 8, currentY - 5);
  const rightSignatureWidth = 80;
  doc.line(startX + receiptWidth / 2 + 8, currentY, startX + receiptWidth / 2 + 8 + rightSignatureWidth, currentY);
  
  currentY = signatureLineY + 15;

  // Footer - more professional
  currentY = startY + receiptHeight - 15;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(startX + 5, currentY, startX + receiptWidth - 5, currentY);
  currentY += 5;
  
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120); // Professional grey text
  doc.setFont('helvetica', 'italic');
  doc.text('thanks for doing business with us, wish you the best', startX + receiptWidth / 2, currentY, { align: 'center' });
  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Generated by ' + appName, startX + receiptWidth / 2, currentY, { align: 'center' });

  // Generate filename
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = type === 'sale' 
    ? `${appName.replace(/\s+/g, '-')}-Sale-${record.id}-${timestamp}.pdf`
    : `${appName.replace(/\s+/g, '-')}-Debt-${record.id}-${timestamp}.pdf`;

  // Save the PDF
  doc.save(filename);
};

// Format date for receipt - returns "Wednesday 05/02/2025"
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${dayName} ${day}/${month}/${year}`;
};

// Format currency value (without symbol, just number)
const formatCurrencyValue = (amount) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};
