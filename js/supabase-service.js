/**
 * StallPay - Supabase Real-Time Client Service
 * Connects directly to Supabase PostgreSQL database with WebSocket Realtime subscriptions.
 */

class SupabaseService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.url = null;
    this.anonKey = null;
    this.channels = {};
    this.listeners = {};

    this.init();
  }

  async init() {
    // 1. Check local storage first
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem('stallpay_supabase_config') || 'null');
    } catch (e) {}

    if (saved && saved.url && saved.anonKey && !saved.url.includes('your-project-id')) {
      await this.connect(saved.url, saved.anonKey);
      return;
    }

    // 2. Check window.ENV_CONFIG (from js/env-config.js)
    if (window.ENV_CONFIG && window.ENV_CONFIG.SUPABASE_URL && !window.ENV_CONFIG.SUPABASE_URL.includes('your-project-id')) {
      await this.connect(window.ENV_CONFIG.SUPABASE_URL, window.ENV_CONFIG.SUPABASE_ANON_KEY);
      return;
    }

    // 3. Try fetching from backend /api/config endpoint
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const config = await res.json();
        if (config.supabaseUrl && config.supabaseAnonKey && !config.supabaseUrl.includes('your-project-id')) {
          await this.connect(config.supabaseUrl, config.supabaseAnonKey);
        }
      }
    } catch (e) {
      // Backend not running or static mode, fallback to local mode
    }
  }

  /**
   * Connect to Supabase using URL and Anon Key
   */
  async connect(url, anonKey) {
    if (!url || !anonKey) return { success: false, error: 'URL and Anon Key are required' };

    try {
      // Verify supabase-js library is loaded
      if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
        console.warn("Supabase JS library not loaded yet.");
        return { success: false, error: 'Supabase SDK not loaded' };
      }

      this.url = url.trim();
      this.anonKey = anonKey.trim();
      this.client = window.supabase.createClient(this.url, this.anonKey);

      // Test connection with a lightweight select
      const { data, error } = await this.client.from('stall_settings').select('*').limit(1);

      if (error && error.code !== 'PGRST116') {
        // If table doesn't exist yet, we still know the credentials authenticated if it's not a JWT error
        if (error.message && (error.message.includes('JWT') || error.message.includes('apikey'))) {
          throw new Error(error.message);
        }
      }

      this.isReady = true;

      // Save to localStorage
      localStorage.setItem('stallpay_supabase_config', JSON.stringify({
        url: this.url,
        anonKey: this.anonKey
      }));

      // Bind realtime postgres changes
      this.attachRealtimeSubscriptions();

      // Trigger initial data sync
      this.syncAllFromCloud();

      console.log("🟢 Connected to Supabase PostgreSQL Database with Realtime sync!");
      window.dispatchEvent(new CustomEvent('stallpay:supabase-connected', { detail: { url: this.url } }));
      return { success: true };

    } catch (err) {
      console.warn("Supabase connection attempt failed:", err.message);
      this.isReady = false;
      return { success: false, error: err.message };
    }
  }

  /**
   * Attach Supabase Realtime Channels for live multi-device synchronization
   */
  attachRealtimeSubscriptions() {
    if (!this.client || !this.isReady) return;

    try {
      const channel = this.client
        .channel('stallpay-realtime-room')
        // 1. Transactions
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
          this.handleRealtimeChange('transactions', payload);
        })
        // 2. Products
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
          this.handleRealtimeChange('products', payload);
        })
        // 3. Expenses
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, (payload) => {
          this.handleRealtimeChange('expenses', payload);
        })
        // 4. Feedback
        .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback' }, (payload) => {
          this.handleRealtimeChange('feedback', payload);
        })
        .subscribe((status) => {
          console.log(`Supabase Realtime Channel Status: ${status}`);
        });

      this.channels['stallpay-realtime-room'] = channel;
    } catch (e) {
      console.warn("Failed to attach Supabase realtime subscriptions:", e);
    }
  }

  handleRealtimeChange(table, payload) {
    if (this.listeners[table]) {
      this.listeners[table](payload);
    }
    // Also notify central store
    if (window.StallStore && window.StallStore.handleSupabaseChange) {
      window.StallStore.handleSupabaseChange(table, payload);
    }
  }

  onTableChange(table, callback) {
    this.listeners[table] = callback;
  }

  /**
   * Sync initial data from Supabase down to local store
   */
  async syncAllFromCloud() {
    if (!this.isReady || !this.client) return;

    try {
      // 1. Transactions
      const { data: txns } = await this.client.from('transactions').select('*').order('created_at', { ascending: false });
      if (txns && txns.length > 0 && window.StallStore) {
        window.StallStore.setTransactionsFromCloud(txns);
      }

      // 2. Products
      const { data: prods } = await this.client.from('products').select('*');
      if (prods && prods.length > 0 && window.StallStore) {
        window.StallStore.setProductsFromCloud(prods);
      }

      // 3. Expenses
      const { data: exps } = await this.client.from('expenses').select('*').order('date', { ascending: false });
      if (exps && exps.length > 0 && window.StallStore) {
        window.StallStore.setExpensesFromCloud(exps);
      }

      // 4. Feedback
      const { data: fbs } = await this.client.from('feedback').select('*').order('created_at', { ascending: false });
      if (fbs && fbs.length > 0 && window.StallStore) {
        window.StallStore.setFeedbackFromCloud(fbs);
      }
    } catch (err) {
      console.warn("Initial Supabase cloud sync warning:", err);
    }
  }

  /* ==========================================================================
     CRUD OPERATIONS FOR SUPABASE
     ========================================================================== */

  async saveTransaction(txn) {
    if (!this.isReady || !this.client) return;
    try {
      const record = {
        id: txn.id,
        token: txn.token,
        customer_id: txn.customerId,
        customer_name: txn.customerName,
        customer_phone: txn.customerPhone,
        items: txn.items,
        total_amount: txn.totalAmount,
        utr: txn.utr,
        notes: txn.notes || '',
        status: txn.status || 'pending',
        date: txn.date,
        time: txn.time,
        created_at: txn.createdAt || new Date().toISOString()
      };
      await this.client.from('transactions').upsert(record);
    } catch (e) {
      console.warn("Supabase saveTransaction error:", e);
    }
  }

  async updateTransactionStatus(txnId, status, details = {}) {
    if (!this.isReady || !this.client) return;
    try {
      const updates = {
        status: status,
        verified_at: details.verifiedAt || new Date().toISOString(),
        verified_by: details.verifiedBy || null,
        rejection_reason: details.rejectionReason || null
      };
      await this.client.from('transactions').update(updates).eq('id', txnId);
    } catch (e) {
      console.warn("Supabase updateTransactionStatus error:", e);
    }
  }

  async saveProduct(prod) {
    if (!this.isReady || !this.client) return;
    try {
      const record = {
        id: prod.id,
        name: prod.name,
        category: prod.category,
        price: prod.price,
        description: prod.description || '',
        emoji: prod.emoji || '🍽️',
        badge: prod.badge || '',
        in_stock: prod.inStock !== false
      };
      await this.client.from('products').upsert(record);
    } catch (e) {
      console.warn("Supabase saveProduct error:", e);
    }
  }

  async deleteProduct(prodId) {
    if (!this.isReady || !this.client) return;
    try {
      await this.client.from('products').delete().eq('id', prodId);
    } catch (e) {
      console.warn("Supabase deleteProduct error:", e);
    }
  }

  async saveExpense(exp) {
    if (!this.isReady || !this.client) return;
    try {
      const record = {
        id: exp.id,
        title: exp.title,
        category: exp.category,
        amount: exp.amount,
        date: exp.date,
        notes: exp.notes || ''
      };
      await this.client.from('expenses').upsert(record);
    } catch (e) {
      console.warn("Supabase saveExpense error:", e);
    }
  }

  async deleteExpense(expId) {
    if (!this.isReady || !this.client) return;
    try {
      await this.client.from('expenses').delete().eq('id', expId);
    } catch (e) {
      console.warn("Supabase deleteExpense error:", e);
    }
  }

  async saveFeedback(fb) {
    if (!this.isReady || !this.client) return;
    try {
      const record = {
        id: fb.id,
        customer_name: fb.customerName,
        customer_phone: fb.customerPhone || '',
        rating: fb.rating,
        tag: fb.tag || 'General',
        comment: fb.comment,
        created_at: fb.date || new Date().toISOString()
      };
      await this.client.from('feedback').upsert(record);
    } catch (e) {
      console.warn("Supabase saveFeedback error:", e);
    }
  }

  async saveCustomer(cust) {
    if (!this.isReady || !this.client) return;
    try {
      const record = {
        id: cust.id,
        name: cust.name,
        phone: cust.phone,
        college: cust.college || '',
        registered_at: cust.registeredAt || new Date().toISOString()
      };
      await this.client.from('customers').upsert(record);
    } catch (e) {
      console.warn("Supabase saveCustomer error:", e);
    }
  }

  disconnect() {
    localStorage.removeItem('stallpay_supabase_config');
    this.client = null;
    this.isReady = false;
    this.url = null;
    this.anonKey = null;
    window.dispatchEvent(new CustomEvent('stallpay:supabase-disconnected'));
  }

  getStatus() {
    return {
      connected: this.isReady,
      url: this.url,
      mode: this.isReady ? 'Supabase PostgreSQL Cloud' : 'Local Realtime'
    };
  }
}

window.SupabaseService = new SupabaseService();
