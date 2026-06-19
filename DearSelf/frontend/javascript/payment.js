/**
 * Dear Self - Payment Module (PayMongo Integration)
 * Handles payment processing, refunds, and payment status management
 */

const PAYMENT_API_URL = 'http://localhost:3000/api';

// ============================================
// PayMongo Configuration
// ============================================

const PAYMONGO_CONFIG = {
    // Use environment variables in production
    publicKey: 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxx', // Replace with your PayMongo public key
    baseUrl: 'https://api.paymongo.com/v1',
    webhookSecret: 'whsec_xxxxxxxxxxxxxxxxxxxxxxxx' // Replace with your webhook secret
};

// ============================================
// Payment Methods
// ============================================

const PAYMENT_METHODS = {
    GCASH: 'gcash',
    MAYA: 'maya',
    CREDIT_CARD: 'card',
    GRABPAY: 'grabpay',
    CASH: 'cash'
};

const PAYMENT_METHOD_LABELS = {
    [PAYMENT_METHODS.GCASH]: 'GCash',
    [PAYMENT_METHODS.MAYA]: 'Maya',
    [PAYMENT_METHODS.CREDIT_CARD]: 'Credit/Debit Card',
    [PAYMENT_METHODS.GRABPAY]: 'GrabPay',
    [PAYMENT_METHODS.CASH]: 'Cash (On-site)'
};

const PAYMENT_STATUS = {
    PENDING: 'pending',
    AWAITING_PAYMENT: 'awaiting_payment',
    PAID: 'paid',
    PROCESSING: 'processing',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
};

// ============================================
// Payment Manager Class
// ============================================

class PaymentManager {
    constructor() {
        this.publicKey = PAYMONGO_CONFIG.publicKey;
        this.baseUrl = PAYMONGO_CONFIG.baseUrl;
    }

