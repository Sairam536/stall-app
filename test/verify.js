/**
 * StallPay - Node.js Automated Logic Verification Suite
 * Tests all core modules: Config, Store, Financial Calculations, UPI URI generation, Status Transitions
 */

const fs = require('fs');
const path = require('path');

// 1. Mock Browser Globals for Node.js test environment
const mockStorage = {};
const mockSession = {};

global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { hash: '' },
  scrollTo: () => {}
};

global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; }
};

global.sessionStorage = {
  getItem: (key) => mockSession[key] || null,
  setItem: (key, val) => { mockSession[key] = String(val); },
  removeItem: (key) => { delete mockSession[key]; }
};

global.CustomEvent = class CustomEvent {
  constructor(name, opts) {
    this.name = name;
    this.detail = opts ? opts.detail : null;
  }
};

// 2. Load Modules
console.log("Loading StallPay modules...");
require('../js/env-config.js');
require('../js/config.js');
require('../js/sound.js');
require('../js/supabase-service.js');
require('../js/firebase-service.js');
require('../js/store.js');
require('../js/upi-qr.js');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    failCount++;
  }
}

console.log("\n--- TEST SUITE 1: Configuration & Store Init ---");
assert(window.DEFAULT_CONFIG !== undefined, "Default config loaded");
assert(window.DEFAULT_CONFIG.stall.name.includes("Entrepreneur Club"), "Stall name configured");
assert(window.StallStore !== undefined, "StallStore initialized");
assert(window.StallStore.products.length >= 8, `Store loaded ${window.StallStore.products.length} catalog items`);

console.log("\n--- TEST SUITE 2: Customer Registration & Stall Pass ---");
const customer = window.StallStore.registerCustomer("Siddharth Patel", "9876543210", "Computer Science");
assert(customer.id.startsWith("SP-CUST-"), `Generated customer ID: ${customer.id}`);
assert(customer.phone === "9876543210", "Customer phone cleaned & preserved");
assert(window.StallStore.currentCustomer.id === customer.id, "Session set to registered customer");

console.log("\n--- TEST SUITE 3: Cart Management ---");
window.StallStore.clearCart();
const momos = window.StallStore.products[0];
const coffee = window.StallStore.products[3];

window.StallStore.addToCart(momos.id, 2); // 60 * 2 = 120
window.StallStore.addToCart(coffee.id, 1); // 50 * 1 = 50

assert(window.StallStore.getCartCount() === 3, "Cart item count is 3");
assert(window.StallStore.getCartTotal() === (momos.price * 2 + coffee.price), `Cart total is ₹${window.StallStore.getCartTotal()}`);

console.log("\n--- TEST SUITE 4: CRITICAL PAYMENT TEST - STRICT PENDING STATUS ---");
const cartItems = [...window.StallStore.cart];
const totalAmount = window.StallStore.getCartTotal();

const newTxn = window.StallStore.createTransaction({
  customerId: customer.id,
  customerName: customer.name,
  customerPhone: customer.phone,
  items: cartItems,
  totalAmount: totalAmount,
  utr: "401988223344",
  notes: "Extra spicy sauce"
});

assert(newTxn.id.startsWith("TXN-"), `Generated transaction ID: ${newTxn.id}`);
assert(newTxn.status === 'pending', "CRITICAL: Transaction status is strictly 'pending' upon creation!");
assert(newTxn.utr === "401988223344", "UTR reference recorded correctly");
assert(newTxn.totalAmount === 170, `Total amount matches: ₹${newTxn.totalAmount}`);
assert(window.StallStore.cart.length === 0, "Cart cleared after order creation");

console.log("\n--- TEST SUITE 5: Team Desk Verification ---");
const verified = window.StallStore.verifyTransaction(newTxn.id, "Stall President");
assert(verified === true, "Verification function returned true");

const updatedTxn = window.StallStore.getTransactionById(newTxn.id);
assert(updatedTxn.status === 'verified', "Transaction status successfully updated to 'verified'");
assert(updatedTxn.verifiedBy === "Stall President", "VerifiedBy audit record attached");

console.log("\n--- TEST SUITE 6: Team Desk Rejection ---");
// Create another transaction to test rejection
const txnToReject = window.StallStore.createTransaction({
  customerId: customer.id,
  customerName: "Test User",
  customerPhone: "9000000000",
  items: [{ id: "prod-1", name: "Momos", price: 60, qty: 1 }],
  totalAmount: 60,
  utr: "000000000000"
});
assert(txnToReject.status === 'pending', "Second transaction starts as 'pending'");

