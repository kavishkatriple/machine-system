// Google Apps Script Code
// This code goes in Google Apps Script (script.google.com)
// It receives data from operators and organizes into daily sheets

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE', // Get this from your Google Sheet URL
  
  FACTORIES: ['THHM', 'THAM', 'THGI', 'THMM', 'THKN'],
  
  MACHINE_TYPES: [
    'Over Lock',
    'Right Cutter',
    'Left Cutter',
    'Bar Tack',
    'Flat Seam',
    'Ringer',
    'Single Needle',
    'Head Seal',
    'Flat Bed'
  ],
  
  STATUS_TYPES: [
    'Absent',
    'No Allocation/Idle',
    'Feeding',
    'Line Balancing',
    'Replace',
    'Additional',
    'Breakdown'
  ]
};

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Handle GET requests (shows a simple status page)
 */
function doGet(e) {
  const output = {
    status: 'online',
    message: 'Machine Daily Recording System is running.',
    timestamp: new Date().toISOString(),
    factories: CONFIG.FACTORIES,
    machineTypes: CONFIG.MACHINE_TYPES,
    statusTypes: CONFIG.STATUS_TYPES
  };
  
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests from operator forms
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // Validate required fields
    if (!data.date || !data.factory || !data.ownership) {
      throw new Error('Missing required fields: date, factory, and ownership are required.');
    }
    
    // Validate factory is in allowed list
    if (CONFIG.FACTORIES.indexOf(data.factory) === -1) {
      throw new Error('Invalid factory: ' + data.factory + '. Must be one of: ' + CONFIG.FACTORIES.join(', '));
    }
    
    // Validate ownership type
    if (data.ownership !== 'Owned' && data.ownership !== 'Rent') {
      throw new Error('Invalid ownership type: ' + data.ownership + '. Must be "Owned" or "Rent".');
    }
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD, got: ' + data.date);
    }
    
    // Validate machines data exists
    if (!data.machines || !Array.isArray(data.machines) || data.machines.length === 0) {
      throw new Error('No machine data provided.');
    }
    
    // Get or create sheet for the date
    const dateSheet = getOrCreateDateSheet(data.date);
    
    // Add data to the sheet
    addDataToSheet(dateSheet, data);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Data saved successfully for ' + data.factory + ' (' + data.ownership + ') on ' + data.date
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Get or create a sheet for a specific date
 */
function getOrCreateDateSheet(dateString) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  
  // Format date for sheet name (e.g., "11/02" from "2026-02-11")
  const dateParts = dateString.split('-');
  const sheetName = dateParts[2] + '/' + dateParts[1];
  
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    // Create new sheet
    sheet = ss.insertSheet(sheetName);
    setupDailySheet(sheet, sheetName);
  }
  
  return sheet;
}

/**
 * Setup the structure of a daily sheet
 * Produces the exact layout:
 *   Row 7: [blank] [blank] THHM  [blank]  THAM  [blank]  THGI  [blank]  THMM  [blank]  THKN  [blank]
 *   Row 8: [blank] [blank] Owned  Rent    Owned  Rent    Owned  Rent    Owned  Rent    Owned  Rent
 *   Row 9+: Machine type headers with status sub-rows
 */
