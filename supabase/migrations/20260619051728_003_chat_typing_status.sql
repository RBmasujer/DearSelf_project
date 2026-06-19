-- Add typing status column to chat_room_members
ALTER TABLE chat_room_members 
ADD COLUMN IF NOT EXISTS is_typing BOOLEAN DEFAULT false;

-- Update last_read_at to be nullable with default
ALTER TABLE chat_room_members 
ALTER COLUMN last_read_at SET DEFAULT CURRENT_TIMESTAMP;

-- Create index for faster typing status queries
CREATE INDEX IF NOT EXISTS idx_chat_room_members_typing 
ON chat_room_members(room_id, is_typing) 
WHERE is_typing = true;