    /**
     * Create a payment intent
     * @param {number} amount - Amount in centavos (multiply by 100)
     * @param {string} description - Payment description
     * @param {object} metadata - Additional metadata
     * @returns {Promise} Payment intent object
     */
    async createPaymentIntent(amount, description = 'Dear Self Service Payment', metadata = {}) {
        try {
            // Amount in centavos (PHP * 100)
            const amountInCentavos = Math.round(amount * 100);

            const response = await fetch(`${this.baseUrl}/payment_intents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(this.publicKey + ':')}`
                },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            amount: amountInCentavos,
                            payment_method_allowed: ['card', 'gcash', 'maya', 'grabpay'],
                            payment_method_options: {
                                card: {
                                    request_three_d_secure: 'automatic'
                                }
                            },
                            metadata: {
                                description,
                                ...metadata
                            }
                        }
                    }
                })
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('PayMongo Error:', result.errors);
                return { success: false, error: result.errors?.[0]?.detail || 'Failed to create payment intent' };
            }

            return { success: true, paymentIntent: result.data };
        } catch (error) {
            console.error('Payment intent error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Create a payment method
     * @param {string} type - Payment method type (gcash, maya, card)
     * @param {object} details - Payment details
     * @returns {Promise} Payment method object
     */
    async createPaymentMethod(type, details = {}) {
        try {
            const paymentMethodData = {
                type
            };

            // Add billing details if provided
            if (details.billing) {
                paymentMethodData.billing = details.billing;
            }

            // Add card details for card payment
            if (type === 'card' && details.card) {
                paymentMethodData.details = {
                    card_number: details.card.number,
                    exp_month: parseInt(details.card.expiryMonth),
                    exp_year: parseInt(details.card.expiryYear),
                    cvc: details.card.cvc
                };
            }

            const response = await fetch(`${this.baseUrl}/payment_methods`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(this.publicKey + ':')}`
                },
                body: JSON.stringify({
                    data: { attributes: paymentMethodData }
                })
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.errors?.[0]?.detail || 'Failed to create payment method' };
            }

            return { success: true, paymentMethod: result.data };
        } catch (error) {
            console.error('Payment method error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Attach payment method to payment intent
     * @param {string} paymentIntentId - Payment intent ID
     * @param {string} paymentMethodId - Payment method ID
     * @param {string} returnUrl - Return URL after payment
     * @returns {Promise} Attached payment intent
     */
    async attachPaymentMethod(paymentIntentId, paymentMethodId, returnUrl) {
        try {
            const response = await fetch(`${this.baseUrl}/payment_intents/${paymentIntentId}/attach`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(this.publicKey + ':')}`
                },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            payment_method: paymentMethodId,
                            return_url: returnUrl
                        }
                    }
                })
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.errors?.[0]?.detail || 'Failed to process payment' };
            }

            return { success: true, paymentIntent: result.data };
        } catch (error) {
            console.error('Attach payment error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Create a GCash source (for redirect-based payments)
     * @param {number} amount - Amount in PHP
     * @param {string} redirectUrl - Redirect URL after payment
     * @param {object} metadata - Additional metadata
     * @returns {Promise} GCash source object
     */
    async createGCashSource(amount, redirectUrl, metadata = {}) {
        try {
            const amountInCentavos = Math.round(amount * 100);

            const response = await fetch(`${this.baseUrl}/sources`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(this.publicKey + ':')}`
                },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            type: 'gcash',
                            amount: amountInCentavos,
                            redirect: {
                                success: redirectUrl,
                                failed: redirectUrl + '?failed=true'
                            },
                            metadata
                        }
                    }
                })
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.errors?.[0]?.detail || 'Failed to create GCash payment' };
            }

            return { success: true, source: result.data };
        } catch (error) {
            console.error('GCash source error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Create a Maya source (for redirect-based payments)
     * @param {number} amount - Amount in PHP
     * @param {string} redirectUrl - Redirect URL after payment
     * @param {object} metadata - Additional metadata
     * @returns {Promise} Maya source object
     */
    async createMayaSource(amount, redirectUrl, metadata = {}) {
        try {
            const amountInCentavos = Math.round(amount * 100);

            const response = await fetch(`${this.baseUrl}/sources`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(this.publicKey + ':')}`
                },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            type: 'maya',
                            amount: amountInCentavos,
                            redirect: {
                                success: redirectUrl,
                                failed: redirectUrl + '?failed=true'
                            },
                            metadata
                        }
                    }
                })
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.errors?.[0]?.detail || 'Failed to create Maya payment' };
            }

            return { success: true, source: result.data };
        } catch (error) {
            console.error('Maya source error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Get payment intent status
     * @param {string} paymentIntentId - Payment intent ID
     * @returns {Promise} Payment intent status
     */
    async getPaymentIntentStatus(paymentIntentId) {
        try {
            const response = await fetch(`${this.baseUrl}/payment_intents/${paymentIntentId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Basic ${btoa(this.publicKey + ':')}`
                }
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: 'Failed to get payment status' };
            }

            return { success: true, paymentIntent: result.data };
        } catch (error) {
            console.error('Get status error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Create a refund
     * @param {string} paymentId - Payment ID to refund
     * @param {number} amount - Amount to refund in centavos
     * @param {string} reason - Refund reason
     * @param {object} metadata - Additional metadata
     * @returns {Promise} Refund object
     */
    async createRefund(paymentId, amount, reason = 'requested_by_customer', metadata = {}) {
        try {
            const amountInCentavos = Math.round(amount * 100);

            const response = await fetch(`${this.baseUrl}/refunds`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${btoa(this.publicKey + ':')}`
                },
                body: JSON.stringify({
                    data: {
                        attributes: {
                            payment_id: paymentId,
                            amount: amountInCentavos,
                            reason,
                            metadata
                        }
                    }
                })
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.errors?.[0]?.detail || 'Refund failed' };
            }

            return { success: true, refund: result.data };
        } catch (error) {
            console.error('Refund error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Process payment (convenience method)
     * @param {string} paymentMethod - Payment method (gcash, maya, card)
     * @param {number} amount - Amount in PHP
     * @param {object} options - Additional options
     * @returns {Promise} Payment result
     */
    async processPayment(paymentMethod, amount, options = {}) {
        const redirectUrl = options.redirectUrl || window.location.href.split('?')[0];
        const description = options.description || 'Dear Self Service Payment';
        const metadata = options.metadata || {};

        // For e-wallets (GCash, Maya), use source creation
        if (paymentMethod === PAYMENT_METHODS.GCASH) {
            const result = await this.createGCashSource(amount, redirectUrl, metadata);
            if (result.success) {
                // Save payment reference to backend
                await this.savePaymentToDatabase({
                    source_id: result.source.id,
                    amount,
                    payment_method: paymentMethod,
                    status: PAYMENT_STATUS.AWAITING_PAYMENT,
                    metadata
                });
                // Redirect to GCash payment page
                window.location.href = result.source.attributes.redirect.checkout_url;
            }
            return result;
        }

        if (paymentMethod === PAYMENT_METHODS.MAYA) {
            const result = await this.createMayaSource(amount, redirectUrl, metadata);
            if (result.success) {
                // Save payment reference to backend
                await this.savePaymentToDatabase({
                    source_id: result.source.id,
                    amount,
                    payment_method: paymentMethod,
                    status: PAYMENT_STATUS.AWAITING_PAYMENT,
                    metadata
                });
                // Redirect to Maya payment page
                window.location.href = result.source.attributes.redirect.checkout_url;
            }
            return result;
        }

        // For cards and other methods, use payment intent
        const intentResult = await this.createPaymentIntent(amount, description, metadata);
        if (!intentResult.success) return intentResult;

        // If card details provided, create and attach payment method
        if (paymentMethod === PAYMENT_METHODS.CREDIT_CARD && options.cardDetails) {
            const methodResult = await this.createPaymentMethod('card', {
                card: options.cardDetails,
                billing: options.billing
            });
            if (!methodResult.success) return methodResult;

            const attachResult = await this.attachPaymentMethod(
                intentResult.paymentIntent.id,
                methodResult.paymentMethod.id,
                redirectUrl
            );

            if (attachResult.success) {
                const status = attachResult.paymentIntent.attributes.status;

                await this.savePaymentToDatabase({
                    payment_intent_id: intentResult.paymentIntent.id,
                    payment_id: attachResult.paymentIntent.attributes.payments?.[0]?.id,
                    amount,
                    payment_method: paymentMethod,
                    status: status === 'succeeded' ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.PROCESSING,
                    metadata
                });

                // Handle 3D Secure redirect if needed
                if (status === 'awaiting_next_action') {
                    window.location.href = attachResult.paymentIntent.attributes.next_action.redirect.url;
                }
            }

            return attachResult;
        }

        return intentResult;
    }

    /**
     * Save payment to database via backend API
     */
    async savePaymentToDatabase(paymentData) {
        try {
            const response = await fetch(`${PAYMENT_API_URL}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });

            const result = await response.json();
            return { success: response.ok, data: result };
        } catch (error) {
            console.error('Save payment error:', error);
            return { success: false, error: 'Failed to save payment record' };
        }
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload, signature) {
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', PAYMONGO_CONFIG.webhookSecret)
            .update(payload)
            .digest('hex');
        return signature === expectedSignature;
    }

    /**
     * Handle webhook event
     */
    async handleWebhook(event) {
        const eventType = event.attributes.type;
        const data = event.attributes.data;

        switch (eventType) {
            case 'payment.paid':
                await this.handlePaymentPaid(data);
                break;
            case 'payment.failed':
                await this.handlePaymentFailed(data);
                break;
            case 'payment.cancelled':
                await this.handlePaymentCancelled(data);
                break;
            case 'refund.created':
            case 'refund.paid':
                await this.handleRefundCompleted(data);
                break;
            default:
                console.log('Unhandled webhook event:', eventType);
        }
    }

    async handlePaymentPaid(data) {
        const paymentId = data.id;
        const amount = data.attributes.amount / 100;
        const metadata = data.attributes.metadata;

        // Update payment status in database
        await fetch(`${PAYMENT_API_URL}/payments/${paymentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: PAYMENT_STATUS.PAID,
                paid_at: new Date().toISOString(),
                transaction_id: paymentId
            })
        });

        console.log('Payment paid:', paymentId);
    }

    async handlePaymentFailed(data) {
        const paymentId = data.id;

        await fetch(`${PAYMENT_API_URL}/payments/${paymentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: PAYMENT_STATUS.FAILED })
        });

        console.log('Payment failed:', paymentId);
    }

    async handlePaymentCancelled(data) {
        const paymentId = data.id;

        await fetch(`${PAYMENT_API_URL}/payments/${paymentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: PAYMENT_STATUS.CANCELLED })
        });

        console.log('Payment cancelled:', paymentId);
    }

    async handleRefundCompleted(data) {
        const refundId = data.id;

        await fetch(`${PAYMENT_API_URL}/payments/${refundId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: PAYMENT_STATUS.REFUNDED })
        });

        console.log('Refund completed:', refundId);
    }
}

