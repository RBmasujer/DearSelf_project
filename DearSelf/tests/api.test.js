/**
 * API Integration Tests
 * Tests for server.js REST API endpoints
 */

const API_URL = 'http://localhost:3000/api';

// Mock fetch for API calls
global.fetch = jest.fn();

describe('API Integration Tests', () => {

    beforeEach(() => {
        fetch.mockClear();
    });

    describe('Authentication Endpoints', () => {
        describe('POST /api/auth/register', () => {
            test('should register new user successfully', async () => {
                const mockUser = {
                    id: '123',
                    name: 'Test User',
                    email: 'test@example.com',
                    role: 'customer'
                };

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 201,
                    json: () => Promise.resolve({ message: 'Registration successful', user: mockUser })
                });

                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Test User',
                        email: 'test@example.com',
                        password: 'password123',
                        role: 'customer'
                    })
                });

                const result = await response.json();

                expect(response.status).toBe(201);
                expect(result.message).toBe('Registration successful');
                expect(result.user).toBeDefined();
            });

            test('should reject duplicate email', async () => {
                fetch.mockResolvedValueOnce({
                    ok: false,
                    status: 409,
                    json: () => Promise.resolve({ error: 'Email already exists' })
                });

                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'Test User',
                        email: 'existing@example.com',
                        password: 'password123',
                        role: 'customer'
                    })
                });

                const result = await response.json();

                expect(response.status).toBe(409);
                expect(result.error).toBe('Email already exists');
            });

            test('should validate required fields', async () => {
                fetch.mockResolvedValueOnce({
                    ok: false,
                    status: 400,
                    json: () => Promise.resolve({ error: 'Name, email, and password are required' })
                });

                const response = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'test@example.com' })
                });

                const result = await response.json();

                expect(response.status).toBe(400);
                expect(result.error).toBe('Name, email, and password are required');
            });
        });

        describe('POST /api/auth/login', () => {
            test('should login successfully with valid credentials', async () => {
                const mockUser = {
                    id: '123',
                    name: 'Test User',
                    email: 'test@example.com',
                    role: 'customer'
                };

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ message: 'Login successful', user: mockUser })
                });

                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'test@example.com',
                        password: 'password123'
                    })
                });

                const result = await response.json();

                expect(response.status).toBe(200);
                expect(result.message).toBe('Login successful');
                expect(result.user).toBeDefined();
            });

            test('should reject invalid credentials', async () => {
                fetch.mockResolvedValueOnce({
                    ok: false,
                    status: 401,
                    json: () => Promise.resolve({ error: 'Invalid credentials' })
                });

                const response = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'test@example.com',
                        password: 'wrongpassword'
                    })
                });

                const result = await response.json();

                expect(response.status).toBe(401);
                expect(result.error).toBe('Invalid credentials');
            });
        });
    });

    describe('Services Endpoints', () => {
        describe('GET /api/services', () => {
            test('should return list of services', async () => {
                const mockServices = [
                    { id: '1', name: 'Classic Manicure', price: 350, category: 'nails' },
                    { id: '2', name: 'Body Massage', price: 800, category: 'spa' }
                ];

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(mockServices)
                });

                const response = await fetch(`${API_URL}/services`);
                const result = await response.json();

                expect(response.status).toBe(200);
                expect(Array.isArray(result)).toBe(true);
                expect(result.length).toBe(2);
            });

            test('should filter services by category', async () => {
                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve([
                        { id: '1', name: 'Manicure', category: 'nails' }
                    ])
                });

                const response = await fetch(`${API_URL}/services?category=nails`);
                const result = await response.json();

                expect(response.status).toBe(200);
                expect(result.every(s => s.category === 'nails')).toBe(true);
            });
        });

        describe('POST /api/services', () => {
            test('should create new service', async () => {
                const newService = {
                    id: '3',
                    name: 'New Service',
                    price: 500,
                    category: 'wellness'
                };

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 201,
                    json: () => Promise.resolve(newService)
                });

                const response = await fetch(`${API_URL}/services`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: 'New Service',
                        price: 500,
                        category: 'wellness'
                    })
                });

                const result = await response.json();

                expect(response.status).toBe(201);
                expect(result.name).toBe('New Service');
            });
        });
    });

    describe('Bookings Endpoints', () => {
        describe('GET /api/bookings', () => {
            test('should return list of bookings', async () => {
                const mockBookings = [
                    {
                        id: '1',
                        customer: { name: 'John Doe' },
                        booking_date: '2026-06-20',
                        status: 'confirmed'
                    },
                    {
                        id: '2',
                        customer: { name: 'Jane Doe' },
                        booking_date: '2026-06-21',
                        status: 'pending'
                    }
                ];

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(mockBookings)
                });

                const response = await fetch(`${API_URL}/bookings`);
                const result = await response.json();

                expect(response.status).toBe(200);
                expect(Array.isArray(result)).toBe(true);
            });

            test('should filter bookings by customer_id', async () => {
                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve([
                        { id: '1', customer_id: 'user123' }
                    ])
                });

                const response = await fetch(`${API_URL}/bookings?customer_id=user123`);
                const result = await response.json();

                expect(response.status).toBe(200);
                expect(result.every(b => b.customer_id === 'user123')).toBe(true);
            });
        });

        describe('POST /api/bookings', () => {
            test('should create new booking', async () => {
                const newBooking = {
                    id: '3',
                    customer_id: 'user123',
                    booking_date: '2026-06-25',
                    status: 'pending'
                };

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 201,
                    json: () => Promise.resolve(newBooking)
                });

                const response = await fetch(`${API_URL}/bookings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customer_id: 'user123',
                        booking_date: '2026-06-25',
                        services: [{ service_id: '1', quantity: 1 }],
                        payment_method: 'cash'
                    })
                });

                const result = await response.json();

                expect(response.status).toBe(201);
                expect(result.customer_id).toBe('user123');
            });

            test('should validate booking date is required', async () => {
                fetch.mockResolvedValueOnce({
                    ok: false,
                    status: 400,
                    json: () => Promise.resolve({ error: 'Booking date is required' })
                });

                const response = await fetch(`${API_URL}/bookings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customer_id: 'user123' })
                });

                const result = await response.json();

                expect(response.status).toBe(400);
                expect(result.error).toBe('Booking date is required');
            });
        });

        describe('PATCH /api/bookings/:id', () => {
            test('should update booking status', async () => {
                const updatedBooking = {
                    id: '1',
                    status: 'completed'
                };

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(updatedBooking)
                });

                const response = await fetch(`${API_URL}/bookings/1`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'completed' })
                });

                const result = await response.json();

                expect(response.status).toBe(200);
                expect(result.status).toBe('completed');
            });
        });

        describe('DELETE /api/bookings/:id', () => {
            test('should delete booking', async () => {
                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ message: 'Booking deleted successfully' })
                });

                const response = await fetch(`${API_URL}/bookings/1`, {
                    method: 'DELETE'
                });

                const result = await response.json();

                expect(response.status).toBe(200);
                expect(result.message).toBe('Booking deleted successfully');
            });
        });
    });

    describe('Payments Endpoints', () => {
        describe('GET /api/payments', () => {
            test('should return list of payments', async () => {
                const mockPayments = [
                    { id: '1', amount: 500, status: 'paid' },
                    { id: '2', amount: 1000, status: 'pending' }
                ];

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(mockPayments)
                });

                const response = await fetch(`${API_URL}/payments`);
                const result = await response.json();

                expect(response.status).toBe(200);
                expect(Array.isArray(result)).toBe(true);
            });
        });

        describe('PATCH /api/payments/:id', () => {
            test('should update payment status', async () => {
                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ id: '1', status: 'paid' })
                });

                const response = await fetch(`${API_URL}/payments/1`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'paid' })
                });

                const result = await response.json();

                expect(response.status).toBe(200);
                expect(result.status).toBe('paid');
            });
        });
    });

    describe('Feedback Endpoints', () => {
        describe('GET /api/feedback', () => {
            test('should return list of feedback', async () => {
                const mockFeedback = [
                    { id: '1', rating: 5, comment: 'Great service!' },
                    { id: '2', rating: 4, comment: 'Good experience' }
                ];

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(mockFeedback)
                });

                const response = await fetch(`${API_URL}/feedback`);
                const result = await response.json();

                expect(response.status).toBe(200);
                expect(Array.isArray(result)).toBe(true);
            });
        });

        describe('POST /api/feedback', () => {
            test('should create new feedback', async () => {
                const newFeedback = {
                    id: '3',
                    booking_id: 'booking123',
                    rating: 5,
                    comment: 'Excellent!'
                };

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 201,
                    json: () => Promise.resolve(newFeedback)
                });

                const response = await fetch(`${API_URL}/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        booking_id: 'booking123',
                        rating: 5,
                        comment: 'Excellent!'
                    })
                });

                const result = await response.json();

                expect(response.status).toBe(201);
                expect(result.rating).toBe(5);
            });

            test('should validate required fields', async () => {
                fetch.mockResolvedValueOnce({
                    ok: false,
                    status: 400,
                    json: () => Promise.resolve({ error: 'Booking ID and rating are required' })
                });

                const response = await fetch(`${API_URL}/feedback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ comment: 'Test comment' })
                });

                const result = await response.json();

                expect(response.status).toBe(400);
                expect(result.error).toBe('Booking ID and rating are required');
            });
        });
    });

    describe('Staff Endpoints', () => {
        describe('GET /api/staff', () => {
            test('should return list of staff', async () => {
                const mockStaff = [
                    { id: '1', name: 'Staff A', role: 'staff' },
                    { id: '2', name: 'Staff B', role: 'receptionist' }
                ];

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(mockStaff)
                });

                const response = await fetch(`${API_URL}/staff`);
                const result = await response.json();

                expect(response.status).toBe(200);
                expect(Array.isArray(result)).toBe(true);
            });
        });

        describe('PATCH /api/staff/:id', () => {
            test('should update staff status', async () => {
                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve({ id: '1', is_active: false })
                });

                const response = await fetch(`${API_URL}/staff/1`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_active: false })
                });

                const result = await response.json();

                expect(response.status).toBe(200);
                expect(result.is_active).toBe(false);
            });
        });
    });

    describe('Stats Endpoints', () => {
        describe('GET /api/stats', () => {
            test('should return dashboard statistics', async () => {
                const mockStats = {
                    bookingsToday: 5,
                    pendingPayments: 2,
                    totalRevenue: 5000,
                    averageRating: '4.5'
                };

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(mockStats)
                });

                const response = await fetch(`${API_URL}/stats`);
                const result = await response.json();

                expect(response.status).toBe(200);
                expect(result.bookingsToday).toBeDefined();
                expect(result.totalRevenue).toBeDefined();
            });
        });
    });

    describe('Promos Endpoints', () => {
        describe('GET /api/promos', () => {
            test('should return list of promos', async () => {
                const mockPromos = [
                    { id: '1', title: 'Summer Sale', discount_percent: 20 },
                    { id: '2', title: 'New Customer', discount_percent: 15 }
                ];

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: () => Promise.resolve(mockPromos)
                });

                const response = await fetch(`${API_URL}/promos`);
                const result = await response.json();

                expect(response.status).toBe(200);
                expect(Array.isArray(result)).toBe(true);
            });
        });

        describe('POST /api/promos', () => {
            test('should create new promo', async () => {
                const newPromo = {
                    id: '3',
                    title: 'Weekend Special',
                    discount_percent: 25
                };

                fetch.mockResolvedValueOnce({
                    ok: true,
                    status: 201,
                    json: () => Promise.resolve(newPromo)
                });

                const response = await fetch(`${API_URL}/promos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: 'Weekend Special',
                        discount_percent: 25
                    })
                });

                const result = await response.json();

                expect(response.status).toBe(201);
                expect(result.title).toBe('Weekend Special');
            });
        });
    });
});
