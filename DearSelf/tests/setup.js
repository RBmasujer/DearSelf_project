/**
 * Test Setup and Configuration
 * Jest configuration for Dear Self project tests
 */

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: function(key) {
        return this.store[key] || null;
    },
    setItem: function(key, value) {
        this.store[key] = value;
    },
    removeItem: function(key) {
        delete this.store[key];
    },
    clear: function() {
        this.store = {};
    }
};

global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
    store: {},
    getItem: function(key) {
        return this.store[key] || null;
    },
    setItem: function(key, value) {
        this.store[key] = value;
    },
    removeItem: function(key) {
        delete this.store[key];
    },
    clear: function() {
        this.store = {};
    }
};

global.sessionStorage = sessionStorageMock;

// Mock window.location
const mockLocation = {
    href: '',
    assign: jest.fn(),
    reload: jest.fn(),
    replace: jest.fn()
};

Object.defineProperty(global, 'window', {
    value: {
        location: mockLocation,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
    }
});

// Mock btoa and atob
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');

// Suppress console.log in tests unless DEBUG is set
if (!process.env.DEBUG) {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn()
    };
}

// Global test utilities
global.testUtils = {
    /**
     * Create a mock user for testing
     */
    createMockUser: (role = 'customer', overrides = {}) => ({
        id: 'test-user-123',
        name: 'Test User',
        email: 'test@example.com',
        role,
        phone: '1234567890',
        is_active: true,
        ...overrides
    }),

    /**
     * Create a mock booking for testing
     */
    createMockBooking: (overrides = {}) => ({
        id: 'booking-123',
        customer_id: 'test-user-123',
        booking_date: '2026-06-25',
        booking_time: '10:00',
        status: 'pending',
        total_amount: 1000,
        ...overrides
    }),

    /**
     * Create a mock payment for testing
     */
    createMockPayment: (overrides = {}) => ({
        id: 'payment-123',
        booking_id: 'booking-123',
        amount: 1000,
        payment_method: 'gcash',
        status: 'pending',
        ...overrides
    }),

    /**
     * Wait for specified milliseconds
     */
    wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    /**
     * Mock fetch response
     */
    mockFetch: (data, ok = true, status = 200) => {
        global.fetch.mockResolvedValueOnce({
            ok,
            status,
            json: () => Promise.resolve(data)
        });
    },

    /**
     * Mock fetch error
     */
    mockFetchError: (error, status = 500) => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status,
            json: () => Promise.resolve({ error })
        });
    }
};

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    sessionStorageMock.clear();
    mockLocation.href = '';
});