// ============================================
// UI Helper Functions
// ============================================

/**
 * Format amount for display
 */
function formatAmount(amount) {
    return `PHP ${parseFloat(amount).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/**
 * Get payment method label
 */
function getPaymentMethodLabel(method) {
    return PAYMENT_METHOD_LABELS[method] || method;
}

/**
 * Get payment status badge class
 */
function getPaymentStatusBadge(status) {
    const classes = {
        [PAYMENT_STATUS.PENDING]: 'badge-warning',
        [PAYMENT_STATUS.AWAITING_PAYMENT]: 'badge-warning',
        [PAYMENT_STATUS.PAID]: 'badge-success',
        [PAYMENT_STATUS.PROCESSING]: 'badge-info',
        [PAYMENT_STATUS.FAILED]: 'badge-danger',
        [PAYMENT_STATUS.CANCELLED]: 'badge-danger',
        [PAYMENT_STATUS.REFUNDED]: 'badge-secondary'
    };
    return classes[status] || 'badge-secondary';
}

/**
 * Display payment form in modal
 */
function showPaymentForm(amount, options = {}) {
    const formHtml = `
        <div class="payment-form">
            <h3>Complete Payment - ${formatAmount(amount)}</h3>
            <div class="payment-methods">
                ${options.allowGCash !== false ? `
                    <div class="payment-method-option" data-method="gcash">
                        <img src="https://www.gcash.com/wp-content/uploads/2021/04/GCash-Logo.png" alt="GCash" height="30">
                        <span>GCash</span>
                    </div>
                ` : ''}
                ${options.allowMaya !== false ? `
                    <div class="payment-method-option" data-method="maya">
                        <img src="https://www.maya.ph/maya-logo.png" alt="Maya" height="30">
                        <span>Maya</span>
                    </div>
                ` : ''}
                ${options.allowCard !== false ? `
                    <div class="payment-method-option" data-method="card">
                        <i class="fas fa-credit-card"></i>
                        <span>Credit/Debit Card</span>
                    </div>
                ` : ''}
                <div class="payment-method-option" data-method="cash">
                    <i class="fas fa-money-bill"></i>
                    <span>Cash On-site</span>
                </div>
            </div>
            <div id="card-form" style="display: none;">
                <div class="form-group">
                    <label>Card Number</label>
                    <input type="text" id="card-number" placeholder="1234 5678 9012 3456" maxlength="19">
                </div>
                <div class="form-group">
                    <label>Expiry Date</label>
                    <input type="text" id="card-expiry" placeholder="MM/YY" maxlength="5">
                </div>
                <div class="form-group">
                    <label>CVV</label>
                    <input type="password" id="card-cvc" placeholder="123" maxlength="4">
                </div>
            </div>
            <button id="submit-payment-btn" class="btn btn-primary">
                Pay ${formatAmount(amount)}
            </button>
        </div>
    `;

    return formHtml;
}

/**
 * Initialize payment form event handlers
 */
function initializePaymentEvents(amount, options) {
    const paymentManager = new PaymentManager();

    // Payment method selection
    document.querySelectorAll('.payment-method-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.payment-method-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');

            const method = this.dataset.method;
            document.getElementById('card-form').style.display = method === 'card' ? 'block' : 'none';
        });
    });

    // Submit payment
    document.getElementById('submit-payment-btn').addEventListener('click', async function() {
        const selectedMethod = document.querySelector('.payment-method-option.selected');

        if (!selectedMethod) {
            alert('Please select a payment method');
            return;
        }

        const method = selectedMethod.dataset.method;

        // Handle cash payment
        if (method === 'cash') {
            const result = await paymentManager.savePaymentToDatabase({
                booking_id: options.bookingId,
                amount,
                payment_method: 'cash',
                status: PAYMENT_STATUS.PENDING
            });

            if (result.success) {
                window.location.href = options.successUrl;
            }
            return;
        }

        // Get card details if card payment
        let cardDetails = null;
        if (method === 'card') {
            const expiryInput = document.getElementById('card-expiry').value;
            const [month, year] = expiryInput.split('/');

            cardDetails = {
                number: document.getElementById('card-number').value.replace(/\s/g, ''),
                expiryMonth: month,
                expiryYear: '20' + year,
                cvc: document.getElementById('card-cvc').value
            };
        }

        const result = await paymentManager.processPayment(method, amount, {
            ...options,
            cardDetails
        });

        if (result.success && result.source) {
            // Already redirected to payment page
            return;
        }
    });
}

// ============================================
// Export for module use
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PaymentManager,
        PAYMENT_METHODS,
        PAYMENT_METHOD_LABELS,
        PAYMENT_STATUS,
        formatAmount,
        getPaymentMethodLabel,
        getPaymentStatusBadge,
        showPaymentForm,
        initializePaymentEvents
    };
}
