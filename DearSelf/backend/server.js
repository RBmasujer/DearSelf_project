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

// ============================================
// Chat Room Endpoints
// ============================================

// Get all chat rooms
app.get('/api/chat/rooms', async (req, res) => {
  try {
    const { user_role } = req.query;

    let query = supabase
      .from('chat_rooms')
      .select(`
        *,
        creator:users(id, name)
      `)
      .eq('is_active', true);

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) throw error;

    // Filter rooms based on user role
    const filteredRooms = data.filter(room => {
      if (room.room_type === 'admin') return user_role === 'admin';
      if (room.room_type === 'staff') return ['admin', 'staff', 'receptionist'].includes(user_role);
      return true; // general and support rooms are accessible to all
    });

    res.json(filteredRooms);
  } catch (err) {
    console.error('Fetch chat rooms error:', err);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

// Create new chat room
app.post('/api/chat/rooms', async (req, res) => {
  try {
    const { name, description, room_type, created_by } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    const { data, error } = await supabase
      .from('chat_rooms')
      .insert([{ name, description, room_type: room_type || 'general', created_by }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Create chat room error:', err);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
});

// Get messages for a room
app.get('/api/chat/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:users(id, name, role, avatar_url)
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
app.post('/api/chat/rooms/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { sender_id, message, message_type = 'text' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{
        room_id: roomId,
        sender_id,
        message,
        message_type
      }])
      .select(`
        *,
        sender:users(id, name, role, avatar_url)
      `);

    if (error) throw error;

    // Update room's updated_at timestamp
    await supabase
      .from('chat_rooms')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', roomId);

    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
app.post('/api/chat/messages/:messageId/read', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { user_id } = req.body;

    const { data, error } = await supabase
      .from('message_reads')
      .insert([{ message_id: messageId, user_id }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Get unread message count
app.get('/api/chat/rooms/:roomId/unread', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { user_id } = req.query;

    const { data: messages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('room_id', roomId);

    if (!messages || messages.length === 0) {
      return res.json({ unread: 0 });
    }

    const messageIds = messages.map(m => m.id);

    const { data: reads } = await supabase
      .from('message_reads')
      .select('message_id')
      .eq('user_id', user_id)
      .in('message_id', messageIds);

    const readIds = new Set(reads?.map(r => r.message_id) || []);
    const unreadCount = messageIds.filter(id => !readIds.has(id)).length;

    res.json({ unread: unreadCount });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// Get all unread counts for user
app.get('/api/chat/unread', async (req, res) => {
  try {
    const { user_id } = req.query;

    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('id, name')
      .eq('is_active', true);

    if (!rooms) return res.json([]);

    const unreadCounts = await Promise.all(
      rooms.map(async (room) => {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select('id')
          .eq('room_id', room.id);

        if (!messages || messages.length === 0) {
          return { room_id: room.id, room_name: room.name, unread: 0 };
        }

        const messageIds = messages.map(m => m.id);
        const { data: reads } = await supabase
          .from('message_reads')
          .select('message_id')
          .eq('user_id', user_id)
          .in('message_id', messageIds);

        const readIds = new Set(reads?.map(r => r.message_id) || []);
        const unread = messageIds.filter(id => !readIds.has(id)).length;

        return { room_id: room.id, room_name: room.name, unread };
      })
    );

    res.json(unreadCounts);
  } catch (err) {
    console.error('Unread counts error:', err);
    res.status(500).json({ error: 'Failed to get unread counts' });
  }
});

// Join a chat room
app.post('/api/chat/rooms/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { user_id } = req.body;

    const { data, error } = await supabase
      .from('chat_room_members')
      .insert([{ room_id: roomId, user_id }])
      .select();

    if (error && error.code !== '23505') throw error; // Ignore duplicate

    res.json({ message: 'Joined room successfully' });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Get online users (users active in the last 5 minutes)
app.get('/api/chat/online-users', async (req, res) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('chat_room_members')
      .select(`
        user:users(id, name, role, avatar_url)
      `)
      .gte('last_read_at', fiveMinutesAgo);

    if (error) throw error;

    // Get unique users
    const uniqueUsers = [...new Map(data.map(item => [item.user.id, item.user])).values()];

    res.json(uniqueUsers);
  } catch (err) {
    console.error('Online users error:', err);
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

// Get recent conversations (for inbox view)
app.get('/api/chat/recent', async (req, res) => {
  try {
    const { user_id, limit = 20 } = req.query;

    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select(`
        id,
        name,
        room_type,
        updated_at
      `)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (!rooms) return res.json([]);

    const recentWithMessages = await Promise.all(
      rooms.map(async (room) => {
        const { data: messages } = await supabase
          .from('chat_messages')
          .select(`
            id,
            message,
            created_at,
            sender:users(id, name)
          `)
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1);

        return {
          ...room,
          last_message: messages?.[0] || null
        };
      })
    );

    res.json(recentWithMessages.slice(0, parseInt(limit)));
  } catch (err) {
    console.error('Recent conversations error:', err);
    res.status(500).json({ error: 'Failed to get recent conversations' });
  }
});

// ============================================
// Real-time Chat SSE Endpoint
// ============================================

// Store connected SSE clients
const sseClients = new Map();

// SSE endpoint for real-time chat updates
app.get('/api/chat/stream', async (req, res) => {
  const { user_id, last_message_id } = req.query;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', user_id })}\n\n`);

  // Store client connection
  const clientId = `${user_id}_${Date.now()}`;
  sseClients.set(clientId, { res, user_id, lastMessageId: last_message_id || 0 });

  // Heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeatInterval);
      sseClients.delete(clientId);
    }
  }, 30000);

  // Poll for new messages every 2 seconds
  const pollInterval = setInterval(async () => {
    try {
      const client = sseClients.get(clientId);
      if (!client) {
        clearInterval(pollInterval);
        return;
      }

      // Get user role to filter rooms
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', user_id)
        .single();

      const userRole = user?.role || 'customer';

      // Get accessible rooms
      const { data: rooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('is_active', true);

      const accessibleRoomIds = (rooms || [])
        .filter(room => {
          const { data: roomData } = { data: rooms.find(r => r.id === room.id) };
          return true;
        })
        .map(r => r.id);

      // Fetch new messages
      const { data: newMessages } = await supabase
        .from('chat_messages')
        .select(`
          id,
          room_id,
          sender_id,
          message,
          message_type,
          created_at,
          sender:users(id, name, role, avatar_url)
        `)
        .in('room_id', accessibleRoomIds)
        .gt('id', client.lastMessageId)
        .order('id', { ascending: true })
        .limit(20);

      if (newMessages && newMessages.length > 0) {
        // Update last message ID
        const maxId = Math.max(...newMessages.map(m => m.id));
        client.lastMessageId = maxId;

        // Send each message
        for (const msg of newMessages) {
          res.write(`data: ${JSON.stringify({
            type: 'message',
            data: msg
          })}\n\n`);
        }
      }

      // Check for typing indicators from other users
      const { data: typingUsers } = await supabase
        .from('chat_room_members')
        .select('room_id, user_id, is_typing')
        .eq('is_typing', true)
        .neq('user_id', user_id);

      if (typingUsers && typingUsers.length > 0) {
        res.write(`data: ${JSON.stringify({
          type: 'typing',
          data: typingUsers
        })}\n\n`);
      }
    } catch (err) {
      console.error('SSE poll error:', err);
    }
  }, 2000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    clearInterval(pollInterval);
    sseClients.delete(clientId);
  });
});

// Endpoint to update typing status
app.post('/api/chat/typing', async (req, res) => {
  try {
    const { room_id, user_id, is_typing } = req.body;

    if (!room_id || !user_id) {
      return res.status(400).json({ error: 'Room ID and User ID are required' });
    }

    // Ensure user is a member of the room
    await supabase
      .from('chat_room_members')
      .upsert([{
        room_id,
        user_id,
        is_typing,
        last_read_at: new Date().toISOString()
      }], { onConflict: 'room_id,user_id' });

    res.json({ success: true });
  } catch (err) {
    console.error('Typing status error:', err);
    res.status(500).json({ error: 'Failed to update typing status' });
  }
});

// ============================================
// User Profile Endpoints
// ============================================

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role, avatar_url, day_off, is_active, created_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Fetch user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields from updates
    delete updates.password_hash;
    delete updates.id;

    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, name, email, phone, role, avatar_url, day_off, is_active');

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get all users (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const { role } = req.query;

    let query = supabase
      .from('users')
      .select('id, name, email, phone, role, avatar_url, day_off, is_active, created_at')
      .order('name');

    if (role) query = query.eq('role', role);

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ============================================
// Notifications Endpoints
// ============================================

// Get notifications for user
app.get('/api/notifications', async (req, res) => {
  try {
    const { user_id } = req.query;

    // Get unread chat messages as notifications
    const { data: messages } = await supabase
      .from('chat_messages')
      .select(`
        id,
        message,
        created_at,
        room_id,
        sender:users(id, name)
      `)
      .neq('sender_id', user_id)
      .order('created_at', { ascending: false })
      .limit(20);

    const notifications = await Promise.all(
      (messages || []).map(async (msg) => {
        const { data: read } = await supabase
          .from('message_reads')
          .select('id')
          .eq('message_id', msg.id)
          .eq('user_id', user_id)
          .single();

        return {
          id: msg.id,
          type: 'chat',
          title: `New message from ${msg.sender?.name || 'Unknown'}`,
          message: msg.message?.substring(0, 100),
          room_id: msg.room_id,
          created_at: msg.created_at,
          read: !!read
        };
      })
    );

    res.json(notifications.filter(n => !n.read));
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
