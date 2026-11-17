/**
 * StallPay - Central Application Store & State Management
 * Handles Customers, Products, Cart, Transactions, Expenses, Feedback, and Calculations.
 */

class StallStore {
  constructor() {
    this.STORAGE_KEYS = {
      CUSTOMERS: 'stallpay_customers_v1',
      CURRENT_CUSTOMER: 'stallpay_current_customer_v1',
      PRODUCTS: 'stallpay_products_v1',
      CART: 'stallpay_cart_v1',
      TRANSACTIONS: 'stallpay_transactions_v1',
      EXPENSES: 'stallpay_expenses_v1',
      FEEDBACK: 'stallpay_feedback_v1',
      SETTINGS: 'stallpay_settings_v1',
      IS_TEAM_AUTHED: 'stallpay_team_authed_v1'
    };

    this.init();
    this.bindSyncListeners();
  }

  init() {
    // 1. Settings
    this.settings = this.load(this.STORAGE_KEYS.SETTINGS, window.DEFAULT_CONFIG.stall);

    // 2. Products
    this.products = this.load(this.STORAGE_KEYS.PRODUCTS, window.DEFAULT_CONFIG.initialProducts);

    // 3. Customers
    this.customers = this.load(this.STORAGE_KEYS.CUSTOMERS, [
      {
        id: "SP-CUST-1001",
        name: "Demo Customer",
        phone: "9876543210",
        college: "Engineering - ECE",
        registeredAt: new Date().toISOString()
      }
    ]);

    // Current logged in customer session
    this.currentCustomer = this.load(this.STORAGE_KEYS.CURRENT_CUSTOMER, this.customers[0]);

    // 4. Cart
    this.cart = this.load(this.STORAGE_KEYS.CART, []);

    // 5. Transactions
    this.transactions = this.load(this.STORAGE_KEYS.TRANSACTIONS, [
      {
        id: "TXN-101",
        token: "001",
        customerId: "SP-CUST-1001",
        customerName: "Aarav Sharma",
        customerPhone: "9876543210",
        items: [
          { id: "prod-1", name: "Crispy Veg Steamed Momos", price: 60, qty: 1, emoji: "🥟" },
          { id: "prod-4", name: "Thick Cold Coffee with Ice Cream", price: 50, qty: 1, emoji: "🧋" }
        ],
        totalAmount: 110,
        utr: "401928374651",
        notes: "Extra spicy chutney please",
        status: "verified", // Initial demo sample verified
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        date: new Date(Date.now() - 7200000).toLocaleDateString('en-IN'),
        time: new Date(Date.now() - 7200000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        verifiedAt: new Date(Date.now() - 7100000).toISOString(),
        verifiedBy: "Team Stall Desk"
      },
      {
        id: "TXN-102",
        token: "002",
        customerId: "SP-CUST-1002",
        customerName: "Priya Nair",
        customerPhone: "9123456780",
        items: [
          { id: "prod-2", name: "Loaded Cheese Nachos", price: 80, qty: 1, emoji: "🧀" },
          { id: "prod-6", name: "Warm Sizzling Brownie with Ice Cream", price: 70, qty: 1, emoji: "🍨" }
        ],
        totalAmount: 150,
        utr: "401928379988",
        notes: "Less jalapenos",
        status: "verified",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        date: new Date(Date.now() - 3600000).toLocaleDateString('en-IN'),
        time: new Date(Date.now() - 3600000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        verifiedAt: new Date(Date.now() - 3500000).toISOString(),
        verifiedBy: "Team Stall Desk"
      },
      {
        id: "TXN-103",
        token: "003",
        customerId: "SP-CUST-1003",
        customerName: "Rohan Verma",
        customerPhone: "9988776655",
        items: [
          { id: "prod-4", name: "Thick Cold Coffee with Ice Cream", price: 50, qty: 2, emoji: "🧋" }
        ],
        totalAmount: 100,
        utr: "402011223344",
        notes: "",
        status: "pending", // Sample pending payment for verification testing
        createdAt: new Date(Date.now() - 600000).toISOString(),
        date: new Date(Date.now() - 600000).toLocaleDateString('en-IN'),
        time: new Date(Date.now() - 600000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        verifiedAt: null,
        verifiedBy: null
      }
    ]);

    // 6. Expenses
    this.expenses = this.load(this.STORAGE_KEYS.EXPENSES, window.DEFAULT_CONFIG.initialExpenses);

    // 7. Feedback
    this.feedback = this.load(this.STORAGE_KEYS.FEEDBACK, window.DEFAULT_CONFIG.initialFeedback);

    // 8. Team session
    this.isTeamAuthed = sessionStorage.getItem(this.STORAGE_KEYS.IS_TEAM_AUTHED) === 'true';
  }

  // Bind BroadcastChannel and Firebase listeners for real-time synchronization
  bindSyncListeners() {
    // 1. BroadcastChannel for instant local cross-tab sync
    if (window.FirebaseService && window.FirebaseService.syncChannel) {
      window.FirebaseService.syncChannel.onmessage = (event) => {
        const { type, collection } = event.data;
        if (type === 'DATA_CHANGE') {
          this.refreshFromStorage(collection);
        }
      };
    }

    // 2. Firebase Cloud real-time listeners
    if (window.FirebaseService) {
      window.FirebaseService.onCollectionUpdate('transactions', (cloudItems) => {
        if (cloudItems && cloudItems.length > 0) {
          this.transactions = cloudItems;
          this.save(this.STORAGE_KEYS.TRANSACTIONS, this.transactions, false);
          this.dispatch('transactions-updated', this.transactions);
        }
      });

      window.FirebaseService.onCollectionUpdate('products', (cloudItems) => {
        if (cloudItems && cloudItems.length > 0) {
          this.products = cloudItems;
          this.save(this.STORAGE_KEYS.PRODUCTS, this.products, false);
          this.dispatch('products-updated', this.products);
        }
      });

      window.FirebaseService.onCollectionUpdate('expenses', (cloudItems) => {
        if (cloudItems && cloudItems.length > 0) {
          this.expenses = cloudItems;
          this.save(this.STORAGE_KEYS.EXPENSES, this.expenses, false);
          this.dispatch('expenses-updated', this.expenses);
        }
      });

      window.FirebaseService.onCollectionUpdate('feedback', (cloudItems) => {
        if (cloudItems && cloudItems.length > 0) {
          this.feedback = cloudItems;
          this.save(this.STORAGE_KEYS.FEEDBACK, this.feedback, false);
          this.dispatch('feedback-updated', this.feedback);
        }
      });
    }

    // Storage event for other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEYS.TRANSACTIONS) {
        this.transactions = this.load(this.STORAGE_KEYS.TRANSACTIONS, []);
        this.dispatch('transactions-updated', this.transactions);
      }
      if (e.key === this.STORAGE_KEYS.PRODUCTS) {
        this.products = this.load(this.STORAGE_KEYS.PRODUCTS, []);
        this.dispatch('products-updated', this.products);
      }
      if (e.key === this.STORAGE_KEYS.EXPENSES) {
        this.expenses = this.load(this.STORAGE_KEYS.EXPENSES, []);
        this.dispatch('expenses-updated', this.expenses);
      }
      if (e.key === this.STORAGE_KEYS.FEEDBACK) {
        this.feedback = this.load(this.STORAGE_KEYS.FEEDBACK, []);
        this.dispatch('feedback-updated', this.feedback);
      }
    });
  }

