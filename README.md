# StallPay – College Stall Management System
> **Official Digital Counter & UPI Verification System for Entrepreneur Club Stall Events**

StallPay is a modern, responsive, mobile-first web application engineered specifically for college fest stalls, clubs, and student entrepreneurship exhibitions. It solves long queues, untracked cash/UPI exchanges, and manual accounting headaches by providing a unified digital POS, customer stall pass generator, UPI QR checkout, manual UTR payment verification queue, inventory controller, and live net profit calculator.

---

## 🌟 Key Features

### 1. Home Page
- **Entrepreneur Club Fest Branding**: High-energy aesthetic with live stall status indicator (`🟢 Online • Accepting Orders`).
- **One-Click Role Routing**: Separate dedicated portals for **Customers** (Menu, Order, Stall Pass) and **Team Desk** (Verification, Analytics, Accounting).
- **Live Event Ticker**: Displays real-time Verified Sales (₹), Completed Orders count, Pending Verification queue, and Average Fest Rating.
- **Visual 3-Step Guide**: Explains the order-to-pickup workflow in simple steps.

### 2. Customer Registration & Digital Stall Pass
- **Quick 30-Second Signup**: Register with full name, 10-digit mobile number, and college/department.
- **Unique Customer ID**: Auto-generates unique IDs (e.g. `SP-CUST-8492`).
- **Dynamic Holographic Pass & QR Code**: Generates a student pass with an embedded QR code that stall volunteers can scan at the counter to load the customer profile instantly.
- **Account Switching & Login**: Existing customers can switch or re-login with just their phone number.

### 3. Stall Menu, Cart & UPI Payments
- **Dynamic Product Catalog**: Filter by category (*Snacks, Beverages, Desserts, Merch*) or search instantly.
- **Mobile Sticky Cart Drawer**: Add items with quantity controls, view subtotal, and add custom cooking/preparation notes.
- **Dynamic UPI Payment QR Code**:
  - Encodes standard NPCI UPI URI: `upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...`.
  - Works with **Google Pay**, **PhonePe**, **Paytm**, and **BHIM**.
  - One-click copy for the stall UPI ID.
  - Direct app launch buttons for mobile devices.
- **UTR Reference Submission**: Customers enter their 12-digit transaction reference number (UTR).

### 4. 🛡️ Crucial Verification Policy
> **Security First**: StallPay **never** marks a payment as successful just because a QR code was scanned or a UTR was entered.
- When an order is placed, its initial status is **strictly set to `PENDING`**.
- The customer confirmation screen displays an amber pulsing alert: `Payment Pending Team Verification ⏳`.
- Stall coordinators match the customer's UTR against real incoming bank SMS or merchant terminal notifications.
- When the team clicks **Approve**, the customer screen **instantly turns green (`VERIFIED ✅`) in real time** with celebratory confetti and sound chimes!
- StallPay **never stores or asks for UPI PINs or banking passwords**.

### 5. Team Operations Dashboard (PIN-Protected)
- **Secure Access**: Protected by 4-digit team access PIN (Default: `1234`, customizable in settings).
- **Live Pending Queue**: Shows customer name, phone, token number, ordered items, amount, and UTR with 1-click clipboard copy.
- **One-Click Approval / Rejection**: Approve verified bank transactions or reject invalid UTRs with a reason note.
- **Product & Inventory Manager**:
  - Add new products with categories, prices, emojis, and badges.
  - Quick toggle for "In Stock" / "Out of Stock".
  - Adjust prices or remove items.
- **Expense Logging & Net Profit Calculator**:
  - Record ingredient costs, stall rent, ice, packaging, and banners.
  - Computes: `Verified Revenue - Total Expenses = Net Profit (or Loss)` with live profit margin percentage.
- **Data Export**:
  - Download all transactions as a CSV spreadsheet.
  - Download all expenses as a CSV spreadsheet.

### 6. Customer Feedback & Review Wall
- Interactive 5-star rating system with quick tags (*Delicious Food, Super Fast, Great Value, Friendly Crew, Clean & Hygienic*).
- Live public review wall displaying customer testimonials and overall stall score.

### 7. Dual Real-Time Sync Architecture
- **Instant Out-of-the-Box Local & Cross-Tab Sync**: Uses `localStorage` and HTML5 `BroadcastChannel` so testing on multiple tabs or local windows updates instantaneously with zero setup or internet dependencies.
- **Supabase PostgreSQL & Realtime Cloud Sync**: Connect directly to your Supabase project with WebSocket realtime subscriptions across customer phones and stall laptops.
- **Firebase Firestore Ready**: Optional Firebase cloud connector also supported.

---

## ⚡ Connecting Supabase & Environment Files

StallPay now comes with dedicated environment files for both **Frontend** and **Backend**:

### 1. File Locations:
* `frontend/.env` – Contains public variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_BASE_URL`).
* `backend/.env` – Contains server variables & private keys (`PORT`, `SUPABASE_SERVICE_ROLE_KEY`, `TEAM_SECRET_PIN`).
* `.env` – Root unified file for local development.

### 2. Environment Variables Reference:

| Variable | Location | Description | Security Note |
| :--- | :--- | :--- | :--- |
| `SUPABASE_URL` | Frontend & Backend | Your Supabase project URL (`https://<id>.supabase.co`) | Public |
| `SUPABASE_ANON_KEY` | Frontend & Backend | Supabase public anonymous API key | Public (Client Safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend Only | Supabase master service role key | **STRICTLY PRIVATE (Server Only)** |
| `PORT` | Backend | Port for Node server (default `3000`) | Internal |
| `TEAM_SECRET_PIN` | Backend | Stall coordinator login PIN (default `1234`) | Private |
| `STALL_UPI_ID` | Frontend & Backend | Stall UPI VPA for payments (e.g. `stallpay.ecell@upi`) | Public |
| `STALL_PAYEE_NAME` | Frontend & Backend | Official merchant / club display name | Public |
| `API_BASE_URL` | Frontend | Backend API endpoint URL | Public |

### 3. Step-by-Step Supabase Setup:
1. Create a free project at [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** -> Click **New Query** -> Paste the contents of `supabase-schema.sql` -> Click **Run**.
3. In Supabase Dashboard, go to **Project Settings -> API**:
   - Copy **Project URL** and paste as `SUPABASE_URL`.
   - Copy **anon / public key** and paste as `SUPABASE_ANON_KEY` in `frontend/.env` and `backend/.env`.
   - Copy **service_role key** and paste as `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`.
4. In StallPay, click **Team Desk -> Supabase Sync** to test the connection or update credentials live in the UI!

---

## 🚀 Quick Start / How to Run

Because StallPay is built with modern web standards and modular JavaScript, you can run it immediately without complex compilation:

### Option 1: Simple Local Server (Recommended)
You can use any local HTTP server:

```powershell
# Using Python
python -m http.server 3000

# Using Node / npx
npx serve .
```
Then open `http://localhost:3000` in your web browser.

### Option 2: Direct Browser Launch
Simply double click `index.html` to open it in Chrome, Edge, Safari, or Firefox!

---

## 📱 How to Use at the College Stall

### For Stall Volunteers (Counter Desk):
1. Open the website on the stall tablet or laptop.
2. Click **Team Desk** in the top navigation bar.
3. Enter PIN: `1234`.
4. Keep the **Verify Payments** tab open.
5. When a customer pays via UPI and submits their UTR, their order will appear in the pending queue with an audio chime.
6. Check your merchant bank SMS or notification for the matching UTR number.
7. Click **Approve & Mark Verified** and call out the **Token Number**!

### For Students / Customers:
1. Open the website on mobile.
2. Register once under **Stall Pass** to receive your personal ID pass.
3. Browse the **Menu**, add momos or cold coffee to cart, and click **Proceed to Pay via UPI**.
4. Scan the generated QR code using Google Pay, PhonePe, or Paytm.
5. Enter the 12-digit UTR from your payment receipt and tap **Submit Payment for Verification**.
6. Show your screen or Token number at the pickup counter!

---

## ☁️ Connecting Firebase Cloud Database

If you wish to sync data across different Wi-Fi networks or mobile cellular data:
1. Create a free project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Firestore Database** in test mode (`allow read, write: if true;`).
3. Under Project Settings, copy the `firebaseConfig` JSON object:
   ```json
   {
     "apiKey": "AIzaSy...",
     "authDomain": "stallpay-fest.firebaseapp.com",
     "projectId": "stallpay-fest",
     "storageBucket": "stallpay-fest.appspot.com",
     "messagingSenderId": "...",
     "appId": "..."
   }
   ```
4. In StallPay, click **Team Desk -> Cloud Sync** and paste your config JSON.
5. Click **Save & Connect Cloud**. Real-time cloud sync is now live!

---

## 📂 Project Structure

```
stall app/
├── index.html              # Main responsive single-page application
├── css/
│   └── styles.css          # Glassmorphism, animations, badges, thermal receipt & print styles
├── js/
│   ├── config.js           # Default stall data, catalog items, and expenses
│   ├── sound.js            # Web Audio API synthetic chimes (success, alert, tap)
│   ├── firebase-service.js # Firebase Firestore real-time cloud sync & local BroadcastChannel
│   ├── store.js            # Central reactive state manager & CSV generator
│   ├── upi-qr.js           # NPCI UPI URI generator & QR code rendering
│   ├── qr-scanner.js       # Camera & image file QR code scanner
│   └── app.js              # SPA router, UI event handlers, modals, forms & toast alerts
└── README.md               # Documentation & stall operations guide
```

---

## 🔒 Security & Privacy Notice
- StallPay strictly complies with NPCI UPI guidelines.
- **No banking PINs or passwords are ever requested or stored.**
- Payments are only approved when verified by the physical stall coordinator desk.
- Built for college entrepreneurship festivals, student clubs, and tech fest stalls.