function setupDailySheet(sheet, sheetName) {
  // Clear sheet
  sheet.clear();
  
  // Title row
  sheet.getRange(1, 1).setValue('Daily Machine Recording - ' + sheetName);
  sheet.getRange(1, 1)
    .setFontSize(14)
    .setFontWeight('bold')
    .setFontColor('#1e3a5f');
  
  sheet.getRange(2, 1).setValue('Generated: ' + new Date().toLocaleString());
  sheet.getRange(2, 1)
    .setFontSize(9)
    .setFontColor('#888888');
  
  // Row 7: Factory headers
  var row7 = ['', ''];
  CONFIG.FACTORIES.forEach(function(factory) {
    row7.push(factory);
    row7.push(''); // Empty cell for "Rent" column
  });
  
  // Row 8: Owned/Rent subheaders
  var row8 = ['', ''];
  CONFIG.FACTORIES.forEach(function() {
    row8.push('Owned');
    row8.push('Rent');
  });
  
  // Write headers
  sheet.getRange(7, 1, 1, row7.length).setValues([row7]);
  sheet.getRange(8, 1, 1, row8.length).setValues([row8]);
  
  // Merge factory header cells (each factory spans 2 columns: Owned + Rent)
  for (var f = 0; f < CONFIG.FACTORIES.length; f++) {
    var startCol = 3 + (f * 2);
    sheet.getRange(7, startCol, 1, 2).merge().setHorizontalAlignment('center');
  }
  
  // Style factory headers (Row 7)
  sheet.getRange(7, 1, 1, row7.length)
    .setBackground('#1e3a5f')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setFontSize(11);
  
  // Style Owned/Rent headers (Row 8)
  sheet.getRange(8, 1, 1, row8.length)
    .setBackground('#4a86e8')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setFontSize(10);
  
  // Add machine types and status rows
  var currentRow = 9;
  
  CONFIG.MACHINE_TYPES.forEach(function(machineType) {
    // Machine type header row
    sheet.getRange(currentRow, 1).setValue(machineType);
    sheet.getRange(currentRow, 1, 1, row7.length)
      .setBackground('#d9ead3')
      .setFontWeight('bold')
      .setFontSize(10);
    
    currentRow++;
    
    // Status type rows (indented in column B)
    CONFIG.STATUS_TYPES.forEach(function(status) {
      sheet.getRange(currentRow, 2).setValue(status);
      sheet.getRange(currentRow, 2)
        .setFontSize(9);
      currentRow++;
    });
  });
  
  // Format column widths
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 140);
  for (var i = 3; i <= row7.length; i++) {
    sheet.setColumnWidth(i, 75);
  }
  
  // Freeze header rows and label columns
  sheet.setFrozenRows(8);
  sheet.setFrozenColumns(2);
  
  // Add borders to the data area
  var lastRow = sheet.getLastRow();
  var lastCol = row7.length;
  if (lastRow > 6 && lastCol > 0) {
    sheet.getRange(7, 1, lastRow - 6, lastCol).setBorder(
      true, true, true, true, true, true,
      '#b7b7b7', SpreadsheetApp.BorderStyle.SOLID
    );
  }
  
  // Center-align all data cells
  if (lastRow > 8 && lastCol > 2) {
    sheet.getRange(9, 3, lastRow - 8, lastCol - 2)
      .setHorizontalAlignment('center')
      .setNumberFormat('0');
  }
}

/**
 * Add operator data to the sheet
 */
function addDataToSheet(sheet, data) {
  var factoryCol = getFactoryColumn(data.factory, data.ownership);
  
  if (factoryCol === -1) {
    throw new Error('Invalid factory or ownership type: ' + data.factory + ' / ' + data.ownership);
  }
  
  // Find starting row (row 9 is first data row)
  var currentRow = 9;
  
  CONFIG.MACHINE_TYPES.forEach(function(machineType) {
    currentRow++; // Skip machine header row
    
    // Find the machine data
    var machineData = null;
    for (var i = 0; i < data.machines.length; i++) {
      if (data.machines[i].type === machineType) {
        machineData = data.machines[i];
        break;
      }
    }
    
    if (machineData) {
      CONFIG.STATUS_TYPES.forEach(function(status) {
        var value = machineData.statuses[status] || 0;
        
        if (value > 0) {
          // Add to existing value if cell already has data
          var cell = sheet.getRange(currentRow, factoryCol);
          var existingValue = cell.getValue();
          existingValue = (typeof existingValue === 'number') ? existingValue : 0;
          cell.setValue(existingValue + value);
        }
        
        currentRow++;
      });
    } else {
      currentRow += CONFIG.STATUS_TYPES.length;
    }
  });
  
  // Log the submission
  logSubmission(data);
}

/**
 * Get the column number for a factory and ownership type
 */
function getFactoryColumn(factory, ownership) {
  var factoryIndex = CONFIG.FACTORIES.indexOf(factory);
  
  if (factoryIndex === -1) return -1;
  
  // Column C is index 3 (A=1, B=2, C=3)
  // Each factory has 2 columns (Owned, Rent)
  var baseCol = 3 + (factoryIndex * 2);
  
  return ownership === 'Owned' ? baseCol : baseCol + 1;
}

