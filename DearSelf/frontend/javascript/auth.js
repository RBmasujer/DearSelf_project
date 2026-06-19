/**
 * Dear Self - Authentication Module
 * Handles user authentication, role-based access control, and session management
 */

const AUTH_API_URL = 'http://localhost:3000/api';

// ============================================
// Role Definitions
// ============================================

const ROLES = {
    ADMIN: 'admin',
    STAFF: 'staff',
    RECEPTIONIST: 'receptionist',
    CUSTOMER: 'customer'
};

const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: {
        canManageUsers: true,
        canManageBookings: true,
        canManagePayments: true,
        canManageServices: true,
        canManagePromos: true,
        canViewReports: true,
        canManageStaff: true,
        canAccessChat: true
    },
    [ROLES.STAFF]: {
        canManageUsers: false,
        canManageBookings: true,
        canManagePayments: false,
        canManageServices: false,
        canManagePromos: false,
        canViewReports: false,
        canManageStaff: false,
        canAccessChat: true
    },
    [ROLES.RECEPTIONIST]: {
        canManageUsers: false,
        canManageBookings: true,
        canManagePayments: true,
        canManageServices: false,
        canManagePromos: true,
        canViewReports: false,
        canManageStaff: false,
        canAccessChat: true
    },
    [ROLES.CUSTOMER]: {
        canManageUsers: false,
        canManageBookings: false,
        canManagePayments: false,
        canManageServices: false,
        canManagePromos: false,
        canViewReports: false,
        canManageStaff: false,
        canAccessChat: false
    }
};

const DASHBOARD_ROUTES = {
    [ROLES.ADMIN]: 'Admindashboard.html',
    [ROLES.STAFF]: 'StaffDashboard.html',
    [ROLES.RECEPTIONIST]: 'Receptionist.html',
    [ROLES.CUSTOMER]: 'CustomerDashboard.html'
};

// ============================================
// Session Storage Keys
// ============================================

const STORAGE_KEYS = {
    USER: 'dearself_user',
    TOKEN: 'dearself_token',
    REMEMBER: 'dearself_remember'
};

