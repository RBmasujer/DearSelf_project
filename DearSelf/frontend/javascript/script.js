/**
 * Dear Self - Shared JavaScript Module
 * Common functionality for all frontend pages
 */

const API_URL = 'http://localhost:3000/api';

// ============================================
// Utility Functions
// ============================================

/**
 * Display a toast notification
 * @param {string} message - Message to display
 * @param {number} duration - Duration in ms (default 3000)
 */
function showToast(message, duration = 3000) {
    let toast = document.getElementById('toast');

    // Create toast element if it doesn't exist
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: #2a2421;
            color: #fff;
            padding: 16px 32px;
            border-radius: 30px;
            font-size: 14px;
            z-index: 9999;
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 10px 30px rgba(42, 36, 33, 0.2);
            font-family: 'Montserrat', sans-serif;
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.transform = 'translateX(-50%) translateY(0)';

    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, duration);
}

/**
 * Format currency in PHP
 */
function formatCurrency(amount) {
    return `PHP ${parseFloat(amount || 0).toLocaleString()}`;
}

/**
 * Format date to readable string
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Get initials from a name
 */
function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// ============================================
// API Helper Functions
// ============================================

/**
 * Make an API request
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    const defaultOptions = {
        headers: { 'Content-Type': 'application/json' }
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: { ...defaultOptions.headers, ...options.headers }
    };

    try {
        const response = await fetch(url, mergedOptions);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return { success: true, data };
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

async function apiGet(endpoint) { return apiRequest(endpoint); }
async function apiPost(endpoint, body) { return apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
async function apiPatch(endpoint, body) { return apiRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body) }); }
async function apiDelete(endpoint) { return apiRequest(endpoint, { method: 'DELETE' }); }

// ============================================
// Authentication Functions
// ============================================

function getCurrentUser() {
    const userData = localStorage.getItem('dearself_user');
    return userData ? JSON.parse(userData) : null;
}

function saveUser(user) {
    localStorage.setItem('dearself_user', JSON.stringify(user));
}

function clearUser() {
    localStorage.removeItem('dearself_user');
}

function logout() {
    clearUser();
    window.location.href = 'landingpage.html';
}

// ============================================
// Search and Filter Functions
// ============================================

function setupTableSearch(searchInputId, tableBodyId) {
    const searchInput = document.getElementById(searchInputId);
    const tableBody = document.getElementById(tableBodyId);

    if (!searchInput || !tableBody) return;

    searchInput.addEventListener('keyup', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = tableBody.querySelectorAll('tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

// ============================================
// Modal Functions
// ============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active', 'modal-active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active', 'modal-active');
        document.body.style.overflow = '';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay, .modal').forEach(modal => {
        modal.classList.remove('active', 'modal-active');
    });
    document.body.style.overflow = '';
}

const dismissAllModals = closeAllModals;

// ============================================
// Password Toggle
// ============================================

function togglePassword(inputId, toggleBtn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    const icon = toggleBtn?.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-eye', !isPassword);
        icon.classList.toggle('fa-eye-slash', isPassword);
    }
}

const togglePasswordVisibility = togglePassword;

// ============================================
// Legacy handler for forms
// ============================================

function handleGlobalSubmit(e) {
    e.preventDefault();
    showToast('Action processed successfully!');
    closeAllModals();
}

// ============================================
// Initialize Common Features
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Close modal on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeAllModals();
        });
    });

    // Initialize search if elements exist
    if (document.getElementById('searchInput') && document.getElementById('bookingTableBody')) {
        setupTableSearch('searchInput', 'bookingTableBody');
    }
});
