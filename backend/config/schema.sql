-- Create database (run this separately if needed)
-- CREATE DATABASE straysafe_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('citizen', 'ngo', 'volunteer', 'admin');
CREATE TYPE report_status AS ENUM ('reported', 'in_progress', 'rescued', 'adopted', 'closed');
CREATE TYPE urgency_level AS ENUM ('low', 'medium', 'high', 'critical');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'citizen',
    phone VARCHAR(20),
    organization VARCHAR(255),
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NGOs table (extended user information for NGOs)
CREATE TABLE ngos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    website VARCHAR(255),
    description TEXT,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    service_areas TEXT[], -- Array of service areas
    specializations TEXT[], -- Array of specializations
    is_approved BOOLEAN DEFAULT false,
    capacity_limit INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location_lat DECIMAL(10, 8) NOT NULL,
    location_lng DECIMAL(11, 8) NOT NULL,
    location_address TEXT,
    photos TEXT[], -- Array of photo URLs
    status report_status NOT NULL DEFAULT 'reported',
    urgency urgency_level NOT NULL DEFAULT 'medium',
    tags TEXT[], -- Array of tags
    animal_type VARCHAR(100),
    animal_breed VARCHAR(100),
    animal_age_estimate VARCHAR(50),
    animal_gender VARCHAR(20),
    animal_size VARCHAR(50),
    animal_color VARCHAR(100),
    animal_condition TEXT,
    is_injured BOOLEAN DEFAULT false,
    is_aggressive BOOLEAN DEFAULT false,
    reported_by UUID NOT NULL REFERENCES users(id),
    assigned_ngo UUID REFERENCES ngos(id),
    assigned_volunteer UUID REFERENCES users(id),
    rescue_date TIMESTAMP,
    adoption_date TIMESTAMP,
    is_public BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report updates table
CREATE TABLE report_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    photos TEXT[], -- Array of photo URLs
    author_id UUID NOT NULL REFERENCES users(id),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report followers table (for notifications)
CREATE TABLE report_followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_id, user_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'report_update', 'assignment', 'status_change', etc.
    related_report_id UUID REFERENCES reports(id),
    related_user_id UUID REFERENCES users(id),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table (for JWT blacklisting)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'report', 'user', 'ngo', etc.
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_ngos_user_id ON ngos(user_id);
CREATE INDEX idx_ngos_is_approved ON ngos(is_approved);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_urgency ON reports(urgency);
CREATE INDEX idx_reports_reported_by ON reports(reported_by);
CREATE INDEX idx_reports_assigned_ngo ON reports(assigned_ngo);
CREATE INDEX idx_reports_location ON reports(location_lat, location_lng);
CREATE INDEX idx_reports_created_at ON reports(created_at);
CREATE INDEX idx_reports_tags ON reports USING GIN(tags);

CREATE INDEX idx_report_updates_report_id ON report_updates(report_id);
CREATE INDEX idx_report_updates_created_at ON report_updates(created_at);

CREATE INDEX idx_report_followers_report_id ON report_followers(report_id);
CREATE INDEX idx_report_followers_user_id ON report_followers(user_id);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ngos_updated_at BEFORE UPDATE ON ngos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(lat1 DECIMAL, lng1 DECIMAL, lat2 DECIMAL, lng2 DECIMAL)
RETURNS DECIMAL AS $$
BEGIN
    RETURN 6371 * acos(
        cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1)) +
        sin(radians(lat1)) * sin(radians(lat2))
    );
END;
$$ language 'plpgsql';

-- Create view for report statistics
CREATE VIEW report_statistics AS
SELECT 
    status,
    urgency,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_resolution_hours
FROM reports
GROUP BY status, urgency;

-- Create view for user activity
CREATE VIEW user_activity AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    COUNT(r.id) as reports_count,
    COUNT(ru.id) as updates_count,
    u.created_at,
    u.last_login
FROM users u
LEFT JOIN reports r ON u.id = r.reported_by
LEFT JOIN report_updates ru ON u.id = ru.author_id
GROUP BY u.id, u.name, u.email, u.role, u.created_at, u.last_login;