/**
 * Log submissions for audit trail
 */
function logSubmission(data) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var logSheet = ss.getSheetByName('Submission Log');
  
  if (!logSheet) {
    logSheet = ss.insertSheet('Submission Log');
    logSheet.appendRow([
      'Timestamp',
      'Date',
      'Factory',
      'Ownership',
      'Operator Name',
      'Total Machines',
      'Raw Data'
    ]);
    logSheet.getRange(1, 1, 1, 7)
      .setBackground('#1e3a5f')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setFontSize(10);
    
    // Set column widths for the log sheet
    logSheet.setColumnWidth(1, 160);
    logSheet.setColumnWidth(2, 100);
    logSheet.setColumnWidth(3, 80);
    logSheet.setColumnWidth(4, 80);
    logSheet.setColumnWidth(5, 130);
    logSheet.setColumnWidth(6, 110);
    logSheet.setColumnWidth(7, 300);
    
    logSheet.setFrozenRows(1);
  }
  
  // Calculate total machines
  var totalMachines = 0;
  data.machines.forEach(function(machine) {
    var statuses = machine.statuses;
    for (var key in statuses) {
      if (statuses.hasOwnProperty(key)) {
        totalMachines += (statuses[key] || 0);
      }
    }
  });
  
  logSheet.appendRow([
    new Date(data.timestamp || new Date()),
    data.date,
    data.factory,
    data.ownership,
    data.operatorName || 'N/A',
    totalMachines,
    JSON.stringify(data)
  ]);
}

/**
 * Create summary sheet with aggregated data across all daily sheets
 */
function createSummarySheet() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var summarySheet = ss.getSheetByName('Summary');
  
  if (!summarySheet) {
    summarySheet = ss.insertSheet('Summary');
  }
  
  summarySheet.clear();
  
  // Title
  summarySheet.getRange(1, 1).setValue('📊 Summary Report');
  summarySheet.getRange(1, 1)
    .setFontSize(16)
    .setFontWeight('bold')
    .setFontColor('#1e3a5f');
  
  summarySheet.getRange(2, 1).setValue('Generated: ' + new Date().toLocaleString());
  summarySheet.getRange(2, 1).setFontSize(9).setFontColor('#888888');
  
  // Get all daily sheets (sheets with DD/MM format names)
  var sheets = ss.getSheets();
  var dailySheets = [];
  
  sheets.forEach(function(sheet) {
    var name = sheet.getName();
    if (/^\d{2}\/\d{2}$/.test(name)) {
      dailySheets.push(sheet);
    }
  });
  
  if (dailySheets.length === 0) {
    summarySheet.getRange(4, 1).setValue('No daily sheets found. Data will appear after first operator submission.');
    return;
  }
  
  // Summary header
  var row = 4;
  summarySheet.getRange(row, 1).setValue('Total Daily Sheets: ' + dailySheets.length);
  summarySheet.getRange(row, 1).setFontWeight('bold');
  row += 2;
  
  // Create per-factory totals across all days
  summarySheet.getRange(row, 1).setValue('Factory Totals (All Days Combined)');
  summarySheet.getRange(row, 1).setFontSize(12).setFontWeight('bold').setFontColor('#1e3a5f');
  row++;
  
  // Headers
  var summaryHeaders = ['Machine Type', 'Status'];
  CONFIG.FACTORIES.forEach(function(factory) {
    summaryHeaders.push(factory + ' Owned');
    summaryHeaders.push(factory + ' Rent');
  });
  summaryHeaders.push('TOTAL');
  
  summarySheet.getRange(row, 1, 1, summaryHeaders.length).setValues([summaryHeaders]);
  summarySheet.getRange(row, 1, 1, summaryHeaders.length)
    .setBackground('#1e3a5f')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(9);
  row++;
  
  // Aggregate data from all daily sheets
  CONFIG.MACHINE_TYPES.forEach(function(machineType) {
    // Machine type header
    var machineRow = [machineType, ''];
    for (var i = 0; i < CONFIG.FACTORIES.length * 2 + 1; i++) {
      machineRow.push('');
    }
    summarySheet.getRange(row, 1, 1, summaryHeaders.length).setValues([machineRow]);
    summarySheet.getRange(row, 1, 1, summaryHeaders.length).setBackground('#d9ead3').setFontWeight('bold');
    row++;
    
    CONFIG.STATUS_TYPES.forEach(function(status) {
      var statusRow = ['', status];
      var grandTotal = 0;
      
      CONFIG.FACTORIES.forEach(function(factory) {
        // Sum Owned column across all daily sheets
        var ownedTotal = sumFromDailySheets(dailySheets, machineType, status, factory, 'Owned');
        var rentTotal = sumFromDailySheets(dailySheets, machineType, status, factory, 'Rent');
        statusRow.push(ownedTotal || '');
        statusRow.push(rentTotal || '');
        grandTotal += ownedTotal + rentTotal;
      });
      
      statusRow.push(grandTotal || '');
      summarySheet.getRange(row, 1, 1, summaryHeaders.length).setValues([statusRow]);
      row++;
    });
  });
  
  // Format
  summarySheet.setFrozenRows(7);
  summarySheet.setColumnWidth(1, 120);
  summarySheet.setColumnWidth(2, 140);
  
  Logger.log('Summary sheet created/updated successfully.');
}

