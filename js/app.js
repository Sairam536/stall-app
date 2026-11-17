/**
 * StallPay - College Stall Management System
 * Core UI Controller, Navigation, Forms, Real-Time Events, and Modals
 */

class StallPayApp {
  constructor() {
    this.currentView = 'home';
    this.selectedCategory = 'all';
    this.historyFilter = 'all';
    this.activeSubtab = 'verify';
    this.activeConfirmationTxnId = null;
    this.isRegisterMode = true; // true = Register, false = Login
    this.selectedRating = 5;
  }

  init() {
    // 1. Initial State Bindings
    this.updateHeaderStallInfo();
    this.renderCustomerNav();
    this.renderProducts();
    this.updateCartUi();
    this.renderFinancials();
    this.renderVerificationQueue();
    this.renderInventoryTable();
    this.renderExpensesTable();
    this.renderAllTransactionsTable();
    this.renderFeedbackWall();
    this.checkTeamAuth();
    this.updateCloudStatusPill();
    this.updateSupabaseStatusPill();

    // 2. Hash / Router Navigation
    window.addEventListener('hashchange', () => this.handleHashChange());
    if (window.location.hash) {
      this.handleHashChange();
    } else {
      this.showView('home');
    }

    // 3. Store Event Subscriptions for Real-Time UI Updates
    window.addEventListener('stallpay:supabase-connected', () => this.updateSupabaseStatusPill());
    window.addEventListener('stallpay:supabase-disconnected', () => this.updateSupabaseStatusPill());
    window.addEventListener('stallpay:transactions-updated', () => {
      this.renderFinancials();
      this.renderVerificationQueue();
      this.renderAllTransactionsTable();
      this.renderHistory();
      this.checkLiveConfirmationUpdate();
    });

    window.addEventListener('stallpay:products-updated', () => {
      this.renderProducts();
      this.renderInventoryTable();
    });

    window.addEventListener('stallpay:expenses-updated', () => {
      this.renderFinancials();
      this.renderExpensesTable();
    });

    window.addEventListener('stallpay:feedback-updated', () => {
      this.renderFeedbackWall();
      this.renderFinancials();
    });

    window.addEventListener('stallpay:cart-updated', () => {
      this.updateCartUi();
    });

    window.addEventListener('stallpay:customer-changed', () => {
      this.renderCustomerNav();
      this.renderCustomerPass();
      this.renderHistory();
    });

    window.addEventListener('stallpay:new-order-placed', (e) => {
      this.showToast(`New order Token #${e.detail.token} submitted!`, 'info');
      // If team dashboard is open, sound an alert
      if (window.StallStore.isTeamAuthed && window.SoundEffects) {
        window.SoundEffects.playAlert();
      }
    });

    window.addEventListener('stallpay:settings-updated', () => {
      this.updateHeaderStallInfo();
    });
  }

  /* ==========================================================================
     NAVIGATION & ROUTING
     ========================================================================== */

  showView(viewId) {
    const views = document.querySelectorAll('.view-section');
    views.forEach(v => v.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
      targetView.classList.add('active');
      this.currentView = viewId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update Desktop Nav Active States
    document.querySelectorAll('.nav-btn').forEach(btn => {
      if (btn.dataset.target === viewId) {
        btn.classList.add('text-brand-600', 'bg-brand-50');
        btn.classList.remove('text-slate-600');
      } else {
        btn.classList.remove('text-brand-600', 'bg-brand-50');
        btn.classList.add('text-slate-600');
      }
    });

    // Update Mobile Bottom Nav Active States
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      if (btn.dataset.target === viewId) {
        btn.classList.add('text-brand-600');
        btn.classList.remove('text-slate-500');
      } else {
        btn.classList.remove('text-brand-600');
        btn.classList.add('text-slate-500');
      }
    });

