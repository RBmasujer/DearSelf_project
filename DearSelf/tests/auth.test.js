/**
 * Authentication Module Tests
 * Tests for auth.js functionality
 */

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: jest.fn((key) => localStorageMock.store[key]),
    setItem: jest.fn((key, value) => {
        localStorageMock.store[key] = value;
    }),
    removeItem: jest.fn((key) => {
        delete localStorageMock.store[key];
    }),
    clear: jest.fn(() => {
        localStorageMock.store = {};
    })
};

global.localStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn();

// Import auth module functions from frontend/javascript
const authModule = require('../frontend/javascript/auth.js');
const AuthManager = authModule.AuthManager;
const ROLES = authModule.ROLES;
const ROLE_PERMISSIONS = authModule.ROLE_PERMISSIONS;
const DASHBOARD_ROUTES = authModule.DASHBOARD_ROUTES;
const STORAGE_KEYS = authModule.STORAGE_KEYS;

describe('AuthManager', () => {
    let auth;

    beforeEach(() => {
        localStorage.clear();
        fetch.mockClear();
        auth = new AuthManager();
    });

    describe('Initialization', () => {
        test('should initialize with no user', () => {
            expect(auth.currentUser).toBeNull();
            expect(auth.isAuthenticated).toBe(false);
        });

        test('should load stored user on init', () => {
            const mockUser = {
                id: '123',
                name: 'Test User',
                email: 'test@example.com',
                role: 'customer'
            };
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser));

            auth = new AuthManager();

            expect(auth.currentUser).toEqual(mockUser);
            expect(auth.isAuthenticated).toBe(true);
        });
    });

    describe('User Storage', () => {
        test('should save user to localStorage', () => {
            const mockUser = {
                id: '123',
                name: 'Test User',
                email: 'test@example.com',
                role: 'customer'
            };

            auth.saveUser(mockUser);

            expect(auth.currentUser).toEqual(mockUser);
            expect(auth.isAuthenticated).toBe(true);
            expect(localStorage.getItem(STORAGE_KEYS.USER)).toBe(JSON.stringify(mockUser));
        });

        test('should clear session', () => {
            auth.saveUser({ id: '123', name: 'Test', role: 'customer' });

            auth.clearSession();

            expect(auth.currentUser).toBeNull();
            expect(auth.isAuthenticated).toBe(false);
        });
    });

    describe('Login', () => {
        test('should successfully login user', async () => {
            const mockUser = {
                id: '123',
                name: 'Test User',
                email: 'test@example.com',
                role: 'customer'
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ user: mockUser })
            });

            const result = await auth.login('test@example.com', 'password123');

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
            expect(auth.currentUser).toEqual(mockUser);
        });

        test('should handle login failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: 'Invalid credentials' })
            });

            const result = await auth.login('test@example.com', 'wrongpassword');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid credentials');
        });

        test('should handle network error', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await auth.login('test@example.com', 'password123');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error. Please try again.');
        });
    });

    describe('Registration', () => {
        test('should successfully register user', async () => {
            const mockUser = {
                id: '123',
                name: 'New User',
                email: 'new@example.com',
                role: 'customer'
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ user: mockUser })
            });

            const result = await auth.register({
                name: 'New User',
                email: 'new@example.com',
                password: 'password123',
                role: 'customer'
            });

            expect(result.success).toBe(true);
            expect(result.user).toEqual(mockUser);
        });

        test('should handle duplicate email', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                json: () => Promise.resolve({ error: 'Email already exists' })
            });

            const result = await auth.register({
                name: 'New User',
                email: 'existing@example.com',
                password: 'password123',
                role: 'customer'
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Email already exists');
        });
    });

    describe('Role Management', () => {
        test('should check if user has specific role', () => {
            auth.currentUser = { id: '1', role: 'admin' };

            expect(auth.hasRole('admin')).toBe(true);
            expect(auth.hasRole('customer')).toBe(false);
        });

        test('should check if user has any of multiple roles', () => {
            auth.currentUser = { id: '1', role: 'staff' };

            expect(auth.hasRole(['admin', 'staff'])).toBe(true);
            expect(auth.hasRole(['admin', 'customer'])).toBe(false);
        });

        test('should return correct role', () => {
            auth.currentUser = { id: '1', role: 'receptionist' };
            expect(auth.getRole()).toBe('receptionist');
        });
    });

    describe('Permissions', () => {
        test('admin should have all permissions', () => {
            auth.currentUser = { id: '1', role: 'admin' };

            expect(auth.hasPermission('canManageUsers')).toBe(true);
            expect(auth.hasPermission('canManageBookings')).toBe(true);
            expect(auth.hasPermission('canManagePayments')).toBe(true);
            expect(auth.hasPermission('canViewReports')).toBe(true);
        });

        test('staff should have limited permissions', () => {
            auth.currentUser = { id: '1', role: 'staff' };

            expect(auth.hasPermission('canManageBookings')).toBe(true);
            expect(auth.hasPermission('canManageUsers')).toBe(false);
            expect(auth.hasPermission('canManagePayments')).toBe(false);
        });

        test('customer should have minimal permissions', () => {
            auth.currentUser = { id: '1', role: 'customer' };

            expect(auth.hasPermission('canManageBookings')).toBe(false);
            expect(auth.hasPermission('canManageUsers')).toBe(false);
            expect(auth.hasPermission('canAccessChat')).toBe(false);
        });

        test('should return permissions object for role', () => {
            auth.currentUser = { id: '1', role: 'receptionist' };
            const permissions = auth.getPermissions();

            expect(permissions.canManageBookings).toBe(true);
            expect(permissions.canManagePayments).toBe(true);
            expect(permissions.canManagePromos).toBe(true);
        });
    });

    describe('Page Protection', () => {
        let originalLocation;

        beforeEach(() => {
            originalLocation = window.location;
            delete window.location;
            window.location = { href: '' };
        });

        afterEach(() => {
            window.location = originalLocation;
        });

        test('should redirect if not logged in', () => {
            auth.currentUser = null;
            const result = auth.protectPage(['admin']);

            expect(result).toBe(false);
            expect(window.location.href).toBe('landingpage.html');
        });

        test('should redirect if role not allowed', () => {
            const mockUser = { id: '1', role: 'customer' };
            auth.saveUser(mockUser); // Use saveUser to properly set authentication state
            const result = auth.protectPage(['admin', 'staff']);

            expect(result).toBe(false);
        });

        test('should allow access if role is allowed', () => {
            const mockUser = { id: '1', role: 'admin' };
            auth.saveUser(mockUser); // Use saveUser to properly set authentication state
            const result = auth.protectPage(['admin', 'staff']);

            expect(result).toBe(true);
        });
    });

    describe('Dashboard Routing', () => {
        let originalLocation;

        beforeEach(() => {
            originalLocation = window.location;
            delete window.location;
            window.location = { href: '' };
        });

        afterEach(() => {
            window.location = originalLocation;
        });

        test('should redirect admin to admin dashboard', () => {
            auth.currentUser = { id: '1', role: 'admin' };
            auth.redirectToDashboard();

            expect(window.location.href).toBe('Admindashboard.html');
        });

        test('should redirect staff to staff dashboard', () => {
            auth.currentUser = { id: '1', role: 'staff' };
            auth.redirectToDashboard();

            expect(window.location.href).toBe('StaffDashboard.html');
        });

        test('should redirect customer to customer dashboard', () => {
            auth.currentUser = { id: '1', role: 'customer' };
            auth.redirectToDashboard();

            expect(window.location.href).toBe('CustomerDashboard.html');
        });
    });
});

describe('Role Constants', () => {
    test('should have all required roles', () => {
        expect(ROLES.ADMIN).toBe('admin');
        expect(ROLES.STAFF).toBe('staff');
        expect(ROLES.RECEPTIONIST).toBe('receptionist');
        expect(ROLES.CUSTOMER).toBe('customer');
    });

    test('should have permissions for all roles', () => {
        expect(ROLE_PERMISSIONS[ROLES.ADMIN]).toBeDefined();
        expect(ROLE_PERMISSIONS[ROLES.STAFF]).toBeDefined();
        expect(ROLE_PERMISSIONS[ROLES.RECEPTIONIST]).toBeDefined();
        expect(ROLE_PERMISSIONS[ROLES.CUSTOMER]).toBeDefined();
    });

    test('should have dashboard routes for all roles', () => {
        expect(DASHBOARD_ROUTES[ROLES.ADMIN]).toBeDefined();
        expect(DASHBOARD_ROUTES[ROLES.STAFF]).toBeDefined();
        expect(DASHBOARD_ROUTES[ROLES.RECEPTIONIST]).toBeDefined();
        expect(DASHBOARD_ROUTES[ROLES.CUSTOMER]).toBeDefined();
    });
});
