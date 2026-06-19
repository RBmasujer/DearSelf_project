-- Users table (stores all user types: customer, staff, admin, receptionist)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'staff', 'admin', 'receptionist')),
  avatar_url TEXT,
  day_off INTEGER CHECK (day_off >= 0 AND day_off <= 6),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  category TEXT NOT NULL CHECK (category IN ('nails', 'spa', 'salon', 'wellness')),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Promos table
CREATE TABLE promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  discount_percent DECIMAL(5,2),
  discount_amount DECIMAL(10,2),
  image_url TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  booking_time TIME,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  total_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Booking services junction table
CREATE TABLE booking_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  quantity INTEGER DEFAULT 1,
  price_at_booking DECIMAL(10,2)
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('gcash', 'maya', 'cash', 'credit_card', 'online', 'onsite')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'refunded')),
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback table
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "select_own_users" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_users" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_own_users" ON users FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_users" ON users FOR DELETE TO authenticated USING (auth.uid() = id);

-- Services policies (read-only for authenticated users)
CREATE POLICY "select_services" ON services FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_services" ON services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_services" ON services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_services" ON services FOR DELETE TO authenticated USING (true);

-- Promos policies
CREATE POLICY "select_promos" ON promos FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_promos" ON promos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_promos" ON promos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_promos" ON promos FOR DELETE TO authenticated USING (true);

-- Bookings policies
CREATE POLICY "select_bookings" ON bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_bookings" ON bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_bookings" ON bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_bookings" ON bookings FOR DELETE TO authenticated USING (true);

-- Booking services policies
CREATE POLICY "select_booking_services" ON booking_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_booking_services" ON booking_services FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_booking_services" ON booking_services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_booking_services" ON booking_services FOR DELETE TO authenticated USING (true);

-- Payments policies
CREATE POLICY "select_payments" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_payments" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_payments" ON payments FOR DELETE TO authenticated USING (true);

-- Feedback policies
CREATE POLICY "select_feedback" ON feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_feedback" ON feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_feedback" ON feedback FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_feedback" ON feedback FOR DELETE TO authenticated USING (true);

-- Insert default services
INSERT INTO services (name, description, price, category, image_url) VALUES
('Classic Manicure', 'Nail shaping, cuticle care, and polish application', 350.00, 'nails', '/res/images/nails.jpg'),
('Classic Pedicure', 'Foot soak, exfoliation, nail care, and polish', 450.00, 'nails', '/res/images/nails.jpg'),
('Body Wellness Massage', 'Full body relaxation massage', 800.00, 'spa', '/res/images/massage.jpg'),
('Aromatherapy Massage', 'Therapeutic massage with essential oils', 950.00, 'spa', '/res/images/massage.jpg'),
('Hair Treatment', 'Deep conditioning and repair treatment', 600.00, 'salon', '/res/images/hair.jpg'),
('Hair Coloring', 'Professional hair coloring service', 1500.00, 'salon', '/res/images/hair.jpg'),
('Haircut & Styling', 'Professional cut and style', 400.00, 'salon', '/res/images/hair.jpg'),
('Facial Cleansing', 'Deep pore cleansing facial', 700.00, 'wellness', '/res/images/spa.jpg'),
('Foot Spa', 'Relaxing foot spa with massage', 500.00, 'wellness', '/res/images/massage.jpg');

-- Insert default promos
INSERT INTO promos (title, description, discount_percent, start_date, end_date) VALUES
('First Visit Special', '20% off for first-time customers', 20.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days'),
('Weekday Wellness', '15% off all spa services Mon-Thu', 15.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days'),
('Hair Treatment Bundle', 'Buy 3 hair treatments, get 1 free', 25.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '45 days');