/**
 * Helper: Sum values for a specific machine/status/factory/ownership across all daily sheets
 */
function sumFromDailySheets(dailySheets, machineType, status, factory, ownership) {
  var total = 0;
  var factoryCol = getFactoryColumn(factory, ownership);
  
  // Calculate the row for this machine type + status
  var targetRow = 9; // First data row
  var found = false;
  
  for (var m = 0; m < CONFIG.MACHINE_TYPES.length; m++) {
    targetRow++; // Machine header row
    for (var s = 0; s < CONFIG.STATUS_TYPES.length; s++) {
      if (CONFIG.MACHINE_TYPES[m] === machineType && CONFIG.STATUS_TYPES[s] === status) {
        found = true;
        break;
      }
      targetRow++;
    }
    if (found) break;
  }
  
  if (!found) return 0;
  
  dailySheets.forEach(function(sheet) {
    try {
      var value = sheet.getRange(targetRow, factoryCol).getValue();
      if (typeof value === 'number') {
        total += value;
      }
    } catch (e) {
      // Sheet might not have enough rows/columns
    }
  });
  
  return total;
}

/**
 * Test function to verify setup - uses current date dynamically
 */
function testSetup() {
  var today = new Date();
  var year = today.getFullYear();
  var month = ('0' + (today.getMonth() + 1)).slice(-2);
  var day = ('0' + today.getDate()).slice(-2);
  var testDate = year + '-' + month + '-' + day;
  
  var sheet = getOrCreateDateSheet(testDate);
  Logger.log('✅ Setup verified! Sheet created: ' + sheet.getName());
  Logger.log('📅 Test date used: ' + testDate);
  Logger.log('🏭 Configured factories: ' + CONFIG.FACTORIES.join(', '));
  Logger.log('⚙️ Machine types: ' + CONFIG.MACHINE_TYPES.length);
  Logger.log('📊 Status types: ' + CONFIG.STATUS_TYPES.length);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get web app URL (run this once after deploying)
 */
function getWebAppUrl() {
  var url = ScriptApp.getService().getUrl();
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('🌐 Your Web App URL:');
  Logger.log(url);
  Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  Logger.log('Copy this URL and paste it into:');
  Logger.log('  1. operator_entry_form.html → SCRIPT_URL');
  Logger.log('  2. Share with operators');
  return url;
}

/**
 * Setup trigger for daily summary (optional)
 */
function setupDailyTrigger() {
  // Delete existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  
  // Create new daily trigger at midnight
  ScriptApp.newTrigger('createSummarySheet')
    .timeBased()
    .everyDays(1)
    .atHour(0)
    .create();
  
  Logger.log('✅ Daily trigger set up. Summary will update every day at midnight.');
}
