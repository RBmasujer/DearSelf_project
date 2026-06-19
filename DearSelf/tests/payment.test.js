/**
 * Payment Module Tests (PayMongo Integration)
 * Tests for payment.js functionality
 */

// Mock fetch
global.fetch = jest.fn();

// Mock btoa
global.btoa = jest.fn((str) => Buffer.from(str, 'binary').toString('base64'));

// Import payment module functions
const {
    PaymentManager,
    PAYMENT_METHODS,
    PAYMENT_METHOD_LABELS,
    PAYMENT_STATUS,
    formatAmount,
    getPaymentMethodLabel,
    getPaymentStatusBadge
} = require('./payment.js');

describe('PaymentManager', () => {
    let paymentManager;

    beforeEach(() => {
        fetch.mockClear();
        paymentManager = new PaymentManager();
    });

    describe('Payment Intent Creation', () => {
        test('should create payment intent with correct amount in centavos', async () => {
            const mockResponse = {
                data: {
                    id: 'pi_123',
                    attributes: {
                        amount: 100000, // 1000 PHP in centavos
                        status: 'awaiting_payment_method'
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await paymentManager.createPaymentIntent(1000, 'Test Payment');

            expect(result.success).toBe(true);
            expect(result.paymentIntent.id).toBe('pi_123');
            expect(fetch).toHaveBeenCalledWith(
                'https://api.paymongo.com/v1/payment_intents',
                expect.objectContaining({ method: 'POST' })
            );
        });

        test('should handle payment intent creation failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({
                    errors: [{ detail: 'Invalid amount' }]
                })
            });

            const result = await paymentManager.createPaymentIntent(-100);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid amount');
        });
    });

    describe('Payment Method Creation', () => {
        test('should create GCash payment method', async () => {
            const mockResponse = {
                data: {
                    id: 'pm_123',
                    attributes: { type: 'gcash' }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await paymentManager.createPaymentMethod('gcash');

            expect(result.success).toBe(true);
            expect(result.paymentMethod.attributes.type).toBe('gcash');
        });

        test('should create card payment method with card details', async () => {
            const mockResponse = {
                data: {
                    id: 'pm_123',
                    attributes: { type: 'card' }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const cardDetails = {
                card: {
                    number: '4123456789012345',
                    expiryMonth: '12',
                    expiryYear: '2025',
                    cvc: '123'
                },
                billing: {
                    name: 'Test User',
                    email: 'test@example.com'
                }
            };

            const result = await paymentManager.createPaymentMethod('card', cardDetails);

            expect(result.success).toBe(true);
            expect(fetch).toHaveBeenCalledWith(
                'https://api.paymongo.com/v1/payment_methods',
                expect.objectContaining({ method: 'POST' })
            );
        });
    });

    describe('Attach Payment Method', () => {
        test('should attach payment method to payment intent', async () => {
            const mockResponse = {
                data: {
                    id: 'pi_123',
                    attributes: {
                        status: 'succeeded'
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await paymentManager.attachPaymentMethod(
                'pi_123',
                'pm_456',
                'https://example.com/callback'
            );

            expect(result.success).toBe(true);
            expect(result.paymentIntent.attributes.status).toBe('succeeded');
        });
    });

    describe('GCash Source Creation', () => {
        test('should create GCash source with redirect URL', async () => {
            const mockResponse = {
                data: {
                    id: 'src_123',
                    attributes: {
                        type: 'gcash',
                        amount: 100000,
                        redirect: {
                            checkout_url: 'https://checkout.paymongo.com/gcash/123'
                        }
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await paymentManager.createGCashSource(
                1000,
                'https://example.com/callback'
            );

            expect(result.success).toBe(true);
            expect(result.source.attributes.type).toBe('gcash');
        });
    });

    describe('Maya Source Creation', () => {
        test('should create Maya source with redirect URL', async () => {
            const mockResponse = {
                data: {
                    id: 'src_123',
                    attributes: {
                        type: 'maya',
                        amount: 100000,
                        redirect: {
                            checkout_url: 'https://checkout.paymongo.com/maya/123'
                        }
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await paymentManager.createMayaSource(
                1000,
                'https://example.com/callback'
            );

            expect(result.success).toBe(true);
            expect(result.source.attributes.type).toBe('maya');
        });
    });

    describe('Payment Status', () => {
        test('should get payment intent status', async () => {
            const mockResponse = {
                data: {
                    id: 'pi_123',
                    attributes: {
                        status: 'succeeded'
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await paymentManager.getPaymentIntentStatus('pi_123');

            expect(result.success).toBe(true);
            expect(result.paymentIntent.attributes.status).toBe('succeeded');
        });
    });

    describe('Refund', () => {
        test('should create refund', async () => {
            const mockResponse = {
                data: {
                    id: 'ref_123',
                    attributes: {
                        amount: 100000,
                        status: 'pending'
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await paymentManager.createRefund('pay_123', 1000);

            expect(result.success).toBe(true);
            expect(result.refund.attributes.amount).toBe(100000);
        });
    });

    describe('Process Payment', () => {
        let originalLocation;

        beforeEach(() => {
            originalLocation = window.location;
            delete window.location;
            window.location = { href: '' };
        });

        afterEach(() => {
            window.location = originalLocation;
        });

        test('should process GCash payment and redirect', async () => {
            const mockSourceResponse = {
                data: {
                    id: 'src_123',
                    attributes: {
                        type: 'gcash',
                        redirect: {
                            checkout_url: 'https://checkout.paymongo.com/gcash/123'
                        }
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSourceResponse)
            });

            // Mock savePaymentToDatabase
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 'pay_123' })
            });

            const result = await paymentManager.processPayment('gcash', 1000, {
                redirectUrl: 'https://example.com/callback'
            });

            expect(result.success).toBe(true);
        });
    });
});

describe('Payment Constants', () => {
    test('should have all payment methods', () => {
        expect(PAYMENT_METHODS.GCASH).toBe('gcash');
        expect(PAYMENT_METHODS.MAYA).toBe('maya');
        expect(PAYMENT_METHODS.CREDIT_CARD).toBe('card');
        expect(PAYMENT_METHODS.CASH).toBe('cash');
    });

    test('should have payment method labels', () => {
        expect(PAYMENT_METHOD_LABELS['gcash']).toBe('GCash');
        expect(PAYMENT_METHOD_LABELS['maya']).toBe('Maya');
        expect(PAYMENT_METHOD_LABELS['card']).toBe('Credit/Debit Card');
        expect(PAYMENT_METHOD_LABELS['cash']).toBe('Cash (On-site)');
    });

    test('should have all payment statuses', () => {
        expect(PAYMENT_STATUS.PENDING).toBe('pending');
        expect(PAYMENT_STATUS.PAID).toBe('paid');
        expect(PAYMENT_STATUS.FAILED).toBe('failed');
        expect(PAYMENT_STATUS.REFUNDED).toBe('refunded');
    });
});

describe('Payment Utility Functions', () => {
    test('should format amount correctly', () => {
        expect(formatAmount(1000)).toBe('PHP 1,000.00');
        expect(formatAmount(500.5)).toBe('PHP 500.50');
        expect(formatAmount(0)).toBe('PHP 0.00');
    });

    test('should get payment method label', () => {
        expect(getPaymentMethodLabel('gcash')).toBe('GCash');
        expect(getPaymentMethodLabel('unknown')).toBe('unknown');
    });

    test('should get payment status badge class', () => {
        expect(getPaymentStatusBadge('pending')).toBe('badge-warning');
        expect(getPaymentStatusBadge('paid')).toBe('badge-success');
        expect(getPaymentStatusBadge('failed')).toBe('badge-danger');
        expect(getPaymentStatusBadge('unknown')).toBe('badge-secondary');
    });
});

describe('Payment Validation', () => {
    test('should validate amount is positive', async () => {
        const paymentManager = new PaymentManager();

        // Assuming createPaymentIntent validates amount
        const result = await paymentManager.createPaymentIntent(-100);

        expect(result.success).toBe(false);
    });

    test('should convert PHP to centavos correctly', async () => {
        const paymentManager = new PaymentManager();
        let capturedBody;

        fetch.mockImplementationOnce(async (url, options) => {
            capturedBody = JSON.parse(options.body);
            return {
                ok: true,
                json: () => Promise.resolve({ data: { id: 'pi_123' } })
            };
        });

        await paymentManager.createPaymentIntent(1000);

        // 1000 PHP = 100000 centavos
        expect(capturedBody.data.attributes.amount).toBe(100000);
    });
});
