/**
 * ASTHA ELECTRONICS SOLUTION — Google Apps Script
 * Receives contact form submissions and appends them to a Google Sheet.
 *
 * SETUP STEPS:
 *  1. Open your Google Sheet → Extensions → Apps Script
 *  2. Paste this entire file into the editor (replace any existing code)
 *  3. Click  Deploy → New deployment
 *     · Type          : Web app
 *     · Execute as    : Me
 *     · Who has access: Anyone
 *  4. Click Deploy, grant permissions when prompted
 *  5. Copy the Web app URL  →  paste it into contact-form.js as APPS_SCRIPT_URL
 *
 * SHEET STRUCTURE (auto-created on first submission):
 *  A: Timestamp  |  B: Name  |  C: Email  |  D: Project Type  |  E: Message
 */

const SHEET_NAME = 'Inquiries';

function doPost(e) {
  try {
    const raw  = e.postData ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let   sheet = ss.getSheetByName(SHEET_NAME);

    // Auto-create sheet + headers if not present
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Name', 'Email', 'Project Type', 'Message']);
      sheet.setFrozenRows(1);

      // Style the header row
      const header = sheet.getRange(1, 1, 1, 5);
      header.setBackground('#1a1a2e');
      header.setFontColor('#5ef0d0');
      header.setFontWeight('bold');
    }

    sheet.appendRow([
      new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      (data.name        || '').trim(),
      (data.email       || '').trim(),
      (data.projectType || '').trim(),
      (data.message     || '').trim(),
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Quick test — run this function from the Apps Script editor
 * to verify the sheet connection before deploying.
 */
function testWrite() {
  const mock = {
    postData: {
      contents: JSON.stringify({
        name:        'Test User',
        email:       'test@example.com',
        projectType: 'PCB Layout',
        message:     'This is a test submission from Apps Script.',
      }),
    },
  };
  const result = doPost(mock);
  Logger.log(result.getContent());
}
