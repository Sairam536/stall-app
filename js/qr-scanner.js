/**
 * StallPay - Camera & Image QR Code Scanner Wrapper
 * Utilizes Html5Qrcode with fallbacks and multi-format payload handling.
 */

class StallQrScanner {
  constructor() {
    this.html5QrCode = null;
    this.isScanning = false;
    this.activeReaderId = null;
  }

  /**
   * Start live camera QR scanning inside a given DOM element
   * @param {string} elementId - Container ID
   * @param {Function} onScanSuccess - Callback receiving decoded text
   * @param {Function} onScanError - Optional error callback
   */
  async startCamera(elementId, onScanSuccess, onScanError) {
    if (this.isScanning) {
      await this.stopCamera();
    }

    const container = document.getElementById(elementId);
    if (!container) return;

    if (typeof Html5Qrcode === 'undefined') {
      container.innerHTML = `
        <div class="p-6 text-center text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
          <i class="fa-solid fa-triangle-exclamation text-2xl mb-2 text-amber-500"></i>
          <p class="font-semibold text-sm">QR Camera scanner library loading or unavailable.</p>
          <p class="text-xs text-slate-500 mt-1">Please use the image file scanner button below instead.</p>
        </div>
      `;
      return;
    }

    try {
      this.activeReaderId = elementId;
      this.html5QrCode = new Html5Qrcode(elementId);

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };

      await this.html5QrCode.start(
        { facingMode: "environment" }, // Prefer rear camera on mobile
        config,
        (decodedText, decodedResult) => {
          if (window.SoundEffects) window.SoundEffects.playTap();
          onScanSuccess(decodedText, decodedResult);
        },
        (errorMessage) => {
          if (onScanError) onScanError(errorMessage);
        }
      );

      this.isScanning = true;
    } catch (err) {
      console.warn("Unable to start camera stream:", err);
      this.isScanning = false;
      container.innerHTML = `
        <div class="p-6 text-center text-slate-600 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <i class="fa-solid fa-camera-slash text-2xl mb-2 text-slate-400"></i>
          <p class="text-sm font-semibold text-slate-800">Camera Access Blocked or Not Available</p>
          <p class="text-xs text-slate-500 mt-1">Ensure camera permission is enabled in browser, or upload a QR image below.</p>
        </div>
      `;
    }
  }

  /**
   * Stop camera scanner and release video tracks
   */
  async stopCamera() {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        this.html5QrCode.clear();
      } catch (e) {
        console.warn("Error stopping QR scanner:", e);
      }
      this.isScanning = false;
      this.html5QrCode = null;
    }
  }

  /**
   * Scan QR Code from an uploaded image file
   */
  async scanFile(file, onScanSuccess, onScanError) {
    if (!file) return;

    if (typeof Html5Qrcode === 'undefined') {
      alert("Scanner engine not available. Please enter the details manually.");
      return;
    }

    try {
      const scanner = new Html5Qrcode("hidden-file-scanner");
      const decoded = await scanner.scanFile(file, true);
      if (window.SoundEffects) window.SoundEffects.playTap();
      onScanSuccess(decoded);
    } catch (err) {
      console.warn("File QR scan failed:", err);
      if (onScanError) onScanError(err);
      else alert("No valid QR code could be detected in this image. Please try another photo.");
    }
  }

  /**
   * Parses scanned QR content into structured StallPay actions
   */
  parseScannedContent(text) {
    if (!text) return null;

    // Check for Customer Pass JSON
    try {
      const parsed = JSON.parse(text);
      if (parsed && (parsed.type === 'customer_pass' || parsed.app === 'StallPay')) {
        return {
          type: 'CUSTOMER_PASS',
          data: parsed
        };
      }
    } catch (e) {
      // Not JSON
    }

    // Check for UPI Payment string
    if (text.startsWith('upi://pay?')) {
      const url = new URL(text);
      return {
        type: 'UPI_PAYMENT',
        pa: url.searchParams.get('pa'),
        pn: url.searchParams.get('pn'),
        am: url.searchParams.get('am'),
        tn: url.searchParams.get('tn')
      };
    }

    // Check for Transaction ID or Token
    if (text.startsWith('TXN-') || text.startsWith('SP-CUST-') || /^\d{3}$/.test(text)) {
      return {
        type: 'IDENTIFIER',
        id: text
      };
    }

    return {
      type: 'RAW_TEXT',
      text
    };
  }
}

window.StallQrScanner = new StallQrScanner();