window.StallStore.rejectTransaction(txnToReject.id, "Invalid UTR reference");
const rejectedTxn = window.StallStore.getTransactionById(txnToReject.id);
assert(rejectedTxn.status === 'rejected', "Status changed to 'rejected'");
assert(rejectedTxn.rejectionReason === "Invalid UTR reference", "Rejection reason saved");

console.log("\n--- TEST SUITE 7: Expenses & Net Profit Calculation ---");
const initialExpenses = window.StallStore.expenses.reduce((s, e) => s + e.amount, 0);
window.StallStore.addExpense({
  title: "Extra Ice Cubes & Cups",
  category: "Beverages",
  amount: 200,
  notes: "Rush hour supply"
});

const metrics = window.StallStore.getFinancialMetrics();
assert(metrics.verifiedSales >= updatedTxn.totalAmount, `Verified sales: ₹${metrics.verifiedSales}`);
assert(metrics.totalExpenses === (initialExpenses + 200), `Total expenses: ₹${metrics.totalExpenses}`);
assert(metrics.netProfit === (metrics.verifiedSales - metrics.totalExpenses), `Net profit formula verified: ₹${metrics.netProfit}`);

console.log("\n--- TEST SUITE 8: Customer Feedback ---");
const initialFeedbackCount = window.StallStore.feedback.length;
window.StallStore.addFeedback({
  customerName: "Siddharth Patel",
  customerPhone: "9876543210",
  rating: 5,
  tag: "Super Fast",
  comment: "Loved the momos and instant token system!"
});

assert(window.StallStore.feedback.length === initialFeedbackCount + 1, "Feedback count incremented");
const fbMetrics = window.StallStore.getFeedbackMetrics();
assert(fbMetrics.average >= 1.0 && fbMetrics.average <= 5.0, `Average rating in bounds: ${fbMetrics.average}`);

console.log("\n--- TEST SUITE 9: UPI URI & NPCI Compliance ---");
const uri = window.UpiQrService.buildUpiUri({
  upiId: "stallpay.ecell@upi",
  payeeName: "Entrepreneur Club Stall",
  amount: 170,
  note: "Token 004 StallPay"
});

assert(uri.startsWith("upi://pay?"), "URI starts with upi://pay?");
assert(uri.includes("pa=stallpay.ecell%40upi") || uri.includes("pa=stallpay.ecell@upi"), "Contains correct UPI ID");
assert(uri.includes("am=170.00"), "Contains formatted amount 170.00");
assert(uri.includes("cu=INR"), "Specifies currency INR");

console.log("\n--- TEST SUITE 10: Team PIN Authentication ---");
assert(window.StallStore.verifyTeamPin("1234") === true, "Default PIN 1234 accepted");
assert(window.StallStore.verifyTeamPin("9999") === false, "Wrong PIN 9999 rejected");

console.log("\n--- TEST SUITE 11: Supabase Integration & Environment Files ---");
assert(fs.existsSync(path.join(__dirname, '..', 'backend', '.env')), "backend/.env exists");
assert(fs.existsSync(path.join(__dirname, '..', 'frontend', '.env')), "frontend/.env exists");
assert(fs.existsSync(path.join(__dirname, '..', '.env')), "root .env exists");
assert(fs.existsSync(path.join(__dirname, '..', 'supabase-schema.sql')), "supabase-schema.sql exists");

const backendEnv = fs.readFileSync(path.join(__dirname, '..', 'backend', '.env'), 'utf8');
assert(backendEnv.includes("SUPABASE_URL="), "backend/.env contains SUPABASE_URL");
assert(backendEnv.includes("SUPABASE_ANON_KEY="), "backend/.env contains SUPABASE_ANON_KEY");
assert(backendEnv.includes("SUPABASE_SERVICE_ROLE_KEY="), "backend/.env contains SUPABASE_SERVICE_ROLE_KEY");
assert(backendEnv.includes("PORT="), "backend/.env contains PORT");

const frontendEnv = fs.readFileSync(path.join(__dirname, '..', 'frontend', '.env'), 'utf8');
assert(frontendEnv.includes("SUPABASE_URL="), "frontend/.env contains SUPABASE_URL");
assert(frontendEnv.includes("SUPABASE_ANON_KEY="), "frontend/.env contains SUPABASE_ANON_KEY");
assert(!frontendEnv.includes("SUPABASE_SERVICE_ROLE_KEY="), "SECURITY: frontend/.env does NOT contain secret SERVICE_ROLE_KEY");

assert(window.SupabaseService !== undefined, "SupabaseService instantiated");
assert(typeof window.SupabaseService.connect === 'function', "SupabaseService.connect available");
assert(typeof window.SupabaseService.saveTransaction === 'function', "SupabaseService.saveTransaction available");

console.log(`\n========================================`);
console.log(`VERIFICATION SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED WITH ZERO ERRORS!");
  process.exit(0);
}