    // Context-specific renders on view entry
    if (viewId === 'pass') {
      this.renderCustomerPass();
    } else if (viewId === 'history') {
      this.renderHistory();
    } else if (viewId === 'team-dashboard') {
      this.checkTeamAuth();
      this.renderFinancials();
      this.renderVerificationQueue();
    } else if (viewId === 'feedback') {
      this.renderFeedbackWall();
    }
  }

  handleHashChange() {
    const hash = window.location.hash.replace('#', '') || 'home';
    this.showView(hash);
  }

  updateHeaderStallInfo() {
    const nameEl = document.getElementById('header-stall-name');
    if (nameEl) nameEl.textContent = window.StallStore.settings.name;
  }

  /* ==========================================================================
     CUSTOMER AUTH & STALL PASS
     ========================================================================== */

  renderCustomerNav() {
    const container = document.getElementById('nav-customer-container');
    if (!container) return;

    const customer = window.StallStore.currentCustomer;
    if (customer) {
      container.innerHTML = `
        <button onclick="App.showView('pass')" class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 text-xs font-semibold border border-brand-200 transition-colors" title="My Stall Pass">
          <i class="fa-solid fa-id-card text-brand-600"></i>
          <span class="max-w-[100px] truncate">${customer.name.split(' ')[0]}</span>
        </button>
      `;
    } else {
      container.innerHTML = `
        <button onclick="App.showView('pass')" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors">
          <i class="fa-solid fa-user-plus mr-1"></i> Register
        </button>
      `;
    }
  }

  toggleAuthMode() {
    this.isRegisterMode = !this.isRegisterMode;
    const title = document.getElementById('auth-form-title');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const nameGroup = document.getElementById('auth-name-group');
    const collegeGroup = document.getElementById('auth-college-group');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (this.isRegisterMode) {
      title.textContent = "Customer Registration";
      toggleBtn.textContent = "Existing User? Login";
      nameGroup.style.display = 'block';
      collegeGroup.style.display = 'block';
      document.getElementById('reg-name').required = true;
      submitBtn.innerHTML = `<i class="fa-solid fa-id-card"></i> Register & Generate Stall Pass`;
    } else {
      title.textContent = "Customer Login";
      toggleBtn.textContent = "New Customer? Register";
      nameGroup.style.display = 'none';
      collegeGroup.style.display = 'none';
      document.getElementById('reg-name').required = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Login with Mobile Number`;
    }
  }

  handleCustomerAuth(e) {
    e.preventDefault();
    const phone = document.getElementById('reg-phone').value.trim();

    if (this.isRegisterMode) {
      const name = document.getElementById('reg-name').value.trim();
      const college = document.getElementById('reg-college').value.trim();

      try {
        const customer = window.StallStore.registerCustomer(name, phone, college);
        this.showToast(`Welcome, ${customer.name}! Stall Pass generated.`, 'success');
        if (window.SoundEffects) window.SoundEffects.playSuccess();
        if (window.confetti) {
          window.confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
        }
        this.renderCustomerPass();
      } catch (err) {
        this.showToast(err.message, 'error');
      }
    } else {
      // Login mode
      const customer = window.StallStore.loginCustomerByPhone(phone);
      if (customer) {
        this.showToast(`Logged in as ${customer.name}`, 'success');
        this.renderCustomerPass();
      } else {
        this.showToast("No customer pass found for this number. Please register first.", 'warning');
        this.toggleAuthMode();
      }
    }
  }

  showSwitchAccount() {
    document.getElementById('customer-auth-card').classList.remove('hidden');
    document.getElementById('customer-pass-card').classList.add('hidden');
  }

  logoutCustomer() {
    window.StallStore.logoutCustomer();
    this.showToast("You have been logged out of customer pass.", 'info');
    this.showSwitchAccount();
  }

  renderCustomerPass() {
    const authCard = document.getElementById('customer-auth-card');
    const passCard = document.getElementById('customer-pass-card');
    const customer = window.StallStore.currentCustomer;

    if (!customer) {
      authCard.classList.remove('hidden');
      passCard.classList.add('hidden');
      return;
    }

    authCard.classList.add('hidden');
    passCard.classList.remove('hidden');

    document.getElementById('pass-name').textContent = customer.name;
    document.getElementById('pass-phone').textContent = `+91 ${customer.phone}`;
    document.getElementById('pass-id').textContent = customer.id;
    document.getElementById('pass-college').textContent = customer.college || "General Fest Visitor";

    // Generate dynamic QR Code for Customer Pass
    window.UpiQrService.renderCustomerPassQr('pass-qr-container', customer);
  }

  /* ==========================================================================
     MENU & PRODUCTS
     ========================================================================== */

  renderProducts() {
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    let items = window.StallStore.products;

    // Filter by Category
    if (this.selectedCategory !== 'all') {
      items = items.filter(item => item.category === this.selectedCategory);
    }

    // Filter by Search Query
    const searchInput = document.getElementById('menu-search-input');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (query) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) || 
        (item.description && item.description.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query)
      );
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
          <i class="fa-solid fa-utensils text-3xl mb-3 text-slate-300"></i>
          <h4 class="font-bold text-slate-800 text-base">No items found</h4>
          <p class="text-xs text-slate-500 mt-1">Try another category or search term.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(product => {
      const inCart = window.StallStore.cart.find(c => c.id === product.id);
      const cartQty = inCart ? inCart.qty : 0;

      return `
        <div class="glass-card rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${!product.inStock ? 'opacity-60 grayscale' : ''}">
          
          <div class="p-5 space-y-3">
            <!-- Header Icon & Badge -->
            <div class="flex items-start justify-between">
              <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                ${product.emoji || '🍽️'}
              </div>
              <div class="flex flex-col items-end gap-1">
                ${product.badge ? `
                  <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    ${product.badge}
                  </span>
                ` : ''}
                ${!product.inStock ? `
                  <span class="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                    Out of Stock
                  </span>
                ` : `
                  <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                    In Stock
                  </span>
                `}
              </div>
            </div>

            <!-- Product Details -->
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${product.category}</span>
              <h3 class="font-bold text-slate-900 text-base leading-tight mt-0.5">${product.name}</h3>
              <p class="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">${product.description || ''}</p>
            </div>
          </div>

          <!-- Price & Add to Cart Controls -->
          <div class="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span class="text-[10px] text-slate-400 font-medium">Price</span>
              <div class="text-lg font-extrabold text-slate-900 font-mono-code">₹${product.price}</div>
            </div>

            <div>
              ${!product.inStock ? `
                <button disabled class="px-3.5 py-2 rounded-xl bg-slate-200 text-slate-400 text-xs font-semibold cursor-not-allowed">
                  Unavailable
                </button>
              ` : cartQty === 0 ? `
                <button onclick="App.addToCart('${product.id}')" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95">
                  <i class="fa-solid fa-plus text-[10px]"></i> Add
                </button>
              ` : `
                <div class="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-brand-300 shadow-sm">
                  <button onclick="App.updateCartQty('${product.id}', ${cartQty - 1})" class="w-6 h-6 rounded-lg bg-slate-100 hover:bg-brand-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                    -
                  </button>
                  <span class="text-xs font-bold text-slate-900 font-mono-code px-1">${cartQty}</span>
                  <button onclick="App.updateCartQty('${product.id}', ${cartQty + 1})" class="w-6 h-6 rounded-lg bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center text-xs font-bold">
                    +
                  </button>
                </div>
              `}
            </div>
          </div>

        </div>
      `;
    }).join('');
  }

  setCategoryFilter(category) {
    this.selectedCategory = category;
    document.querySelectorAll('.category-pill').forEach(btn => {
      if (btn.dataset.category === category) {
        btn.classList.add('active', 'bg-brand-600', 'text-white');
        btn.classList.remove('bg-white', 'text-slate-600');
      } else {
        btn.classList.remove('active', 'bg-brand-600', 'text-white');
        btn.classList.add('bg-white', 'text-slate-600');
      }
    });
    this.renderProducts();
  }

  filterProducts() {
    this.renderProducts();
  }

  /* ==========================================================================
     SHOPPING CART
     ========================================================================== */

  addToCart(productId) {
    window.StallStore.addToCart(productId, 1);
    this.renderProducts();
  }

  updateCartQty(productId, qty) {
    window.StallStore.updateCartQty(productId, qty);
    this.renderProducts();
    this.renderCartModalItems();
  }

  updateCartUi() {
    const count = window.StallStore.getCartCount();
    const total = window.StallStore.getCartTotal();

    // 1. Header Badge
    const headerBadge = document.getElementById('cart-badge-count');
    if (headerBadge) headerBadge.textContent = count;

    // 2. Floating Bottom Cart Bar
    const floatingBar = document.getElementById('floating-cart-bar');
    const floatingCount = document.getElementById('floating-cart-count');
    const floatingTotal = document.getElementById('floating-cart-total');

    if (floatingBar && floatingCount && floatingTotal) {
      if (count > 0 && this.currentView === 'menu') {
        floatingCount.textContent = count;
        floatingTotal.textContent = `₹${total}`;
        floatingBar.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-32');
      } else {
        floatingBar.classList.add('opacity-0', 'pointer-events-none', 'translate-y-32');
      }
    }
  }

  openCartModal() {
    this.renderCartModalItems();
    const modal = document.getElementById('cart-modal');
    if (modal) modal.classList.add('active');
  }

  closeCartModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) modal.classList.remove('active');
  }

  renderCartModalItems() {
    const container = document.getElementById('cart-drawer-items');
    const subtotalEl = document.getElementById('cart-modal-subtotal');
    const totalEl = document.getElementById('cart-modal-total');
    const checkoutBtn = document.getElementById('btn-cart-checkout');
    if (!container) return;

    const cart = window.StallStore.cart;
    const total = window.StallStore.getCartTotal();

    if (subtotalEl) subtotalEl.textContent = `₹${total}`;
    if (totalEl) totalEl.textContent = `₹${total}`;

    if (cart.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-slate-400 space-y-2">
          <i class="fa-solid fa-basket-shopping text-4xl text-slate-300 mb-2"></i>
          <p class="text-sm font-bold text-slate-700">Your cart is empty</p>
          <p class="text-xs text-slate-500">Pick some delicious momos, cold coffee or merch!</p>
        </div>
      `;
      if (checkoutBtn) checkoutBtn.disabled = true;
      return;
    }

    if (checkoutBtn) checkoutBtn.disabled = false;

    container.innerHTML = cart.map(item => `
      <div class="py-3 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <span class="text-2xl">${item.emoji || '🍽️'}</span>
          <div>
            <h4 class="font-bold text-slate-900 text-xs leading-tight">${item.name}</h4>
            <span class="text-[11px] text-slate-500 font-mono-code">₹${item.price} each</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl">
            <button onclick="App.updateCartQty('${item.id}', ${item.qty - 1})" class="w-5 h-5 rounded bg-white text-slate-800 text-xs font-bold shadow-xs flex items-center justify-center">-</button>
            <span class="text-xs font-bold text-slate-800 font-mono-code px-1">${item.qty}</span>
            <button onclick="App.updateCartQty('${item.id}', ${item.qty + 1})" class="w-5 h-5 rounded bg-brand-600 text-white text-xs font-bold shadow-xs flex items-center justify-center">+</button>
          </div>
          <span class="text-xs font-bold text-slate-900 font-mono-code w-12 text-right">₹${item.price * item.qty}</span>
        </div>
      </div>
    `).join('');
  }

  proceedToCheckout() {
    this.closeCartModal();

    // Ensure customer is registered
    const customer = window.StallStore.currentCustomer;
    if (!customer) {
      this.showToast("Please register or login to complete your order.", "warning");
      this.showView('pass');
      return;
    }

    if (window.StallStore.cart.length === 0) {
      this.showToast("Cart is empty. Please select products.", "warning");
      this.showView('menu');
      return;
    }

    this.setupCheckoutView();
    this.showView('checkout');
  }

  /* ==========================================================================
     CHECKOUT & UPI QR GENERATION
     ========================================================================== */

  setupCheckoutView() {
    const customer = window.StallStore.currentCustomer;
    const cart = window.StallStore.cart;
    const totalAmount = window.StallStore.getCartTotal();
    const settings = window.StallStore.settings;

    // Set Customer Identity
    document.getElementById('checkout-customer-name').textContent = customer ? customer.name : "Guest";
    document.getElementById('checkout-customer-phone').textContent = customer ? `+91 ${customer.phone}` : "";
    document.getElementById('checkout-total-amount').textContent = `₹${totalAmount}`;
    document.getElementById('checkout-upi-id').textContent = settings.upiId;

    // Render Order Items
    const itemsList = document.getElementById('checkout-items-list');
    if (itemsList) {
      itemsList.innerHTML = cart.map(item => `
        <div class="py-1.5 flex justify-between items-center">
          <span>${item.emoji || ''} ${item.name} × ${item.qty}</span>
          <span class="font-mono-code font-bold">₹${item.price * item.qty}</span>
        </div>
      `).join('');
    }

    // Generate UPI Payment QR Code
    const orderTempToken = String(window.StallStore.transactions.length + 1).padStart(3, '0');
    const upiUri = window.UpiQrService.renderPaymentQr('payment-qr-container', {
      upiId: settings.upiId,
      payeeName: settings.payeeName,
      amount: totalAmount,
      orderToken: orderTempToken,
      orderId: `SP${Date.now().toString().slice(-4)}`
    });

    // Update Mobile Direct App Intent Links
    const gpayLink = document.getElementById('intent-gpay');
    const phonepeLink = document.getElementById('intent-phonepe');
    const paytmLink = document.getElementById('intent-paytm');

    if (gpayLink) gpayLink.href = upiUri;
    if (phonepeLink) phonepeLink.href = upiUri;
    if (paytmLink) paytmLink.href = upiUri;

    // Reset UTR form
    document.getElementById('checkout-utr-input').value = '';
    document.getElementById('checkout-notes-input').value = '';
  }

  copyUpiId() {
    const upiId = window.StallStore.settings.upiId;
    navigator.clipboard.writeText(upiId).then(() => {
      this.showToast(`Stall UPI ID (${upiId}) copied to clipboard!`, 'success');
    }).catch(() => {
      this.showToast(`UPI ID: ${upiId}`, 'info');
    });
  }

  /* ==========================================================================
     CRITICAL REQUIREMENT: UTR SUBMISSION & STRICTLY PENDING INITIAL STATUS
     Never mark as successful just because QR was scanned or UTR was entered!
     ========================================================================== */

  handleUtrSubmission(e) {
    e.preventDefault();

    const utrInput = document.getElementById('checkout-utr-input');
    const notesInput = document.getElementById('checkout-notes-input');
    const utr = utrInput.value.trim();
    const notes = notesInput ? notesInput.value.trim() : "";

    if (!utr || utr.length < 4) {
      this.showToast("Please enter a valid 12-digit UPI Reference Number (UTR).", "error");
      return;
    }

    const customer = window.StallStore.currentCustomer;
    const cart = [...window.StallStore.cart];
    const totalAmount = window.StallStore.getCartTotal();

    try {
      // Create transaction with STRICTLY 'pending' status
      const txn = window.StallStore.createTransaction({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items: cart,
        totalAmount: totalAmount,
        utr: utr,
        notes: notes
      });

      this.activeConfirmationTxnId = txn.id;
      this.showOrderConfirmation(txn);
      this.showView('confirmation');
      this.showToast(`Order placed with Token #${txn.token}! Status is PENDING team verification.`, 'info');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  /* ==========================================================================
     ORDER CONFIRMATION & LIVE STATUS TRACKER
     ========================================================================== */

  showOrderConfirmation(txn) {
    this.activeConfirmationTxnId = txn.id;

    document.getElementById('conf-order-token').textContent = `#${txn.token}`;
    document.getElementById('conf-token-inline').textContent = `#${txn.token}`;
    document.getElementById('conf-txn-id').textContent = txn.id;
    document.getElementById('conf-customer-name').textContent = txn.customerName;
    document.getElementById('conf-utr').textContent = txn.utr;
    document.getElementById('conf-datetime').textContent = `${txn.date} at ${txn.time}`;
    document.getElementById('conf-total-amount').textContent = `₹${txn.totalAmount}`;

    // Items list
    const itemsList = document.getElementById('conf-items-list');
    if (itemsList) {
      itemsList.innerHTML = txn.items.map(item => `
        <div class="flex justify-between">
          <span>${item.emoji || ''} ${item.name} × ${item.qty}</span>
          <span class="font-mono-code">₹${item.price * item.qty}</span>
        </div>
      `).join('');
    }

    this.updateConfirmationStatusBanner(txn);
  }

  updateConfirmationStatusBanner(txn) {
    const banner = document.getElementById('conf-status-banner');
    const desc = document.getElementById('conf-status-desc');
    if (!banner || !desc) return;

    if (txn.status === 'pending') {
      banner.className = "p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 space-y-2 pending-pulse-badge";
      banner.innerHTML = `
        <div class="flex items-center justify-center gap-2 font-bold text-base text-amber-800">
          <i class="fa-solid fa-hourglass-half text-amber-600 animate-spin"></i>
          Payment Pending Team Verification
        </div>
        <p class="text-xs text-amber-700 leading-relaxed">
          Your transaction reference (UTR: <strong class="font-mono-code">${txn.utr}</strong>) has been submitted. Please show Token <strong class="text-amber-900">#${txn.token}</strong> at the stall counter. The team will verify your payment in their bank app before preparing your order.
        </p>
      `;
    } else if (txn.status === 'verified') {
      banner.className = "p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-900 space-y-2";
      banner.innerHTML = `
        <div class="flex items-center justify-center gap-2 font-bold text-base text-emerald-700">
          <i class="fa-solid fa-circle-check text-emerald-500 text-xl"></i>
          Payment Verified by Stall Desk!
        </div>
        <p class="text-xs text-emerald-700 leading-relaxed">
          Great news! Your payment of <strong>₹${txn.totalAmount}</strong> has been confirmed. Collect your order at the stall with Token <strong>#${txn.token}</strong>. Enjoy! 🥟🧋
        </p>
      `;
    } else if (txn.status === 'rejected') {
      banner.className = "p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 space-y-2";
      banner.innerHTML = `
        <div class="flex items-center justify-center gap-2 font-bold text-base text-rose-700">
          <i class="fa-solid fa-triangle-exclamation text-rose-600 text-xl"></i>
          Payment Verification Unsuccessful
        </div>
        <p class="text-xs text-rose-700 leading-relaxed">
          Reason: ${txn.rejectionReason || "UTR number was not found in stall bank SMS/terminal."} Please visit the stall counter with your payment app.
        </p>
      `;
    }
  }

  // Reactive listener: If customer is looking at Confirmation view and team approves it, update live!
  checkLiveConfirmationUpdate() {
    if (this.currentView === 'confirmation' && this.activeConfirmationTxnId) {
      const txn = window.StallStore.getTransactionById(this.activeConfirmationTxnId);
      if (txn) {
        const wasPending = document.getElementById('conf-status-banner')?.classList.contains('pending-pulse-badge');
        this.updateConfirmationStatusBanner(txn);

        if (wasPending && txn.status === 'verified') {
          // Play celebration confetti & chime
          if (window.confetti) {
            window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          }
          if (window.SoundEffects) window.SoundEffects.playSuccess();
          this.showToast(`Payment Verified! Your order Token #${txn.token} is confirmed.`, 'success');
        }
      }
    }
  }

  printReceipt() {
    const txn = window.StallStore.getTransactionById(this.activeConfirmationTxnId);
    if (!txn) {
      this.showToast("No active order receipt to print.", "warning");
      return;
    }

    const printArea = document.getElementById('printable-receipt-area');
    document.getElementById('print-token').textContent = `TOKEN #${txn.token}`;
    document.getElementById('print-status').textContent = `STATUS: ${txn.status.toUpperCase()}`;
    document.getElementById('print-date').textContent = `${txn.date} ${txn.time}`;
    document.getElementById('print-customer').textContent = `${txn.customerName} (${txn.customerPhone})`;
    document.getElementById('print-utr').textContent = txn.utr;
    document.getElementById('print-total').textContent = `₹${txn.totalAmount}`;

    const itemsEl = document.getElementById('print-items-list');
    itemsEl.innerHTML = txn.items.map(i => `
      <div style="display:flex; justify-content:space-between; margin:2px 0;">
        <span>${i.name} x${i.qty}</span>
        <span>₹${i.price * i.qty}</span>
      </div>
    `).join('');

    printArea.classList.remove('hidden');
    window.print();
    printArea.classList.add('hidden');
  }

  /* ==========================================================================
     TRANSACTION HISTORY VIEW
     ========================================================================== */

  renderHistory() {
    const container = document.getElementById('history-transactions-list');
    if (!container) return;

    const customer = window.StallStore.currentCustomer;
    let list = customer ? window.StallStore.getCustomerTransactions(customer.phone) : window.StallStore.transactions;

    if (this.historyFilter !== 'all') {
      list = list.filter(t => t.status === this.historyFilter);
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div class="glass-card p-12 text-center text-slate-500 rounded-3xl border border-slate-200">
          <i class="fa-solid fa-receipt text-3xl mb-2 text-slate-300"></i>
          <p class="text-sm font-bold text-slate-800">No transactions found</p>
          <p class="text-xs text-slate-500 mt-1">Orders you place with this phone number will appear here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = list.map(t => {
      let statusBadge = '';
      if (t.status === 'verified') {
        statusBadge = `<span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1"><i class="fa-solid fa-check"></i> Verified</span>`;
      } else if (t.status === 'pending') {
        statusBadge = `<span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1 animate-pulse"><i class="fa-solid fa-clock"></i> Pending Desk Verification</span>`;
      } else {
        statusBadge = `<span class="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold flex items-center gap-1"><i class="fa-solid fa-xmark"></i> Rejected</span>`;
      }

      const itemsStr = t.items.map(i => `${i.name} (x${i.qty})`).join(', ');

      return `
        <div class="glass-card p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-mono-code font-bold text-sm">
                #${t.token}
              </span>
              <div>
                <span class="text-xs font-bold text-slate-900">${t.id}</span>
                <span class="text-[11px] text-slate-500 block">${t.date} at ${t.time}</span>
              </div>
            </div>
            ${statusBadge}
          </div>

          <div class="text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span class="text-slate-400">Items:</span>
              <strong class="text-slate-800 ml-1">${itemsStr}</strong>
            </div>
            <div class="flex items-center gap-4">
              <div>
                <span class="text-slate-400">UTR:</span>
                <span class="font-mono-code font-semibold text-slate-700 ml-1">${t.utr}</span>
              </div>
              <div>
                <span class="text-slate-400">Total:</span>
                <span class="font-bold text-brand-700 font-mono-code text-sm ml-1">₹${t.totalAmount}</span>
              </div>
            </div>
          </div>

          ${t.rejectionReason ? `
            <p class="text-xs text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
              <i class="fa-solid fa-circle-exclamation mr-1"></i> Rejection Note: ${t.rejectionReason}
            </p>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  filterHistory(status) {
    this.historyFilter = status;
    document.querySelectorAll('.history-tab').forEach(tab => {
      if (tab.dataset.filter === status) {
        tab.classList.add('active', 'bg-white', 'text-slate-800', 'shadow-sm');
        tab.classList.remove('text-slate-600');
      } else {
        tab.classList.remove('active', 'bg-white', 'text-slate-800', 'shadow-sm');
        tab.classList.add('text-slate-600');
      }
    });
    this.renderHistory();
  }

  /* ==========================================================================
     TEAM DASHBOARD (PIN PROTECTED)
     ========================================================================== */

  checkTeamAuth() {
    const isAuthed = window.StallStore.isTeamAuthed;
    const gate = document.getElementById('team-pin-gate');
    const area = document.getElementById('team-authenticated-area');

    if (isAuthed) {
      if (gate) gate.classList.add('hidden');
      if (area) area.classList.remove('hidden');
      this.populateSettingsForm();
    } else {
      if (gate) gate.classList.remove('hidden');
      if (area) area.classList.add('hidden');
    }
  }

  handleTeamPinSubmit(e) {
    e.preventDefault();
    const pin = document.getElementById('team-pin-input').value;
    const success = window.StallStore.verifyTeamPin(pin);

    if (success) {
      this.showToast("Team Desk Unlocked!", "success");
      this.checkTeamAuth();
      this.renderFinancials();
      this.renderVerificationQueue();
    } else {
      this.showToast("Incorrect PIN. Please re-enter.", "error");
      document.getElementById('team-pin-input').value = '';
    }
  }

  logoutTeam() {
    window.StallStore.logoutTeam();
    this.checkTeamAuth();
    this.showToast("Team Desk Locked.", "info");
  }

  showTeamSubtab(subtabId) {
    this.activeSubtab = subtabId;
    document.querySelectorAll('.team-subtab-btn').forEach(btn => {
      if (btn.dataset.subtab === subtabId) {
        btn.classList.add('active', 'bg-white', 'border-t', 'border-x', 'border-slate-200', 'text-brand-700', 'shadow-sm');
        btn.classList.remove('text-slate-600');
      } else {
        btn.classList.remove('active', 'bg-white', 'border-t', 'border-x', 'border-slate-200', 'text-brand-700', 'shadow-sm');
        btn.classList.add('text-slate-600');
      }
    });

    document.querySelectorAll('.team-subtab-content').forEach(content => {
      content.classList.add('hidden');
    });

    const activeEl = document.getElementById(`subtab-${subtabId}`);
    if (activeEl) activeEl.classList.remove('hidden');

    if (subtabId === 'verify') this.renderVerificationQueue();
    if (subtabId === 'inventory') this.renderInventoryTable();
    if (subtabId === 'expenses') this.renderExpensesTable();
    if (subtabId === 'all-transactions') this.renderAllTransactionsTable();
  }

  /* ==========================================================================
     FINANCIAL ANALYTICS
     ========================================================================== */

  renderFinancials() {
    const metrics = window.StallStore.getFinancialMetrics();
    const feedback = window.StallStore.getFeedbackMetrics();

    // Home Page Stats
    const homeSales = document.getElementById('home-stat-sales');
    const homeOrders = document.getElementById('home-stat-orders');
    const homePending = document.getElementById('home-stat-pending');
    const homeRating = document.getElementById('home-stat-rating');

    if (homeSales) homeSales.textContent = `₹${metrics.verifiedSales}`;
    if (homeOrders) homeOrders.textContent = metrics.verifiedOrdersCount;
    if (homePending) homePending.textContent = metrics.pendingOrdersCount;
    if (homeRating) homeRating.textContent = feedback.average.toFixed(1);

    // Team Dashboard Stats
    const dashVerified = document.getElementById('dash-verified-sales');
    const dashVerifiedCount = document.getElementById('dash-orders-verified-count');
    const dashPending = document.getElementById('dash-pending-sales');
    const dashPendingCount = document.getElementById('dash-pending-count');
    const dashExpenses = document.getElementById('dash-total-expenses');
    const dashExpenseCount = document.getElementById('dash-expense-count');
    const dashNetProfit = document.getElementById('dash-net-profit');
    const dashProfitMargin = document.getElementById('dash-profit-margin');
    const tabPendingBadge = document.getElementById('tab-pending-badge');

    if (dashVerified) dashVerified.textContent = `₹${metrics.verifiedSales}`;
    if (dashVerifiedCount) dashVerifiedCount.textContent = `${metrics.verifiedOrdersCount} orders`;
    if (dashPending) dashPending.textContent = `₹${metrics.pendingSales}`;
    if (dashPendingCount) dashPendingCount.textContent = `${metrics.pendingOrdersCount} pending`;
    if (dashExpenses) dashExpenses.textContent = `₹${metrics.totalExpenses}`;
    if (dashExpenseCount) dashExpenseCount.textContent = `${window.StallStore.expenses.length} entries`;
    if (dashNetProfit) dashNetProfit.textContent = `₹${metrics.netProfit}`;
    if (dashProfitMargin) dashProfitMargin.textContent = `${metrics.profitMargin}% margin`;
    if (tabPendingBadge) tabPendingBadge.textContent = metrics.pendingOrdersCount;

    // Subtab Expenses Net Profit Banner
    const calcSales = document.getElementById('calc-sales-label');
    const calcExp = document.getElementById('calc-exp-label');
    const calcNet = document.getElementById('calc-net-profit-badge');
    if (calcSales) calcSales.textContent = `₹${metrics.verifiedSales}`;
    if (calcExp) calcExp.textContent = `₹${metrics.totalExpenses}`;
    if (calcNet) calcNet.textContent = `₹${metrics.netProfit}`;
  }

  /* ==========================================================================
     PAYMENT VERIFICATION QUEUE (DESK)
     ========================================================================== */

  renderVerificationQueue() {
    const container = document.getElementById('verification-queue-container');
    if (!container) return;

    let pendingList = window.StallStore.transactions.filter(t => t.status === 'pending');

    // Search filter
    const searchInput = document.getElementById('verify-search-input');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (query) {
      pendingList = pendingList.filter(t => 
        t.utr.toLowerCase().includes(query) ||
        t.customerName.toLowerCase().includes(query) ||
        t.customerPhone.includes(query) ||
        t.token.includes(query)
      );
    }

    if (pendingList.length === 0) {
      container.innerHTML = `
        <div class="glass-card p-10 text-center text-slate-500 rounded-3xl border border-slate-200">
          <i class="fa-solid fa-circle-check text-4xl text-emerald-500 mb-2"></i>
          <h4 class="font-bold text-slate-800 text-base">Verification Queue All Clear!</h4>
          <p class="text-xs text-slate-500 mt-1">No pending UPI payments waiting for desk approval.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pendingList.map(t => {
      const itemsList = t.items.map(i => `${i.name} (x${i.qty})`).join(', ');

      return `
        <div class="glass-card p-5 rounded-3xl border-2 border-amber-200 bg-amber-50/20 shadow-sm space-y-3">
          
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-100">
            <div class="flex items-center gap-3">
              <span class="px-3 py-1.5 rounded-2xl bg-slate-900 text-amber-400 font-mono-code font-extrabold text-base">
                #${t.token}
              </span>
              <div>
                <h4 class="font-bold text-slate-900 text-sm">${t.customerName}</h4>
                <p class="text-[11px] text-slate-500 font-mono">+91 ${t.customerPhone} • ${t.time}</p>
              </div>
            </div>

            <div class="text-right">
              <span class="text-[10px] text-slate-500 uppercase font-bold">Payable Amount</span>
              <div class="text-xl font-extrabold text-brand-700 font-mono-code">₹${t.totalAmount}</div>
            </div>
          </div>

          <!-- UTR Verification Box -->
          <div class="bg-white p-3.5 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Submitted UTR Reference</span>
              <span class="font-mono-code font-bold text-base text-slate-900 tracking-wide">${t.utr}</span>
            </div>
            <button onclick="navigator.clipboard.writeText('${t.utr}'); App.showToast('UTR copied to clipboard', 'info');" class="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold self-start sm:self-center">
              <i class="fa-solid fa-copy mr-1 text-slate-500"></i> Copy UTR
            </button>
          </div>

          <!-- Items Ordered & Notes -->
          <div class="text-xs text-slate-600">
            <strong>Ordered:</strong> ${itemsList}
            ${t.notes ? `<p class="mt-1 text-amber-800 bg-amber-100/60 p-2 rounded-xl text-[11px]"><i class="fa-solid fa-comment-dots mr-1"></i> Customer Note: "${t.notes}"</p>` : ''}
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button onclick="App.rejectPaymentPrompt('${t.id}')" class="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all">
              <i class="fa-solid fa-xmark mr-1"></i> Reject
            </button>
            <button onclick="App.approvePayment('${t.id}')" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 active:scale-95">
              <i class="fa-solid fa-check"></i> Approve & Mark Verified
            </button>
          </div>

        </div>
      `;
    }).join('');
  }

  approvePayment(txnId) {
    const ok = window.StallStore.verifyTransaction(txnId, "Desk Coordinator");
    if (ok) {
      this.showToast("Payment verified successfully!", "success");
      this.renderVerificationQueue();
      this.renderFinancials();
    }
  }

  rejectPaymentPrompt(txnId) {
    const reason = prompt("Enter rejection reason (e.g. UTR not found in bank SMS, Incorrect Amount):", "UTR not received in stall bank account");
    if (reason !== null) {
      window.StallStore.rejectTransaction(txnId, reason);
      this.showToast("Payment marked as rejected.", "warning");
      this.renderVerificationQueue();
      this.renderFinancials();
    }
  }

  /* ==========================================================================
     INVENTORY & PRODUCTS MANAGEMENT
     ========================================================================== */

  renderInventoryTable() {
    const tbody = document.getElementById('inventory-table-body');
    if (!tbody) return;

    tbody.innerHTML = window.StallStore.products.map(p => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-4 py-3 flex items-center gap-2.5">
          <span class="text-xl">${p.emoji || '🍽️'}</span>
          <div>
            <span class="font-bold text-slate-800">${p.name}</span>
            ${p.badge ? `<span class="ml-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">${p.badge}</span>` : ''}
          </div>
        </td>
        <td class="px-4 py-3 text-slate-500">${p.category}</td>
        <td class="px-4 py-3 font-mono-code font-bold text-slate-900">₹${p.price}</td>
        <td class="px-4 py-3">
          <button onclick="App.toggleProductStock('${p.id}')" class="px-2.5 py-1 rounded-full text-[10px] font-bold ${p.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
            ${p.inStock ? 'In Stock' : 'Out of Stock'}
          </button>
        </td>
        <td class="px-4 py-3 text-right">
          <button onclick="App.deleteProduct('${p.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50" title="Delete Product">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  toggleProductStock(productId) {
    window.StallStore.toggleProductStock(productId);
  }

  deleteProduct(productId) {
    if (confirm("Are you sure you want to remove this product from the menu?")) {
      window.StallStore.deleteProduct(productId);
      this.showToast("Product deleted.", "info");
    }
  }

  openAddProductModal() {
    document.getElementById('add-product-modal')?.classList.add('active');
  }

  closeAddProductModal() {
    document.getElementById('add-product-modal')?.classList.remove('active');
  }

  handleAddProduct(e) {
    e.preventDefault();
    const name = document.getElementById('new-prod-name').value;
    const category = document.getElementById('new-prod-category').value;
    const price = document.getElementById('new-prod-price').value;
    const emoji = document.getElementById('new-prod-emoji').value;
    const badge = document.getElementById('new-prod-badge').value;
    const desc = document.getElementById('new-prod-desc').value;

    try {
      window.StallStore.addProduct({
        name,
        category,
        price,
        emoji,
        badge,
        description: desc
      });
      this.closeAddProductModal();
      this.showToast("Product added to menu successfully!", "success");
      e.target.reset();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  /* ==========================================================================
     EXPENSES & PROFIT MANAGEMENT
     ========================================================================== */

  renderExpensesTable() {
    const tbody = document.getElementById('expenses-table-body');
    if (!tbody) return;

    if (window.StallStore.expenses.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">No expenses recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = window.StallStore.expenses.map(e => `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-4 py-3 font-semibold text-slate-800">${e.title}</td>
        <td class="px-4 py-3 text-slate-500">${e.category}</td>
        <td class="px-4 py-3 font-mono-code font-bold text-rose-600">₹${e.amount}</td>
        <td class="px-4 py-3 text-slate-500 font-mono">${e.date}</td>
        <td class="px-4 py-3 text-slate-500 text-[11px]">${e.notes || '--'}</td>
        <td class="px-4 py-3 text-right">
          <button onclick="App.deleteExpense('${e.id}')" class="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50" title="Delete Expense">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join('');
  }

  deleteExpense(expenseId) {
    if (confirm("Delete this expense record?")) {
      window.StallStore.deleteExpense(expenseId);
      this.showToast("Expense removed.", "info");
    }
  }

  openAddExpenseModal() {
    document.getElementById('add-expense-modal')?.classList.add('active');
  }

  closeAddExpenseModal() {
    document.getElementById('add-expense-modal')?.classList.remove('active');
  }

  handleAddExpense(e) {
    e.preventDefault();
    const title = document.getElementById('new-exp-title').value;
    const category = document.getElementById('new-exp-category').value;
    const amount = document.getElementById('new-exp-amount').value;
    const notes = document.getElementById('new-exp-notes').value;

    try {
      window.StallStore.addExpense({ title, category, amount, notes });
      this.closeAddExpenseModal();
      this.showToast("Stall expense recorded!", "success");
      e.target.reset();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  exportExpensesCSV() {
    window.StallStore.exportExpensesCSV();
  }

  /* ==========================================================================
     ALL TRANSACTIONS LOG
     ========================================================================== */

  renderAllTransactionsTable() {
    const tbody = document.getElementById('all-transactions-table-body');
    if (!tbody) return;

    if (window.StallStore.transactions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="px-4 py-8 text-center text-slate-400">No transactions recorded yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = window.StallStore.transactions.map(t => {
      let statusBadge = '';
      if (t.status === 'verified') statusBadge = '<span class="text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full text-[10px]">VERIFIED</span>';
      else if (t.status === 'pending') statusBadge = '<span class="text-amber-800 bg-amber-100 font-bold px-2 py-0.5 rounded-full text-[10px]">PENDING</span>';
      else statusBadge = '<span class="text-rose-700 bg-rose-100 font-bold px-2 py-0.5 rounded-full text-[10px]">REJECTED</span>';

      const itemsStr = t.items.map(i => `${i.name} (x${i.qty})`).join(', ');

      return `
        <tr class="hover:bg-slate-50 transition-colors">
          <td class="px-4 py-3 font-mono-code font-bold text-slate-900">#${t.token}</td>
          <td class="px-4 py-3">
            <span class="font-bold text-slate-800">${t.customerName}</span>
            <span class="block text-[10px] text-slate-400 font-mono">${t.customerPhone}</span>
          </td>
          <td class="px-4 py-3 text-slate-600 max-w-xs truncate" title="${itemsStr}">${itemsStr}</td>
          <td class="px-4 py-3 font-mono-code font-bold text-brand-700">₹${t.totalAmount}</td>
          <td class="px-4 py-3">${statusBadge}</td>
          <td class="px-4 py-3 font-mono-code text-slate-700">${t.utr}</td>
          <td class="px-4 py-3 text-slate-500 font-mono">${t.time}</td>
          <td class="px-4 py-3 text-right">
            ${t.status === 'pending' ? `
              <button onclick="App.approvePayment('${t.id}')" class="px-2 py-1 rounded bg-emerald-600 text-white font-bold text-[10px]">
                Verify
              </button>
            ` : `
              <span class="text-[10px] text-slate-400">${t.verifiedBy || 'Completed'}</span>
            `}
          </td>
        </tr>
      `;
    }).join('');
  }

  exportTransactionsCSV() {
    window.StallStore.exportTransactionsCSV();
  }

  /* ==========================================================================
     SETTINGS & RESET
     ========================================================================== */

  populateSettingsForm() {
    const s = window.StallStore.settings;
    if (document.getElementById('set-stall-name')) document.getElementById('set-stall-name').value = s.name;
    if (document.getElementById('set-event-name')) document.getElementById('set-event-name').value = s.event;
    if (document.getElementById('set-upi-id')) document.getElementById('set-upi-id').value = s.upiId;
    if (document.getElementById('set-payee-name')) document.getElementById('set-payee-name').value = s.payeeName;
    if (document.getElementById('set-team-pin')) document.getElementById('set-team-pin').value = s.teamPin;
  }

  handleSaveSettings(e) {
    e.preventDefault();
    const name = document.getElementById('set-stall-name').value;
    const event = document.getElementById('set-event-name').value;
    const upiId = document.getElementById('set-upi-id').value;
    const payeeName = document.getElementById('set-payee-name').value;
    const teamPin = document.getElementById('set-team-pin').value;

    window.StallStore.updateSettings({
      name,
      event,
      upiId,
      payeeName,
      teamPin
    });

    this.showToast("Stall settings updated successfully!", "success");
  }

  confirmResetAllData() {
    if (confirm("DANGER: This will reset all transactions, customer passes, and expenses to initial demo state. Continue?")) {
      window.StallStore.resetAllData();
      this.showToast("All stall data reset.", "info");
      this.renderFinancials();
      this.renderVerificationQueue();
    }
  }

  /* ==========================================================================
     CUSTOMER FEEDBACK & REVIEWS
     ========================================================================== */

  setFormRating(rating) {
    this.selectedRating = rating;
    document.getElementById('form-rating-val').value = rating;

    const labels = {
      1: "1 Star - Needs Improvement",
      2: "2 Stars - Fair",
      3: "3 Stars - Good",
      4: "4 Stars - Great Experience!",
      5: "5 Stars - Outstanding!"
    };

    const labelEl = document.getElementById('star-rating-label');
    if (labelEl) labelEl.textContent = labels[rating] || `${rating} Stars`;

    const stars = document.querySelectorAll('#star-picker i');
    stars.forEach((star, idx) => {
      if (idx < rating) {
        star.className = "fa-solid fa-star text-amber-400";
      } else {
        star.className = "fa-regular fa-star text-slate-300";
      }
    });
  }

  setFeedbackTag(btn, tag) {
    document.querySelectorAll('.fb-tag-btn').forEach(b => {
      b.classList.remove('active', 'bg-brand-50', 'text-brand-700', 'border-brand-200');
      b.classList.add('bg-slate-100', 'text-slate-600', 'border-transparent');
    });

    btn.classList.add('active', 'bg-brand-50', 'text-brand-700', 'border-brand-200');
    btn.classList.remove('bg-slate-100', 'text-slate-600', 'border-transparent');

    document.getElementById('form-feedback-tag').value = tag;
  }

  handleFeedbackSubmit(e) {
    e.preventDefault();
    const rating = document.getElementById('form-rating-val').value;
    const nameInput = document.getElementById('fb-customer-name').value.trim();
    const phoneInput = document.getElementById('fb-customer-phone').value.trim();
    const tag = document.getElementById('form-feedback-tag').value;
    const comment = document.getElementById('fb-comment').value.trim();

    const customer = window.StallStore.currentCustomer;
    const finalName = nameInput || (customer ? customer.name : "Anonymous Student");
    const finalPhone = phoneInput || (customer ? customer.phone : "");

    try {
      window.StallStore.addFeedback({
        customerName: finalName,
        customerPhone: finalPhone,
        rating,
        tag,
        comment
      });

      this.showToast("Thank you for your feedback! Review published on wall.", "success");
      if (window.confetti) {
        window.confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
      if (window.SoundEffects) window.SoundEffects.playSuccess();

      document.getElementById('fb-comment').value = '';
      this.renderFeedbackWall();
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  renderFeedbackWall() {
    const container = document.getElementById('feedback-wall-container');
    const overallNum = document.getElementById('overall-rating-num');
    const countEl = document.getElementById('overall-reviews-count');

    const metrics = window.StallStore.getFeedbackMetrics();
    if (overallNum) overallNum.textContent = metrics.average.toFixed(1);
    if (countEl) countEl.textContent = metrics.count;

    if (!container) return;

    if (window.StallStore.feedback.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
          Be the first student to leave a review!
        </div>
      `;
      return;
    }

    container.innerHTML = window.StallStore.feedback.map(f => {
      const starIcons = Array.from({ length: 5 }, (_, i) => 
        i < f.rating ? '<i class="fa-solid fa-star text-amber-400 text-xs"></i>' : '<i class="fa-regular fa-star text-slate-200 text-xs"></i>'
      ).join('');

      return `
        <div class="glass-card p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                ${f.customerName ? f.customerName.charAt(0).toUpperCase() : 'S'}
              </div>
              <div>
                <h4 class="font-bold text-slate-900 text-xs">${f.customerName}</h4>
                <div class="flex items-center gap-1">${starIcons}</div>
              </div>
            </div>
            <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
              ${f.tag}
            </span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed italic">"${f.comment}"</p>
        </div>
      `;
    }).join('');
  }

  /* ==========================================================================
     SCANNER MODAL (CAMERA & IMAGE FILE)
     ========================================================================== */

  openScannerModal() {
    const modal = document.getElementById('scanner-modal');
    if (modal) modal.classList.add('active');

    window.StallQrScanner.startCamera(
      'qr-camera-viewport',
      (decodedText) => this.handleScanResult(decodedText),
      (err) => { /* scanning frames */ }
    );
  }

  async closeScannerModal() {
    await window.StallQrScanner.stopCamera();
    const modal = document.getElementById('scanner-modal');
    if (modal) modal.classList.remove('active');
  }

  handleScanResult(decodedText) {
    this.closeScannerModal();
    const result = window.StallQrScanner.parseScannedContent(decodedText);

    if (!result) {
      this.showToast(`Scanned: ${decodedText}`, 'info');
      return;
    }

    if (result.type === 'CUSTOMER_PASS') {
      const custData = result.data;
      const found = window.StallStore.loginCustomerByPhone(custData.phone);
      if (found) {
        this.showToast(`Identified Customer: ${found.name}`, 'success');
        this.showView('pass');
      } else {
        window.StallStore.registerCustomer(custData.name, custData.phone, custData.college);
        this.showToast(`Customer Pass Loaded: ${custData.name}`, 'success');
        this.showView('pass');
      }
    } else if (result.type === 'IDENTIFIER') {
      // Check if it matches a transaction token or ID
      const txn = window.StallStore.getTransactionById(result.id);
      if (txn) {
        if (window.StallStore.isTeamAuthed) {
          this.showView('team-dashboard');
          this.showTeamSubtab('verify');
          document.getElementById('verify-search-input').value = txn.token;
          this.renderVerificationQueue();
          this.showToast(`Located Order Token #${txn.token}`, 'success');
        } else {
          this.showOrderConfirmation(txn);
          this.showView('confirmation');
        }
      } else {
        this.showToast(`Scanned ID: ${result.id}`, 'info');
      }
    } else {
      this.showToast(`Scanned: ${decodedText.slice(0, 40)}...`, 'info');
    }
  }

  handleQrFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
      window.StallQrScanner.scanFile(
        file,
        (decoded) => this.handleScanResult(decoded),
        (err) => this.showToast("No QR code found in uploaded image.", "warning")
      );
    }
  }

  /* ==========================================================================
     FIREBASE CONFIG MODAL
     ========================================================================== */

  openFirebaseConfigModal() {
    const modal = document.getElementById('firebase-modal');
    if (modal) modal.classList.add('active');
    this.updateCloudStatusPill();
  }

  closeFirebaseConfigModal() {
    const modal = document.getElementById('firebase-modal');
    if (modal) modal.classList.remove('active');
  }

  updateCloudStatusPill() {
    const pill = document.getElementById('fb-connection-status-pill');
    const label = document.getElementById('team-cloud-sync-label');
    const status = window.FirebaseService.getStatus();

    if (status.connected) {
      if (pill) {
        pill.textContent = "🟢 Firebase Firestore Connected";
        pill.className = "font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]";
      }
      if (label) label.textContent = "Cloud: Online";
    } else {
      if (pill) {
        pill.textContent = "🟡 Local & BroadcastChannel Sync Active";
        pill.className = "font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]";
      }
      if (label) label.textContent = "Local Mode";
    }
  }

  async handleSaveFirebaseConfig(e) {
    e.preventDefault();
    const jsonStr = document.getElementById('fb-config-json').value.trim();

    try {
      const config = JSON.parse(jsonStr);
      if (!config.apiKey || !config.projectId) {
        throw new Error("Invalid config: apiKey and projectId are required.");
      }

      this.showToast("Connecting to Firebase Firestore...", "info");
      const res = await window.FirebaseService.saveConfigAndConnect(config);

      if (res.success) {
        this.showToast("Firebase Connected! Real-time Cloud Sync active.", "success");
        this.updateCloudStatusPill();
        this.closeFirebaseConfigModal();
      } else {
        this.showToast(`Firebase Init Error: ${res.error}`, "error");
      }
    } catch (err) {
      this.showToast(`JSON Parse Error: ${err.message}`, "error");
    }
  }

  disconnectFirebase() {
    window.FirebaseService.disconnect();
    this.updateCloudStatusPill();
    this.showToast("Disconnected from Firebase. Using local real-time mode.", "info");
    this.closeFirebaseConfigModal();
  }

  /* ==========================================================================
     SUPABASE CONFIG MODAL
     ========================================================================== */

  openSupabaseConfigModal() {
    const modal = document.getElementById('supabase-modal');
    if (modal) modal.classList.add('active');

    // Prepopulate if connected
    const status = window.SupabaseService.getStatus();
    const urlInput = document.getElementById('sb-input-url');
    const keyInput = document.getElementById('sb-input-anon-key');

    if (urlInput && status.url) urlInput.value = status.url;
    if (keyInput && window.SupabaseService.anonKey) keyInput.value = window.SupabaseService.anonKey;

    this.updateSupabaseStatusPill();
  }

  closeSupabaseConfigModal() {
    const modal = document.getElementById('supabase-modal');
    if (modal) modal.classList.remove('active');
  }

  updateSupabaseStatusPill() {
    const pill = document.getElementById('sb-connection-status-pill');
    const label = document.getElementById('team-supabase-sync-label');
    const urlPreview = document.getElementById('sb-connected-url-preview');
    const status = window.SupabaseService ? window.SupabaseService.getStatus() : { connected: false };

    if (status.connected) {
      if (pill) {
        pill.textContent = "🟢 PostgreSQL Realtime Online";
        pill.className = "font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]";
      }
      if (label) {
        label.textContent = "Supabase: Online";
      }
      if (urlPreview && status.url) {
        urlPreview.textContent = `Connected: ${status.url}`;
      }
    } else {
      if (pill) {
        pill.textContent = "🟡 Local Realtime (Ready to Connect)";
        pill.className = "font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px]";
      }
      if (label) {
        label.textContent = "Supabase Sync";
      }
      if (urlPreview) {
        urlPreview.textContent = "URL: Not connected (Click to configure)";
      }
    }
  }

  async handleSaveSupabaseConfig(e) {
    e.preventDefault();
    const url = document.getElementById('sb-input-url').value.trim();
    const key = document.getElementById('sb-input-anon-key').value.trim();

    if (!url || !key) {
      this.showToast("Project URL and Anon Key are required.", "warning");
      return;
    }

    this.showToast("Connecting to Supabase PostgreSQL...", "info");
    const res = await window.SupabaseService.connect(url, key);

    if (res.success) {
      this.showToast("Supabase Connected! Realtime PostgreSQL sync active.", "success");
      this.updateSupabaseStatusPill();
      this.closeSupabaseConfigModal();
    } else {
      this.showToast(`Supabase Connection Failed: ${res.error}`, "error");
    }
  }

  disconnectSupabase() {
    window.SupabaseService.disconnect();
    this.updateSupabaseStatusPill();
    this.showToast("Disconnected from Supabase. Switched to local real-time mode.", "info");
    this.closeSupabaseConfigModal();
  }

  showSchemaGuide() {
    alert("Open 'supabase-schema.sql' in this project, copy the contents, and run it in your Supabase SQL Editor at: https://supabase.com/dashboard/project/_/sql");
  }

  /* ==========================================================================
     TOAST NOTIFICATIONS
     ========================================================================== */

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const colors = {
      success: 'bg-emerald-900/95 text-emerald-200 border-emerald-700',
      error: 'bg-rose-900/95 text-rose-200 border-rose-700',
      warning: 'bg-amber-900/95 text-amber-200 border-amber-700',
      info: 'bg-slate-900/95 text-slate-200 border-slate-700'
    };

    const icons = {
      success: 'fa-circle-check text-emerald-400',
      error: 'fa-circle-xmark text-rose-400',
      warning: 'fa-triangle-exclamation text-amber-400',
      info: 'fa-circle-info text-blue-400'
    };

    const toast = document.createElement('div');
    toast.className = `p-3.5 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 backdrop-blur-md transition-all transform duration-200 translate-y-2 opacity-0 pointer-events-auto max-w-sm ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <i class="fa-solid ${icons[type] || icons.info} text-base flex-shrink-0"></i>
      <span class="flex-1 leading-snug">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animate in
    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    // Remove after 3.8s
    setTimeout(() => {
      toast.classList.add('opacity-0', '-translate-y-2');
      setTimeout(() => toast.remove(), 250);
    }, 3800);
  }
}

// Instantiate and expose globally
window.App = new StallPayApp();

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.App.init();
});
