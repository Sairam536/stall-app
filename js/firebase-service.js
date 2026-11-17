/**
 * StallPay - Firebase Service & Real-Time Sync Provider
 * Supports Firebase Firestore cloud sync with automatic LocalStorage & BroadcastChannel fallback.
 */

class FirebaseService {
  constructor() {
    this.app = null;
    this.db = null;
    this.isFirebaseReady = false;
    this.listeners = {};
    this.syncChannel = null;

    // Initialize cross-tab broadcast channel for local multi-window real-time testing
    try {
      if ('BroadcastChannel' in window) {
        this.syncChannel = new BroadcastChannel('stallpay_sync_channel');
      }
    } catch (e) {
      console.warn("BroadcastChannel not supported", e);
    }

    this.initFromSavedConfig();
  }

  // Load saved Firebase configuration from LocalStorage if present
  initFromSavedConfig() {
    try {
      const savedConfig = localStorage.getItem('stallpay_firebase_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        if (config && config.projectId && config.apiKey) {
          this.initFirebase(config);
        }
      }
    } catch (e) {
      console.warn("Could not load saved Firebase config", e);
    }
  }

  // Initialize Firebase with given configuration
  async initFirebase(config) {
    try {
      if (typeof window.firebase !== 'undefined' && window.firebase.initializeApp) {
        // Compat mode or standard web SDK
        if (!this.app) {
          this.app = window.firebase.initializeApp(config);
          this.db = window.firebase.firestore();
          this.isFirebaseReady = true;
          this.attachFirestoreListeners();
          console.log("Firebase Firestore initialized successfully.");
          return { success: true };
        }
      } else if (window.firebaseApp && window.firebaseFirestore) {
        // Modular SDK
        this.app = window.firebaseApp.initializeApp(config);
        this.db = window.firebaseFirestore.getFirestore(this.app);
        this.isFirebaseReady = true;
        this.attachFirestoreListeners();
        console.log("Firebase modular Firestore initialized.");
        return { success: true };
      } else {
        // Attempt dynamic import if CDN modular is available
        try {
          const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
          const { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
          
          this.app = initializeApp(config);
          this.db = getFirestore(this.app);
          this.firestoreOps = { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs };
          this.isFirebaseReady = true;
          this.attachModularListeners();
          console.log("Firebase dynamic CDN loaded and connected successfully!");
          return { success: true };
        } catch (importErr) {
          console.warn("Dynamic Firebase import failed, using Local/Broadcast sync:", importErr);
          this.isFirebaseReady = false;
          return { success: false, error: importErr.message };
        }
      }
    } catch (err) {
      console.error("Firebase initialization failed:", err);
      this.isFirebaseReady = false;
      return { success: false, error: err.message };
    }
  }

  // Attach Firestore snapshot listeners for real-time cloud sync
  attachModularListeners() {
    if (!this.isFirebaseReady || !this.firestoreOps) return;
    const { collection, onSnapshot } = this.firestoreOps;

    const collections = ['transactions', 'products', 'expenses', 'feedback'];
    collections.forEach(colName => {
      try {
        const q = collection(this.db, colName);
        onSnapshot(q, (snapshot) => {
          const items = [];
          snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
          });
          if (this.listeners[colName]) {
            this.listeners[colName](items);
          }
        }, (err) => {
          console.warn(`Firestore listener error on ${colName}:`, err);
        });
      } catch (e) {
        console.warn(`Failed to bind listener for ${colName}:`, e);
      }
    });
  }

  attachFirestoreListeners() {
    if (!this.isFirebaseReady || !this.db) return;
    const collections = ['transactions', 'products', 'expenses', 'feedback'];
    collections.forEach(colName => {
      try {
        this.db.collection(colName).onSnapshot((snapshot) => {
          const items = [];
          snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
          });
          if (this.listeners[colName]) {
            this.listeners[colName](items);
          }
        }, (err) => {
          console.warn(`Firestore listener error on ${colName}:`, err);
        });
      } catch (e) {
        console.warn(`Failed to bind compat listener for ${colName}:`, e);
      }
    });
  }

  // Subscribe to changes for a specific collection
  onCollectionUpdate(colName, callback) {
    this.listeners[colName] = callback;
  }

  // Save a document to cloud (and notify local sync channel)
  async saveDoc(colName, id, data) {
    // 1. Broadcast locally for instant multi-window sync
    this.broadcastLocalChange(colName, 'save', { id, ...data });

    // 2. Save to Firestore if connected
    if (this.isFirebaseReady && this.db) {
      try {
        if (this.firestoreOps) {
          const { doc, setDoc } = this.firestoreOps;
          await setDoc(doc(this.db, colName, id), data, { merge: true });
        } else if (this.db.collection) {
          await this.db.collection(colName).doc(id).set(data, { merge: true });
        }
      } catch (err) {
        console.warn(`Firestore saveDoc error in ${colName}/${id}:`, err);
      }
    }
  }

  // Update a document in cloud
  async updateDoc(colName, id, updates) {
    this.broadcastLocalChange(colName, 'update', { id, ...updates });

    if (this.isFirebaseReady && this.db) {
      try {
        if (this.firestoreOps) {
          const { doc, updateDoc } = this.firestoreOps;
          await updateDoc(doc(this.db, colName, id), updates);
        } else if (this.db.collection) {
          await this.db.collection(colName).doc(id).update(updates);
        }
      } catch (err) {
        console.warn(`Firestore updateDoc error in ${colName}/${id}:`, err);
      }
    }
  }

  // Delete document
  async deleteDoc(colName, id) {
    this.broadcastLocalChange(colName, 'delete', { id });

    if (this.isFirebaseReady && this.db) {
      try {
        if (this.firestoreOps) {
          const { doc, deleteDoc } = this.firestoreOps;
          await deleteDoc(doc(this.db, colName, id));
        } else if (this.db.collection) {
          await this.db.collection(colName).doc(id).delete();
        }
      } catch (err) {
        console.warn(`Firestore deleteDoc error in ${colName}/${id}:`, err);
      }
    }
  }

  // Cross-window local broadcast so team dashboard and customer pass react immediately
  broadcastLocalChange(collection, action, payload) {
    if (this.syncChannel) {
      try {
        this.syncChannel.postMessage({
          type: 'DATA_CHANGE',
          collection,
          action,
          payload,
          timestamp: Date.now()
        });
      } catch (e) {
        // Fallback
      }
    }
  }

  // Save new Firebase config and test connection
  async saveConfigAndConnect(config) {
    localStorage.setItem('stallpay_firebase_config', JSON.stringify(config));
    return await this.initFirebase(config);
  }

  // Clear saved Firebase config
  disconnect() {
    localStorage.removeItem('stallpay_firebase_config');
    this.isFirebaseReady = false;
    this.app = null;
    this.db = null;
  }

  getStatus() {
    return {
      connected: this.isFirebaseReady,
      mode: this.isFirebaseReady ? 'Firebase Cloud' : 'Local Realtime'
    };
  }
}

window.FirebaseService = new FirebaseService();