// ============================================
// Authentication Class
// ============================================

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    /**
     * Initialize authentication state
     */
    init() {
        const savedUser = this.getStoredUser();
        if (savedUser) {
            this.currentUser = savedUser;
            this.isAuthenticated = true;
        }
    }

    /**
     * Get stored user from localStorage
     */
    getStoredUser() {
        try {
            const userData = localStorage.getItem(STORAGE_KEYS.USER);
            return userData ? JSON.parse(userData) : null;
        } catch (e) {
            console.error('Error parsing stored user:', e);
            return null;
        }
    }

    /**
     * Save user to localStorage
     */
    saveUser(user, remember = false) {
        try {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
            if (remember) {
                localStorage.setItem(STORAGE_KEYS.REMEMBER, 'true');
            }
            this.currentUser = user;
            this.isAuthenticated = true;
        } catch (e) {
            console.error('Error saving user:', e);
        }
    }

    /**
     * Clear user session
     */
    clearSession() {
        localStorage.removeItem(STORAGE_KEYS.USER);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER);
        this.currentUser = null;
        this.isAuthenticated = false;
    }

    /**
     * Register new user
     */
    async register(userData) {
        try {
            const response = await fetch(`${AUTH_API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.error || 'Registration failed' };
            }

            return { success: true, user: result.user };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Login user
     */
    async login(email, password, remember = false) {
        try {
            const response = await fetch(`${AUTH_API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.error || 'Login failed' };
            }

            this.saveUser(result.user, remember);
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Logout user
     */
    logout() {
        this.clearSession();
        window.location.href = 'landingpage.html';
    }

    /**
     * Get current user
     */
    getUser() {
        return this.currentUser || this.getStoredUser();
    }

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return this.isAuthenticated || !!this.getStoredUser();
    }

    /**
     * Get user role
     */
    getRole() {
        const user = this.getUser();
        return user ? user.role : null;
    }

    /**
     * Check if user has specific role
     */
    hasRole(role) {
        const userRole = this.getRole();
        if (Array.isArray(role)) {
            return role.includes(userRole);
        }
        return userRole === role;
    }

    /**
     * Check if user has specific permission
     */
    hasPermission(permission) {
        const role = this.getRole();
        if (!role || !ROLE_PERMISSIONS[role]) {
            return false;
        }
        return ROLE_PERMISSIONS[role][permission] === true;
    }

    /**
     * Protect page - redirect if not authorized
     */
    protectPage(allowedRoles = []) {
        if (!this.isLoggedIn()) {
            this.redirectToLogin();
            return false;
        }

        if (allowedRoles.length > 0 && !this.hasRole(allowedRoles)) {
            this.redirectToDashboard();
            return false;
        }

        return true;
    }

    /**
     * Redirect to appropriate dashboard based on role
     */
    redirectToDashboard() {
        const role = this.getRole();
        const dashboard = DASHBOARD_ROUTES[role] || 'landingpage.html';
        window.location.href = dashboard;
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        window.location.href = 'landingpage.html';
    }

    /**
     * Update user profile
     */
    async updateProfile(userId, updates) {
        try {
            const response = await fetch(`${AUTH_API_URL}/staff/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });

            const result = await response.json();

            if (!response.ok) {
                return { success: false, error: result.error || 'Update failed' };
            }

            // Update stored user if updating current user
            if (this.currentUser && this.currentUser.id === userId) {
                this.currentUser = { ...this.currentUser, ...result };
                this.saveUser(this.currentUser);
            }

            return { success: true, user: result };
        } catch (error) {
            console.error('Update error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Change password
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Verify current password first
            const user = this.getUser();
            const verifyResponse = await fetch(`${AUTH_API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, password: currentPassword })
            });

            if (!verifyResponse.ok) {
                return { success: false, error: 'Current password is incorrect' };
            }

            // Update password
            const passwordHash = Buffer.from(newPassword).toString('base64');
            return await this.updateProfile(userId, { password_hash: passwordHash });
        } catch (error) {
            console.error('Password change error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    /**
     * Get all permissions for current role
     */
    getPermissions() {
        const role = this.getRole();
        return ROLE_PERMISSIONS[role] || {};
    }

    /**
     * Check if session is valid (can be extended to check token expiry)
     */
    isSessionValid() {
        const user = this.getStoredUser();
        if (!user) return false;

        // Add token validation logic here if using JWT
        return true;
    }
}

// ============================================
// UI Helper Functions
// ============================================

/**
 * Update UI elements with user information
 */
function updateUserUI() {
    const auth = new AuthManager();
    const user = auth.getUser();

    if (!user) return;

    // Update profile elements
    document.querySelectorAll('[data-user-profile]').forEach(el => {
        if (el.tagName === 'IMG') {
            el.src = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=2a2421&color=fff`;
        } else if (el.tagName === 'SPAN' || el.tagName === 'DIV') {
            el.textContent = getInitials(user.name);
        }
    });

    // Update name elements
    document.querySelectorAll('[data-user-name]').forEach(el => {
        el.textContent = user.name;
    });

    // Update role elements
    document.querySelectorAll('[data-user-role]').forEach(el => {
        el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    });

    // Update email elements
    document.querySelectorAll('[data-user-email]').forEach(el => {
        el.textContent = user.email;
    });

    // Show/hide elements based on permissions
    document.querySelectorAll('[data-permission]').forEach(el => {
        const permission = el.dataset.permission;
        if (auth.hasPermission(permission)) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });

    // Show/hide elements based on role
    document.querySelectorAll('[data-role]').forEach(el => {
        const requiredRoles = el.dataset.role.split(',').map(r => r.trim());
        if (auth.hasRole(requiredRoles)) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });
}

/**
 * Get initials from name
 */
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

/**
 * Protect page on load
 */
function protectPage(allowedRoles) {
    const auth = new AuthManager();
    return auth.protectPage(allowedRoles);
}

// ============================================
// Initialize on DOM Load
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    updateUserUI();
});

// ============================================
// Export for module use
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AuthManager,
        ROLES,
        ROLE_PERMISSIONS,
        DASHBOARD_ROUTES,
        STORAGE_KEYS,
        updateUserUI,
        protectPage
    };
}
