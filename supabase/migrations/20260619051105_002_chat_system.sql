-- Chat rooms table
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL DEFAULT 'general' CHECK (room_type IN ('general', 'support', 'staff', 'admin')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Message read receipts
CREATE TABLE message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Chat room members (for private/group rooms)
CREATE TABLE chat_room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_members ENABLE ROW LEVEL SECURITY;

-- Chat rooms policies
CREATE POLICY "select_chat_rooms" ON chat_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_chat_rooms" ON chat_rooms FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_chat_rooms" ON chat_rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_chat_rooms" ON chat_rooms FOR DELETE TO authenticated USING (true);

-- Chat messages policies
CREATE POLICY "select_chat_messages" ON chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_chat_messages" ON chat_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_chat_messages" ON chat_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_chat_messages" ON chat_messages FOR DELETE TO authenticated USING (true);

-- Message reads policies
CREATE POLICY "select_message_reads" ON message_reads FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_message_reads" ON message_reads FOR INSERT TO authenticated WITH CHECK (true);

-- Chat room members policies
CREATE POLICY "select_chat_room_members" ON chat_room_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_chat_room_members" ON chat_room_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "delete_chat_room_members" ON chat_room_members FOR DELETE TO authenticated USING (true);

-- Insert default chat rooms
INSERT INTO chat_rooms (name, description, room_type) VALUES
('General Chat', 'Public chat room for all users', 'general'),
('Staff Room', 'Private chat for staff members', 'staff'),
('Support', 'Customer support chat', 'support'),
('Admin Room', 'Admin-only discussions', 'admin');

-- Create indexes for better performance
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_room_members_user_id ON chat_room_members(user_id);
CREATE INDEX idx_message_reads_message_id ON message_reads(message_id);
