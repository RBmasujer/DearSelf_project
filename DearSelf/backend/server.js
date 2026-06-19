require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY (or SERVICE_ROLE_KEY) are required');
  console.error('Please set these environment variables in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, role = 'customer', day_off } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const passwordHash = Buffer.from(password).toString('base64');

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, phone, password_hash: passwordHash, role, day_off }])
      .select();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      throw error;
    }

    res.status(201).json({ message: 'Registration successful', user: data[0] });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const passwordHash = Buffer.from(password).toString('base64');

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, avatar_url, day_off, is_active')
      .eq('email', email)
      .eq('password_hash', passwordHash)
      .single();

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ message: 'Login successful', user: data });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Services endpoints
app.get('/api/services', async (req, res) => {
  try {
    const { category, active } = req.query;
    let query = supabase.from('services').select('*');

    if (category) query = query.eq('category', category);
    if (active !== undefined) query = query.eq('is_active', active === 'true');

    const { data, error } = await query.order('name');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Fetch services error:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

app.post('/api/services', async (req, res) => {
  try {
    const { name, description, price, duration_minutes, category, image_url } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }

    const { data, error } = await supabase
      .from('services')
      .insert([{ name, description, price, duration_minutes, category, image_url }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Create service error:', err);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Promos endpoints
app.get('/api/promos', async (req, res) => {
  try {
    const { active } = req.query;
    let query = supabase.from('promos').select('*');

    if (active === 'true') {
      query = query.eq('is_active', true).gte('end_date', new Date().toISOString().split('T')[0]);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Fetch promos error:', err);
    res.status(500).json({ error: 'Failed to fetch promos' });
  }
});

app.post('/api/promos', async (req, res) => {
  try {
    const { title, description, discount_percent, discount_amount, start_date, end_date, image_url } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const { data, error } = await supabase
      .from('promos')
      .insert([{ title, description, discount_percent, discount_amount, start_date, end_date, image_url }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Create promo error:', err);
    res.status(500).json({ error: 'Failed to create promo' });
  }
});

// Bookings endpoints
app.get('/api/bookings', async (req, res) => {
  try {
    const { customer_id, staff_id, status, date } = req.query;

    let query = supabase
      .from('bookings')
      .select(`
        *,
        customer:users!bookings_customer_id_fkey(id, name, email, phone),
        staff:users!bookings_staff_id_fkey(id, name),
        services:booking_services(service_id, quantity, price_at_booking, services(id, name, price))
      `);

    if (customer_id) query = query.eq('customer_id', customer_id);
    if (staff_id) query = query.eq('staff_id', staff_id);
    if (status) query = query.eq('status', status);
    if (date) query = query.eq('booking_date', date);

    const { data, error } = await query.order('booking_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Fetch bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

app.get('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:users!bookings_customer_id_fkey(id, name, email, phone),
        staff:users!bookings_staff_id_fkey(id, name),
        services:booking_services(service_id, quantity, price_at_booking, services(id, name, price, category)),
        payments(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Fetch booking error:', err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { customer_id, staff_id, booking_date, booking_time, services, notes, payment_method } = req.body;

    if (!booking_date) {
      return res.status(400).json({ error: 'Booking date is required' });
    }

    const { data: servicesData } = await supabase
      .from('services')
      .select('id, price')
      .in('id', services.map(s => s.service_id));

    const total = servicesData.reduce((sum, s) => {
      const qty = services.find(svc => svc.service_id === s.id)?.quantity || 1;
      return sum + (parseFloat(s.price) * qty);
    }, 0);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        customer_id,
        staff_id,
        booking_date,
        booking_time,
        notes,
        total_amount: total
      }])
      .select();

    if (bookingError) throw bookingError;

    const bookingServicesData = services.map(s => ({
      booking_id: booking[0].id,
      service_id: s.service_id,
      quantity: s.quantity || 1,
      price_at_booking: servicesData.find(sd => sd.id === s.service_id)?.price
    }));

    const { error: bsError } = await supabase
      .from('booking_services')
      .insert(bookingServicesData);

    if (bsError) throw bsError;

    if (payment_method) {
      await supabase
        .from('payments')
        .insert([{
          booking_id: booking[0].id,
          amount: total,
          payment_method,
          status: payment_method === 'cash' ? 'pending' : 'pending'
        }]);
    }

    res.status(201).json(booking[0]);
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

app.patch('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('bookings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error('Update booking error:', err);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await supabase.from('booking_services').delete().eq('booking_id', id);
    await supabase.from('payments').delete().eq('booking_id', id);
    await supabase.from('feedback').delete().eq('booking_id', id);

    const { error } = await supabase.from('bookings').delete().eq('id', id);

    if (error) throw error;
    res.json({ message: 'Booking deleted successfully' });
  } catch (err) {
    console.error('Delete booking error:', err);
    res.status(500).json({ error: 'Failed to delete booking' });
  }
});

// Payments endpoints
app.get('/api/payments', async (req, res) => {
  try {
    const { booking_id, status } = req.query;

    let query = supabase
      .from('payments')
      .select(`
        *,
        bookings(id, booking_date, customer:users(name))
      `);

    if (booking_id) query = query.eq('booking_id', booking_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.patch('/api/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.status === 'paid') {
      updates.paid_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Feedback endpoints
app.get('/api/feedback', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select(`
        *,
        customer:users(id, name),
        bookings(id, booking_date, services:booking_services(services(name)))
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Fetch feedback error:', err);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const { booking_id, customer_id, rating, comment } = req.body;

    if (!booking_id || !rating) {
      return res.status(400).json({ error: 'Booking ID and rating are required' });
    }

    const { data, error } = await supabase
      .from('feedback')
      .insert([{ booking_id, customer_id, rating, comment }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Create feedback error:', err);
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});

// Staff endpoints
app.get('/api/staff', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, day_off, is_active')
      .in('role', ['staff', 'receptionist'])
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Fetch staff error:', err);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

app.patch('/api/staff/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error('Update staff error:', err);
    res.status(500).json({ error: 'Failed to update staff' });
  }
});

// Dashboard stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [bookingsToday, pendingPayments, totalRevenue, feedbackAvg] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact' }).eq('booking_date', today),
      supabase.from('payments').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('payments').select('amount').eq('status', 'paid'),
      supabase.from('feedback').select('rating')
    ]);

    const revenue = totalRevenue.data?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;
    const avgRating = feedbackAvg.data?.length > 0
      ? feedbackAvg.data.reduce((sum, f) => sum + f.rating, 0) / feedbackAvg.data.length
      : 0;

    res.json({
      bookingsToday: bookingsToday.count,
      pendingPayments: pendingPayments.count,
      totalRevenue: revenue,
      averageRating: avgRating.toFixed(1)
    });
  } catch (err) {
    console.error('Fetch stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
