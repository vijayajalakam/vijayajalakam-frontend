import fs from 'fs';
import path from 'path';

const directories = [
  'd:/Websites/Vijayajalakam/vijayajalakam-frontend/src/features/reports/pages',
  'd:/Websites/Vijayajalakam/vijayajalakam-frontend/src/features/purchases/pages',
  'd:/Websites/Vijayajalakam/vijayajalakam-frontend/src/features/accounting/pages',
  'd:/Websites/Vijayajalakam/vijayajalakam-frontend/src/features/inventory/pages',
  'd:/Websites/Vijayajalakam/vijayajalakam-frontend/src/features/appointments/pages'
];

let reportFiles = [];

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.jsx')) {
          reportFiles.push(path.join(dir, file));
      }
    });
  }
});

const results = {};

reportFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const filename = path.basename(file);
  const actions = [];
  
  if (content.includes('onExport={')) actions.push('export');
  if (content.includes('handleDownload') || content.includes('/download')) actions.push('download');
  
  if (content.includes('InvoiceReport') || content.includes('BookingsPage') || content.includes('Edit3') || content.includes('handleEdit') || (content.includes('navigate') && content.includes('edit'))) {
     if (content.includes('Edit') || content.includes('<Edit')) {
         actions.push('edit'); 
     }
  }

  // Bookings page specific 
  if (filename === 'BookingsPage.jsx') {
      actions.push('edit');
      actions.push('call');
  }

  // InvoiceReportPage
  if (filename === 'InvoiceReport.jsx') {
      actions.push('edit');
  }

  if (content.includes('cancel') || content.includes('<XCircle')) actions.push('cancel');
  if (content.includes('settle') || content.includes('handleSettle')) actions.push('settle');
  if (content.includes('<Phone') || content.includes('tel:')) {
      if (!actions.includes('call')) actions.push('call');
  }
  if (content.includes('<CheckCircle') && content.includes('confirmed')) actions.push('confirm');

  if (actions.length > 0) {
    results[filename] = actions;
  }
});

fs.writeFileSync('d:/Websites/Vijayajalakam/vijayajalakam-frontend/actions_scan.json', JSON.stringify(results, null, 2));
console.log("SUCCESS");
