/**
 * StallPay - UPI URI & QR Code Generation Service
 * Supports Google Pay, PhonePe, Paytm, and BHIM standard specifications.
 */

class UpiQrService {
  constructor() {
    this.qrInstances = {};
  }

  /**
   * Builds an NPCI standard UPI Payment URI
   * @param {Object} params
   * @param {string} params.upiId - Merchant / Stall UPI VPA (e.g. stallpay.ecell@upi)
   * @param {string} params.payeeName - Stall or Club Name
   * @param {number} params.amount - Total amount in INR
   * @param {string} params.note - Order note or token (e.g. Order #004)
   * @returns {string} Standard UPI URI string
   */
  buildUpiUri({ upiId, payeeName, amount, note = "StallPay Order" }) {
    const cleanUpi = (upiId || "stallpay@upi").trim();
    const cleanPayee = (payeeName || "College Stall").trim();
    const cleanAmount = Number(amount || 0).toFixed(2);
    const cleanNote = note.trim();

    return `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(cleanPayee)}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;
  }

  /**
   * Generates a dynamic QR Code inside a target DOM element
   * @param {string} containerId - DOM element ID
   * @param {string} text - Payload to encode
   * @param {Object} options - Dimensions and styling
   */
  renderQrCode(containerId, text, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous QR
    container.innerHTML = '';

    const width = options.width || 220;
    const height = options.height || 220;

    // Check if QRCode library is loaded
    if (typeof QRCode !== 'undefined') {
      try {
        const qr = new QRCode(container, {
          text: text,
          width: width,
          height: height,
          colorDark: options.colorDark || "#0f172a",
          colorLight: options.colorLight || "#ffffff",
          correctLevel: QRCode.CorrectLevel ? QRCode.CorrectLevel.H : 2
        });
        this.qrInstances[containerId] = qr;
        return;
      } catch (err) {
        console.warn("QRCode constructor error, falling back to SVG/Image API:", err);
      }
    }

    // High reliability fallback: Quickchart / Google Chart QR API
    const encoded = encodeURIComponent(text);
    const fallbackImg = document.createElement('img');
    fallbackImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=${width}x${height}&data=${encoded}&margin=8`;
    fallbackImg.alt = "Scan QR Code";
    fallbackImg.className = "w-full h-full object-contain rounded-lg shadow-sm";
    fallbackImg.crossOrigin = "anonymous";
    container.appendChild(fallbackImg);
  }

  /**
   * Generates Customer Digital Pass QR Code
   * Payload format allows the stall desk scanner to identify customer instantly.
   */
  renderCustomerPassQr(containerId, customer) {
    if (!customer) return;
    const payload = JSON.stringify({
      app: "StallPay",
      type: "customer_pass",
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      college: customer.college || ""
    });
    this.renderQrCode(containerId, payload, {
      width: 190,
      height: 190,
      colorDark: "#1e1b4b" // Deep Indigo
    });
  }

  /**
   * Generates Stall UPI Payment QR Code for an order
   */
  renderPaymentQr(containerId, { upiId, payeeName, amount, orderToken, orderId }) {
    const note = `StallPay Token ${orderToken || ''} ${orderId || ''}`.trim();
    const upiUri = this.buildUpiUri({
      upiId,
      payeeName,
      amount,
      note
    });

    this.renderQrCode(containerId, upiUri, {
      width: 230,
      height: 230,
      colorDark: "#022c22" // Deep Emerald
    });

    return upiUri;
  }
}

window.UpiQrService = new UpiQrService();
