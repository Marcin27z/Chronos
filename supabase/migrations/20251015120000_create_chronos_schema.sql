-- ============================================================================
-- Migration: Create Chronos Database Schema
-- ============================================================================
-- Description: Initial schema for Chronos (Cykliczne Zadania) application
-- 
-- This migration creates:
--   - ENUM types for interval units and action types
--   - task_templates table (global task templates for onboarding)
--   - tasks table (user's recurring tasks)
--   - Indexes for optimal query performance
--   - Triggers for automatic timestamp updates
--   - Row Level Security policies for data protection
--
-- Affected tables: task_templates, tasks
-- Dependencies: auth.users (Supabase Auth schema)
-- 
-- Author: Chronos Team
-- Date: 2025-10-15
-- ============================================================================

-- ============================================================================
-- Section 1: ENUM Types
-- ============================================================================
-- Custom ENUM types must be created before tables that reference them

-- interval_unit_type: Defines time units for task recurrence intervals
-- Values: days, weeks, months, years
create type interval_unit_type as enum (
    'days',
    'weeks',
    'months',
    'years'
);

-- action_type: Defines types of actions that can be performed on tasks
-- Values: completed (task was done), skipped (task was postponed)
create type action_type as enum (
    'completed',
    'skipped'
);

-- ============================================================================
-- Section 2: Tables
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: task_templates
-- ----------------------------------------------------------------------------
-- Purpose: Stores global task templates for onboarding and help pages
-- Access: Read-only for all authenticated users
-- RLS: Enabled (public read access via policies)
-- 
-- This table contains pre-defined task templates that help users during
-- onboarding and when they need inspiration for creating new tasks.
-- Templates are categorized and ordered for better UX.
-- ----------------------------------------------------------------------------
create table task_templates (
    -- Primary identifier
    id uuid primary key default gen_random_uuid(),
    
    -- Template content
    title varchar(256) not null,
    description text,
    
    -- Recurrence configuration
    interval_value integer not null check (interval_value > 0 and interval_value < 1000),
    interval_unit interval_unit_type not null,
    
    -- Optional preferred day of week (0=Sunday, 6=Saturday, NULL=no preference)
    preferred_day_of_week smallint check (
        preferred_day_of_week is null or 
        (preferred_day_of_week >= 0 and preferred_day_of_week <= 6)
    ),
    
    -- Template organization
    category varchar(100),
    display_order integer not null unique,
    
    -- Template status
    is_active boolean not null default true,
    
    -- Audit timestamp (UTC)
    created_at timestamptz not null default now()
);

-- Enable RLS on task_templates (required for all tables in Supabase)
alter table task_templates enable row level security;

-- ----------------------------------------------------------------------------
-- Table: tasks
-- ----------------------------------------------------------------------------
-- Purpose: Stores users' recurring tasks with their recurrence rules
-- Access: Users can only access their own tasks (enforced by RLS)
-- RLS: Enabled (policies enforce user_id = auth.uid())
-- 
-- This is the main table of the application. Each task belongs to a user
-- and contains all necessary information for tracking recurring activities.
-- The next_due_date is calculated by application logic, not by database triggers.
-- ----------------------------------------------------------------------------
create table tasks (
    -- Primary identifier
    id uuid primary key default gen_random_uuid(),
    
    -- Owner reference (CASCADE delete ensures cleanup when user account is deleted)
    user_id uuid not null references auth.users(id) on delete cascade,
    
    -- Task content
    title varchar(256) not null,
    description text,
    
    -- Recurrence configuration
    interval_value integer not null check (interval_value > 0 and interval_value < 1000),
    interval_unit interval_unit_type not null,
    
    -- Optional preferred day of week (0=Sunday, 6=Saturday, NULL=no preference)
    preferred_day_of_week smallint check (
        preferred_day_of_week is null or 
        (preferred_day_of_week >= 0 and preferred_day_of_week <= 6)
    ),
    
    -- Task lifecycle tracking
    -- next_due_date: Calculated by application logic when task is created or actioned
    next_due_date date not null,
    
    -- Last action tracking (NULL = task never actioned)
    last_action_date date,
    last_action_type action_type,
    
    -- Audit timestamps (UTC)
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS on tasks (required for all tables in Supabase)
alter table tasks enable row level security;

-- ============================================================================
-- Section 3: Indexes
-- ============================================================================
-- Indexes are created to optimize the most common query patterns:
-- 1. Dashboard queries (overdue and upcoming tasks by user)
-- 2. Alphabetical sorting of user's task list

-- Composite index for dashboard queries
-- Supports: WHERE user_id = ? AND next_due_date < ? ORDER BY next_due_date
-- Use case: Finding overdue tasks and upcoming tasks within date ranges
create index idx_tasks_user_next_due on tasks(user_id, next_due_date);

-- Composite index for alphabetical sorting
-- Supports: WHERE user_id = ? ORDER BY title
-- Use case: Displaying user's task list sorted alphabetically
create index idx_tasks_user_title on tasks(user_id, title);

-- ============================================================================
-- Section 4: Functions and Triggers
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: update_updated_at_column
-- ----------------------------------------------------------------------------
-- Purpose: Automatically updates the updated_at timestamp on row modification
-- Used by: update_tasks_updated_at trigger on tasks table
-- 
-- This function is called by a BEFORE UPDATE trigger to ensure the updated_at
-- column always reflects the last modification time without manual intervention.
-- 
-- Security: Uses empty search_path to prevent search path injection attacks
-- ----------------------------------------------------------------------------
create or replace function update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    -- Set updated_at to current timestamp (UTC)
    new.updated_at = now();
    return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Trigger: update_tasks_updated_at
-- ----------------------------------------------------------------------------
-- Purpose: Automatically update updated_at timestamp when task is modified
-- Target: tasks table
-- Timing: BEFORE UPDATE (modifies NEW row before it's written)
-- ----------------------------------------------------------------------------
create trigger update_tasks_updated_at
    before update on tasks
    for each row
    execute function update_updated_at_column();

-- ============================================================================
-- Section 5: Row Level Security (RLS) Policies
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RLS Policies for: task_templates
-- ----------------------------------------------------------------------------
-- Security model: Public read access for all users (authenticated and anonymous)
-- Rationale: Templates are global resources used for onboarding and help pages
-- 
-- Note: Separate policies for 'anon' and 'authenticated' roles provide
-- granular control and clearer security model, even when logic is identical.
-- ----------------------------------------------------------------------------

-- Policy: Allow anonymous users to view all active templates
-- Role: anon (unauthenticated users)
-- Operation: SELECT
-- Condition: Always allow (returns true)
create policy task_templates_select_anon
    on task_templates
    for select
    to anon
    using (true);

-- Policy: Allow authenticated users to view all active templates
-- Role: authenticated (logged-in users)
-- Operation: SELECT
-- Condition: Always allow (returns true)
create policy task_templates_select_authenticated
    on task_templates
    for select
    to authenticated
    using (true);

-- Note: INSERT, UPDATE, DELETE operations on task_templates are not allowed
-- for regular users. These operations should be performed via direct database
-- access or admin tools for managing the global template catalog.

-- ----------------------------------------------------------------------------
-- RLS Policies for: tasks
-- ----------------------------------------------------------------------------
-- Security model: Users can only access their own tasks
-- Enforcement: auth.uid() must match tasks.user_id
-- Coverage: Full CRUD operations (SELECT, INSERT, UPDATE, DELETE)
-- 
-- Rationale: Each user's tasks are private and isolated. The user_id column
-- is compared against auth.uid() (current authenticated user's ID) to ensure
-- users cannot access or modify other users' data.
-- ----------------------------------------------------------------------------

-- Policy: Allow authenticated users to view their own tasks
-- Role: authenticated
-- Operation: SELECT
-- Condition: Current user's ID matches task's user_id
-- Performance: Uses subquery to evaluate auth.uid() once per query, not per row
create policy tasks_select_own
    on tasks
    for select
    to authenticated
    using ((select auth.uid()) = user_id);

-- Policy: Allow authenticated users to create tasks for themselves
-- Role: authenticated
-- Operation: INSERT
-- Condition: user_id in new row must match current user's ID
-- Performance: Uses subquery to evaluate auth.uid() once per query, not per row
-- Note: Prevents users from creating tasks assigned to other users
create policy tasks_insert_own
    on tasks
    for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

-- Policy: Allow authenticated users to update their own tasks
-- Role: authenticated
-- Operation: UPDATE
-- Condition: Current user's ID matches task's user_id
-- Performance: Uses subquery to evaluate auth.uid() once per query, not per row
-- Note: Users cannot transfer task ownership by changing user_id
create policy tasks_update_own
    on tasks
    for update
    to authenticated
    using ((select auth.uid()) = user_id);

-- Policy: Allow authenticated users to delete their own tasks
-- Role: authenticated
-- Operation: DELETE
-- Condition: Current user's ID matches task's user_id
-- Performance: Uses subquery to evaluate auth.uid() once per query, not per row
create policy tasks_delete_own
    on tasks
    for delete
    to authenticated
    using ((select auth.uid()) = user_id);

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- The Chronos database schema is now ready for use.
-- 
-- Next steps:
-- 1. Optionally seed task_templates with initial template data
-- 2. Test RLS policies with different user contexts
-- 3. Verify index performance with EXPLAIN ANALYZE on dashboard queries
-- ============================================================================

