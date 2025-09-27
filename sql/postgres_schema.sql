-- PostgreSQL Schema for Smart Copilot Assistant

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table  
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    vscode_user_id VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Prompt categories table
CREATE TABLE IF NOT EXISTS prompt_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(20),
    color VARCHAR(7) DEFAULT '#007ACC',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Prompt templates table
CREATE TABLE IF NOT EXISTS prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES prompt_categories(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    variables JSONB DEFAULT '[]',
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Team events table
CREATE TABLE IF NOT EXISTS team_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(100) NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'pending')),
    context JSONB DEFAULT '{}',
    logs TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_templates_type ON prompt_templates(type);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_team_id ON prompt_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_usage_count ON prompt_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_team_events_team_id ON team_events(team_id);
CREATE INDEX IF NOT EXISTS idx_team_events_created_at ON team_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_events_result ON team_events(result);
CREATE INDEX IF NOT EXISTS idx_users_vscode_user_id ON users(vscode_user_id);

-- Full text search indexes
CREATE INDEX IF NOT EXISTS idx_prompt_templates_text_search 
ON prompt_templates USING gin(to_tsvector('english', prompt));

-- Sample data
INSERT INTO teams (id, name, description) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Development Team', 'Main development team')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, team_id, vscode_user_id, display_name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'dev_user_1', 'Developer One')
ON CONFLICT (vscode_user_id) DO NOTHING;

-- Sample prompt categories
INSERT INTO prompt_categories (id, name, display_name, description, icon, color, sort_order) VALUES 
    ('660e8400-e29b-41d4-a716-446655440001', 'test', 'Testing', 'Unit tests, integration tests, test automation', '🧪', '#4CAF50', 1),
    ('660e8400-e29b-41d4-a716-446655440002', 'deploy', 'Deployment', 'CI/CD, deployment strategies, infrastructure', '🚀', '#FF9800', 2),
    ('660e8400-e29b-41d4-a716-446655440003', 'build', 'Build & Compile', 'Build errors, compilation issues, dependencies', '🔨', '#2196F3', 3),
    ('660e8400-e29b-41d4-a716-446655440004', 'docs', 'Documentation', 'API docs, user guides, code documentation', '📚', '#9C27B0', 4),
    ('660e8400-e29b-41d4-a716-446655440005', 'agile', 'Agile & Process', 'Sprint planning, retrospectives, process improvement', '🏃', '#607D8B', 5),
    ('660e8400-e29b-41d4-a716-446655440006', 'debug', 'Debugging', 'Error analysis, troubleshooting, performance', '🐛', '#F44336', 6),
    ('660e8400-e29b-41d4-a716-446655440007', 'security', 'Security', 'Security reviews, vulnerability assessments', '🔒', '#795548', 7),
    ('660e8400-e29b-41d4-a716-446655440008', 'performance', 'Performance', 'Optimization, profiling, scaling', '⚡', '#FF5722', 8)
ON CONFLICT (name) DO NOTHING;

-- Sample prompt templates (updated to use category_id)
INSERT INTO prompt_templates (category_id, prompt, variables, team_id, created_by) VALUES 
    ('660e8400-e29b-41d4-a716-446655440001', 'Write unit tests for the {function_name} function in {file_name}', '["function_name", "file_name"]', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
    ('660e8400-e29b-41d4-a716-446655440003', 'Fix the build error: {error_message}. Check dependencies and configuration.', '["error_message"]', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
    ('660e8400-e29b-41d4-a716-446655440002', 'Help me deploy {service_name} to {environment}. What are the steps?', '["service_name", "environment"]', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
    ('660e8400-e29b-41d4-a716-446655440004', 'Generate documentation for {component_name} including usage examples.', '["component_name"]', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
    ('660e8400-e29b-41d4-a716-446655440005', 'Help me plan the next sprint. What should we prioritize for {project_name}?', '["project_name"]', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'),
    ('660e8400-e29b-41d4-a716-446655440006', 'Debug this error: {error_message} in {file_name} at line {line_number}', '["error_message", "file_name", "line_number"]', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001')
ON CONFLICT DO NOTHING;

-- Sample team events
INSERT INTO team_events (team_id, user_id, event_type, result, context) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'build', 'failure', '{"error": "Module not found", "file": "src/main.py"}'),
    ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'test', 'success', '{"tests_passed": 15, "tests_failed": 0}'),
    ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'deploy', 'failure', '{"service": "api-service", "environment": "staging", "error": "Connection timeout"}')
ON CONFLICT DO NOTHING;
