# Machine Daily Recording System - Setup & Usage Guide

## System Overview
This is a **mobile-first web application** for daily machine recording.
- **Operators** use the **Operator Entry Form** on their phones to submit counts.
- **Admins** use the **Admin Dashboard** on their PC/phone to view reports.
- **Data** is stored in **Google Sheets** (cloud) and **Local Storage** (backup).

---

## 🚀 1. Setup (First Time Only)
You need to connect the system to your Google Sheet.

### Step A: Google Sheet & Script
1. Go to [Google Sheets](https://sheets.google.com) and create a **blank new sheet**.
2. Go to **Extensions > Apps Script**.
3. **Delete any code** in the script editor and **paste the code** from `google_apps_script.js`.
4. **Save** the project (give it a name like "MachineRecorder").
5. **Run** the `setupPropterties` function (if available) or just click **Run > doPost** once to grant permissions (it will fail, that's expected, but it authorizes the script).
6. Click **Deploy > New Deployment**.
   - Select type: **Web app**.
   - Description: "v1".
   - Execute as: **Me**.
   - Who has access: **Anyone** (allows operators to submit data).
7. Copy the **Web App URL** (starts with `https://script.google.com/...`).

### Step B: Connect the Forms
1. Open `operator_entry_form.html` in a text editor (Notepad, VS Code).
   - Find `SCRIPT_URL = 'YOUR_GOOGLE_SCRIPT_URL_HERE'`.
   - Replace it with your **Web App URL**.
   - Save the file.
2. Open `admin_dashboard.html`.
   - Find `GOOGLE_SHEET_URL = 'YOUR_GOOGLE_SHEET_URL_HERE'`.
   - Replace it with your **Google Sheet Link** (the browser URL of your spreadsheet).
   - Save the file.

---

## 📱 2. How it Works for Operators
1. **Open the Link**: You send the `operator_entry_form.html` file (or hosted link) to operators.
2. **Fill Form**:
   - Select **Factory** (e.g., THHM).
   - Enter **Name** (optional).
   - Scroll down to each machine type.
   - Enter counts for **Owned** and **Rent** separately.
3. **Submit**:
   - Click **"Submit Record"**.
   - A spinner will show.
   - You get a **Success Message** (✅) when data is saved.
   - If offline, it says "Saved Locally" (will sync later if you re-submit).

---

## 📊 3. How it Works for Admins
1. **Open Dashboard**: Double-click `admin_dashboard.html`.
2. **View Data**:
   - See **Total Submissions** and **Daily Counts** at the top.
   - **Recent Submissions** table shows who submitted what.
3. **Analyze**:
   - **Factory Chart**: Shows which factory submits the most.
   - **Trend Chart**: Shows submission activity over the week.
4. **Manage**:
   - **Refresh**: Click "Refresh Data" to pull latest.
   - **Export**: Click "Export CSV" to get a file for Excel.
   - **Open Sheet**: Click "Open Google Sheet" to see the raw database.
   - **Delete**: Remove incorrect local records if needed.

---

## ❓ FAQ
**Q: Can I use it without internet?**
A: Yes! The form saves data **locally** to the phone. When you have internet, you can export/sync it (future feature: auto-sync). For now, it's best to submit when online.

**Q: Where is the data?**
A: All data is safe in your **Google Spreadsheet**. The Daily Sheets (e.g., `2023-10-27`) are created automatically.

**Q: How do I change Factory Names?**
A: Edit `admin_dashboard.html` and look for the `FACTORY_NAMES` list in the code.

**Q: Why "Owned" and "Rent"?**
A: Every machine status row now has two boxes so you can track company machines vs. rented machines separately.