  refreshFromStorage(collection) {
    if (collection === 'transactions') {
      this.transactions = this.load(this.STORAGE_KEYS.TRANSACTIONS, this.transactions);
      this.dispatch('transactions-updated', this.transactions);
    } else if (collection === 'products') {
      this.products = this.load(this.STORAGE_KEYS.PRODUCTS, this.products);
      this.dispatch('products-updated', this.products);
    } else if (collection === 'expenses') {
      this.expenses = this.load(this.STORAGE_KEYS.EXPENSES, this.expenses);
      this.dispatch('expenses-updated', this.expenses);
    } else if (collection === 'feedback') {
      this.feedback = this.load(this.STORAGE_KEYS.FEEDBACK, this.feedback);
      this.dispatch('feedback-updated', this.feedback);
    }
  }

  /* ==========================================================================
     SUPABASE CLOUD SYNC HANDLERS
     ========================================================================== */

  setTransactionsFromCloud(cloudTxns) {
    if (Array.isArray(cloudTxns) && cloudTxns.length > 0) {
      this.transactions = cloudTxns.map(t => ({
        id: t.id,
        token: t.token,
        customerId: t.customer_id || t.customerId,
        customerName: t.customer_name || t.customerName,
        customerPhone: t.customer_phone || t.customerPhone,
        items: Array.isArray(t.items) ? t.items : [],
        totalAmount: Number(t.total_amount || t.totalAmount || 0),
        utr: t.utr,
        notes: t.notes || '',
        status: t.status || 'pending',
        date: t.date || new Date(t.created_at || Date.now()).toLocaleDateString('en-IN'),
        time: t.time || new Date(t.created_at || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        verifiedAt: t.verified_at || t.verifiedAt,
        verifiedBy: t.verified_by || t.verifiedBy,
        rejectionReason: t.rejection_reason || t.rejectionReason,
        createdAt: t.created_at || t.createdAt
      }));
      this.save(this.STORAGE_KEYS.TRANSACTIONS, this.transactions, false);
      this.dispatch('transactions-updated', this.transactions);
    }
  }

  setProductsFromCloud(cloudProds) {
    if (Array.isArray(cloudProds) && cloudProds.length > 0) {
      this.products = cloudProds.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: Number(p.price || 0),
        description: p.description || '',
        emoji: p.emoji || '🍽️',
        badge: p.badge || '',
        inStock: p.in_stock !== false
      }));
      this.save(this.STORAGE_KEYS.PRODUCTS, this.products, false);
      this.dispatch('products-updated', this.products);
    }
  }

  setExpensesFromCloud(cloudExps) {
    if (Array.isArray(cloudExps) && cloudExps.length > 0) {
      this.expenses = cloudExps.map(e => ({
        id: e.id,
        title: e.title,
        category: e.category,
        amount: Number(e.amount || 0),
        date: e.date,
        notes: e.notes || ''
      }));
      this.save(this.STORAGE_KEYS.EXPENSES, this.expenses, false);
      this.dispatch('expenses-updated', this.expenses);
    }
  }

  setFeedbackFromCloud(cloudFbs) {
    if (Array.isArray(cloudFbs) && cloudFbs.length > 0) {
      this.feedback = cloudFbs.map(f => ({
        id: f.id,
        customerName: f.customer_name || f.customerName,
        customerPhone: f.customer_phone || f.customerPhone,
        rating: Number(f.rating || 5),
        tag: f.tag || 'General',
        comment: f.comment,
        date: f.created_at || f.date
      }));
      this.save(this.STORAGE_KEYS.FEEDBACK, this.feedback, false);
      this.dispatch('feedback-updated', this.feedback);
    }
  }

  handleSupabaseChange(table, payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    if (table === 'transactions') {
      if (eventType === 'INSERT') {
        const mapped = {
          id: newRecord.id,
          token: newRecord.token,
          customerId: newRecord.customer_id,
          customerName: newRecord.customer_name,
          customerPhone: newRecord.customer_phone,
          items: newRecord.items || [],
          totalAmount: Number(newRecord.total_amount),
          utr: newRecord.utr,
          notes: newRecord.notes || '',
          status: newRecord.status,
          date: newRecord.date,
          time: newRecord.time,
          verifiedAt: newRecord.verified_at,
          verifiedBy: newRecord.verified_by,
          rejectionReason: newRecord.rejection_reason,
          createdAt: newRecord.created_at
        };
        const exists = this.transactions.find(t => t.id === mapped.id);
        if (!exists) {
          this.transactions.unshift(mapped);
          this.save(this.STORAGE_KEYS.TRANSACTIONS, this.transactions, false);
          this.dispatch('transactions-updated', this.transactions);
          this.dispatch('new-order-placed', mapped);
        }
      } else if (eventType === 'UPDATE') {
        const idx = this.transactions.findIndex(t => t.id === newRecord.id);
        if (idx > -1) {
          this.transactions[idx].status = newRecord.status;
          this.transactions[idx].verifiedAt = newRecord.verified_at;
          this.transactions[idx].verifiedBy = newRecord.verified_by;
          this.transactions[idx].rejectionReason = newRecord.rejection_reason;
          this.save(this.STORAGE_KEYS.TRANSACTIONS, this.transactions, false);
          this.dispatch('transactions-updated', this.transactions);
        }
      }
    } else if (table === 'products' || table === 'expenses' || table === 'feedback') {
      if (window.SupabaseService) {
        window.SupabaseService.syncAllFromCloud();
      }
    }
  }

  // Helper storage operations
  load(key, fallback) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.warn(`Error loading ${key}`, e);
      return fallback;
    }
  }

  save(key, data, broadcast = true) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      if (broadcast && window.FirebaseService) {
        let col = null;
        if (key === this.STORAGE_KEYS.TRANSACTIONS) col = 'transactions';
        if (key === this.STORAGE_KEYS.PRODUCTS) col = 'products';
        if (key === this.STORAGE_KEYS.EXPENSES) col = 'expenses';
        if (key === this.STORAGE_KEYS.FEEDBACK) col = 'feedback';
        if (col) {
          window.FirebaseService.broadcastLocalChange(col, 'refresh', {});
        }
      }
    } catch (e) {
      console.warn(`Error saving ${key}`, e);
    }
  }

  dispatch(eventName, detail) {
    window.dispatchEvent(new CustomEvent(`stallpay:${eventName}`, { detail }));
  }

  /* ==========================================================================
     CUSTOMER MANAGEMENT
     ========================================================================== */

  registerCustomer(name, phone, college = "") {
    if (!name || !phone) {
      throw new Error("Name and Phone Number are required.");
    }
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      throw new Error("Please enter a valid 10-digit mobile number.");
    }

    // Check if customer with phone already exists
    let existing = this.customers.find(c => c.phone === cleanPhone);
    if (existing) {
      existing.name = name.trim();
      existing.college = college.trim();
      this.currentCustomer = existing;
      this.save(this.STORAGE_KEYS.CUSTOMERS, this.customers);
      this.save(this.STORAGE_KEYS.CURRENT_CUSTOMER, this.currentCustomer);
      this.dispatch('customer-changed', this.currentCustomer);
      return existing;
    }

    // Create unique Customer ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newCustomer = {
      id: `SP-CUST-${randomSuffix}`,
      name: name.trim(),
      phone: cleanPhone,
      college: college.trim() || "Student / Guest",
      registeredAt: new Date().toISOString()
    };

    this.customers.unshift(newCustomer);
    this.currentCustomer = newCustomer;

    this.save(this.STORAGE_KEYS.CUSTOMERS, this.customers);
    this.save(this.STORAGE_KEYS.CURRENT_CUSTOMER, this.currentCustomer);
    this.dispatch('customer-changed', this.currentCustomer);

    // Save to Supabase Cloud if connected
    if (window.SupabaseService && window.SupabaseService.isReady) {
      window.SupabaseService.saveCustomer(newCustomer);
    }

    return newCustomer;
  }

  loginCustomerByPhone(phone) {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const found = this.customers.find(c => c.phone === cleanPhone);
    if (found) {
      this.currentCustomer = found;
      this.save(this.STORAGE_KEYS.CURRENT_CUSTOMER, this.currentCustomer);
      this.dispatch('customer-changed', this.currentCustomer);
      return found;
    }
    return null;
  }

  logoutCustomer() {
    this.currentCustomer = null;
    localStorage.removeItem(this.STORAGE_KEYS.CURRENT_CUSTOMER);
    this.dispatch('customer-changed', null);
  }

  /* ==========================================================================
     SHOPPING CART
     ========================================================================== */

  addToCart(productId, qty = 1) {
    const product = this.products.find(p => p.id === productId);
    if (!product || !product.inStock) return;

    const existingIndex = this.cart.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
      this.cart[existingIndex].qty += qty;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        emoji: product.emoji || '🛍️',
        qty: qty
      });
    }

    this.save(this.STORAGE_KEYS.CART, this.cart, false);
    this.dispatch('cart-updated', this.cart);
    if (window.SoundEffects) window.SoundEffects.playTap();
  }

  updateCartQty(productId, qty) {
    if (qty <= 0) {
      this.cart = this.cart.filter(item => item.id !== productId);
    } else {
      const item = this.cart.find(i => i.id === productId);
      if (item) item.qty = qty;
    }
    this.save(this.STORAGE_KEYS.CART, this.cart, false);
    this.dispatch('cart-updated', this.cart);
  }

  clearCart() {
    this.cart = [];
    this.save(this.STORAGE_KEYS.CART, this.cart, false);
    this.dispatch('cart-updated', this.cart);
  }

  getCartTotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  getCartCount() {
    return this.cart.reduce((sum, item) => sum + item.qty, 0);
  }

  /* ==========================================================================
     TRANSACTIONS & UPI PAYMENTS
     CRITICAL: ALWAYS SET INITIAL STATUS TO 'pending'!
     Never mark as successful just because QR was scanned or UTR was entered.
     ========================================================================== */

  createTransaction({ customerId, customerName, customerPhone, items, totalAmount, utr, notes = "" }) {
    if (!customerName || !customerPhone) {
      throw new Error("Customer details are missing.");
    }
    if (!items || items.length === 0) {
      throw new Error("Cart is empty. Please select products first.");
    }
    if (!utr || utr.trim().length < 4) {
      throw new Error("Please enter a valid UPI Reference / UTR Number.");
    }

    // Generate neat token number for stall callout (e.g. 004)
    const tokenNumber = String(this.transactions.length + 1).padStart(3, '0');
    const txnId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    const now = new Date();
    const newTxn = {
      id: txnId,
      token: tokenNumber,
      customerId: customerId || `GUEST-${Date.now().toString().slice(-4)}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        emoji: item.emoji || '🛍️'
      })),
      totalAmount: Number(totalAmount),
      utr: utr.trim(),
      notes: notes.trim(),
      status: 'pending', // Strictly PENDING until team verifies!
      createdAt: now.toISOString(),
      date: now.toLocaleDateString('en-IN'),
      time: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null
    };

    // Prepend to transaction list
    this.transactions.unshift(newTxn);
    this.save(this.STORAGE_KEYS.TRANSACTIONS, this.transactions);
    
    // Save to Firebase Cloud
    if (window.FirebaseService) {
      window.FirebaseService.saveDoc('transactions', newTxn.id, newTxn);
    }

    // Save to Supabase Cloud
    if (window.SupabaseService && window.SupabaseService.isReady) {
      window.SupabaseService.saveTransaction(newTxn);
    }

    // Clear cart
    this.clearCart();

    // Play pending chime
    if (window.SoundEffects) window.SoundEffects.playPending();

    // Dispatch update
    this.dispatch('transactions-updated', this.transactions);
    this.dispatch('new-order-placed', newTxn);

    return newTxn;
  }

  verifyTransaction(txnId, verifiedBy = "Stall Coordinator") {
    const txn = this.transactions.find(t => t.id === txnId);
    if (!txn) return false;

    txn.status = 'verified';
    txn.verifiedAt = new Date().toISOString();
    txn.verifiedBy = verifiedBy;
    txn.rejectionReason = null;

    this.save(this.STORAGE_KEYS.TRANSACTIONS, this.transactions);

    if (window.FirebaseService) {
      window.FirebaseService.updateDoc('transactions', txnId, {
        status: 'verified',
        verifiedAt: txn.verifiedAt,
        verifiedBy: txn.verifiedBy,
        rejectionReason: null
      });
    }

    if (window.SupabaseService && window.SupabaseService.isReady) {
      window.SupabaseService.updateTransactionStatus(txnId, 'verified', {
        verifiedAt: txn.verifiedAt,
        verifiedBy: txn.verifiedBy
      });
    }

    if (window.SoundEffects) window.SoundEffects.playSuccess();
    this.dispatch('transactions-updated', this.transactions);
    this.dispatch('transaction-verified', txn);
    return true;
  }

  rejectTransaction(txnId, reason = "Payment reference (UTR) not received in stall bank account") {
    const txn = this.transactions.find(t => t.id === txnId);
    if (!txn) return false;

    txn.status = 'rejected';
    txn.rejectionReason = reason;
    txn.verifiedAt = new Date().toISOString();

    this.save(this.STORAGE_KEYS.TRANSACTIONS, this.transactions);

    if (window.FirebaseService) {
      window.FirebaseService.updateDoc('transactions', txnId, {
        status: 'rejected',
        rejectionReason: reason,
        verifiedAt: txn.verifiedAt
      });
    }

    if (window.SupabaseService && window.SupabaseService.isReady) {
      window.SupabaseService.updateTransactionStatus(txnId, 'rejected', {
        rejectionReason: reason,
        verifiedAt: txn.verifiedAt
      });
    }

    if (window.SoundEffects) window.SoundEffects.playError();
    this.dispatch('transactions-updated', this.transactions);
    return true;
  }

  getCustomerTransactions(customerPhone) {
    if (!customerPhone) return [];
    const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10);
    return this.transactions.filter(t => t.customerPhone.replace(/\D/g, '').slice(-10) === cleanPhone);
  }

  getTransactionById(id) {
    return this.transactions.find(t => t.id === id || t.token === id);
  }

  /* ==========================================================================
     PRODUCT & INVENTORY MANAGEMENT
     ========================================================================== */

  addProduct({ name, category, price, description = "", emoji = "🍽️", badge = "", inStock = true }) {
    if (!name || isNaN(price)) {
      throw new Error("Product name and valid price are required.");
    }

    const newProd = {
      id: `prod-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      category: category || "Snacks",
      price: Math.max(0, Number(price)),
      description: description.trim(),
      emoji: emoji.trim() || "🍽️",
      badge: badge.trim(),
      inStock: Boolean(inStock)
    };

    this.products.push(newProd);
    this.save(this.STORAGE_KEYS.PRODUCTS, this.products);

    if (window.FirebaseService) {
      window.FirebaseService.saveDoc('products', newProd.id, newProd);
    }

    if (window.SupabaseService && window.SupabaseService.isReady) {
      window.SupabaseService.saveProduct(newProd);
    }

    this.dispatch('products-updated', this.products);
    return newProd;
  }

  updateProduct(productId, updates) {
    const index = this.products.findIndex(p => p.id === productId);
    if (index === -1) return false;

    this.products[index] = { ...this.products[index], ...updates };
    this.save(this.STORAGE_KEYS.PRODUCTS, this.products);

    if (window.FirebaseService) {
      window.FirebaseService.updateDoc('products', productId, updates);
    }

    this.dispatch('products-updated', this.products);
    return true;
  }

  deleteProduct(productId) {
    this.products = this.products.filter(p => p.id !== productId);
    this.save(this.STORAGE_KEYS.PRODUCTS, this.products);

    if (window.FirebaseService) {
      window.FirebaseService.deleteDoc('products', productId);
    }

    if (window.SupabaseService && window.SupabaseService.isReady) {
      window.SupabaseService.deleteProduct(productId);
    }

    this.dispatch('products-updated', this.products);
    return true;
  }

  toggleProductStock(productId) {
    const prod = this.products.find(p => p.id === productId);
    if (prod) {
      prod.inStock = !prod.inStock;
      this.updateProduct(productId, { inStock: prod.inStock });
    }
  }

  /* ==========================================================================
     EXPENSES & NET PROFIT
     ========================================================================== */

  addExpense({ title, category, amount, date, notes = "" }) {
    if (!title || isNaN(amount) || amount <= 0) {
      throw new Error("Valid expense title and amount are required.");
    }

    const newExp = {
      id: `exp-${Date.now().toString().slice(-6)}`,
      title: title.trim(),
      category: category || "Raw Materials",
      amount: Number(amount),
      date: date || new Date().toISOString().split('T')[0],
      notes: notes.trim()
    };

    this.expenses.unshift(newExp);
    this.save(this.STORAGE_KEYS.EXPENSES, this.expenses);

    if (window.FirebaseService) {
      window.FirebaseService.saveDoc('expenses', newExp.id, newExp);
    }

    if (window.SupabaseService && window.SupabaseService.isReady) {
      window.SupabaseService.saveExpense(newExp);
    }

    this.dispatch('expenses-updated', this.expenses);
    return newExp;
  }

  deleteExpense(expenseId) {
    this.expenses = this.expenses.filter(e => e.id !== expenseId);
    this.save(this.STORAGE_KEYS.EXPENSES, this.expenses);

    if (window.FirebaseService) {
      window.FirebaseService.deleteDoc('expenses', expenseId);
    }

    if (window.SupabaseService && window.SupabaseService.isReady) {
      window.SupabaseService.deleteExpense(expenseId);
    }

    this.dispatch('expenses-updated', this.expenses);
    return true;
  }

  // Financial calculations
  getFinancialMetrics() {
    const verifiedSales = this.transactions
      .filter(t => t.status === 'verified')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    const pendingSales = this.transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    const totalOrdersCount = this.transactions.length;
    const verifiedOrdersCount = this.transactions.filter(t => t.status === 'verified').length;
    const pendingOrdersCount = this.transactions.filter(t => t.status === 'pending').length;

    const totalExpenses = this.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const netProfit = verifiedSales - totalExpenses;
    const profitMargin = verifiedSales > 0 ? ((netProfit / verifiedSales) * 100).toFixed(1) : "0.0";

    return {
      verifiedSales,
      pendingSales,
      totalExpenses,
      netProfit,
      profitMargin,
      totalOrdersCount,
      verifiedOrdersCount,
      pendingOrdersCount
    };
  }

  /* ==========================================================================
     CUSTOMER FEEDBACK
     ========================================================================== */

  addFeedback({ customerName, customerPhone, rating, tag = "General", comment = "" }) {
    if (!rating || rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5 stars.");
    }

    const newFb = {
      id: `fb-${Date.now().toString().slice(-6)}`,
      customerName: customerName ? customerName.trim() : "Anonymous Student",
      customerPhone: customerPhone ? customerPhone.trim() : "",
      rating: Number(rating),
      tag: tag.trim() || "General",
      comment: comment.trim(),
      date: new Date().toISOString()
    };

    this.feedback.unshift(newFb);
    this.save(this.STORAGE_KEYS.FEEDBACK, this.feedback);

    if (window.FirebaseService) {
      window.FirebaseService.saveDoc('feedback', newFb.id, newFb);
    }

    if (window.SupabaseService && window.SupabaseService.isReady) {
      window.SupabaseService.saveFeedback(newFb);
    }

    this.dispatch('feedback-updated', this.feedback);
    return newFb;
  }

  getFeedbackMetrics() {
    if (this.feedback.length === 0) {
      return { average: 5.0, count: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }
    const sum = this.feedback.reduce((acc, f) => acc + (f.rating || 5), 0);
    const average = (sum / this.feedback.length).toFixed(1);

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    this.feedback.forEach(f => {
      const r = Math.round(f.rating) || 5;
      if (breakdown[r] !== undefined) breakdown[r]++;
    });

    return {
      average: Number(average),
      count: this.feedback.length,
      breakdown
    };
  }

  /* ==========================================================================
     TEAM AUTH & SETTINGS
     ========================================================================== */

  verifyTeamPin(enteredPin) {
    const isCorrect = String(enteredPin).trim() === String(this.settings.teamPin).trim();
    if (isCorrect) {
      this.isTeamAuthed = true;
      sessionStorage.setItem(this.STORAGE_KEYS.IS_TEAM_AUTHED, 'true');
      this.dispatch('team-auth-changed', true);
      return true;
    }
    return false;
  }

  logoutTeam() {
    this.isTeamAuthed = false;
    sessionStorage.removeItem(this.STORAGE_KEYS.IS_TEAM_AUTHED);
    this.dispatch('team-auth-changed', false);
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.save(this.STORAGE_KEYS.SETTINGS, this.settings);
    this.dispatch('settings-updated', this.settings);
  }

  /* ==========================================================================
     CSV EXPORT
     ========================================================================== */

  exportTransactionsCSV() {
    if (this.transactions.length === 0) {
      alert("No transactions to export yet.");
      return;
    }

    const headers = ["Order Token", "Transaction ID", "Customer Name", "Phone", "Items", "Amount (INR)", "Status", "UTR / Ref", "Date", "Time", "Verified By"];
    const rows = this.transactions.map(t => {
      const itemsList = t.items.map(i => `${i.name} (x${i.qty})`).join('; ');
      return [
        `#${t.token}`,
        t.id,
        `"${t.customerName}"`,
        t.customerPhone,
        `"${itemsList}"`,
        t.totalAmount,
        t.status.toUpperCase(),
        `"${t.utr}"`,
        t.date,
        t.time,
        `"${t.verifiedBy || ''}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadFile(csvContent, `StallPay_Transactions_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  }

  exportExpensesCSV() {
    if (this.expenses.length === 0) {
      alert("No expenses recorded yet.");
      return;
    }

    const headers = ["Expense ID", "Title", "Category", "Amount (INR)", "Date", "Notes"];
    const rows = this.expenses.map(e => [
      e.id,
      `"${e.title}"`,
      `"${e.category}"`,
      e.amount,
      e.date,
      `"${e.notes || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    this.downloadFile(csvContent, `StallPay_Expenses_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  }

  downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  resetAllData() {
    localStorage.removeItem(this.STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(this.STORAGE_KEYS.CURRENT_CUSTOMER);
    localStorage.removeItem(this.STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(this.STORAGE_KEYS.CART);
    localStorage.removeItem(this.STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(this.STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(this.STORAGE_KEYS.FEEDBACK);
    localStorage.removeItem(this.STORAGE_KEYS.SETTINGS);
    this.init();
    this.dispatch('transactions-updated', this.transactions);
    this.dispatch('products-updated', this.products);
    this.dispatch('expenses-updated', this.expenses);
    this.dispatch('feedback-updated', this.feedback);
    this.dispatch('customer-changed', this.currentCustomer);
  }
}

window.StallStore = new StallStore();
