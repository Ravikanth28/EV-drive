-- Database schema for EV Fleet Dashboard auth integration

-- 1. Table for confirmed user profiles (Admins and Drivers)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
    user_id TEXT NOT NULL, -- Admin ID (e.g. A001) or Driver ID (e.g. 4)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Table to store temporary user registration details during SMTP OTP verification
CREATE TABLE IF NOT EXISTS public.pending_users (
    email TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'driver')),
    user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to profiles (useful for looking up email via user_id during login)
CREATE POLICY "Allow public read access" ON public.profiles
    FOR SELECT USING (true);

-- Allow authenticated users to update their own profile
CREATE POLICY "Allow individual updates" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Allow service_role (backend) to perform all actions
CREATE POLICY "Allow full admin control" ON public.profiles
    USING (true) WITH CHECK (true);

-- Enable RLS on pending_users
ALTER TABLE public.pending_users ENABLE ROW LEVEL SECURITY;

-- Allow service_role (backend) full control on pending_users
CREATE POLICY "Allow backend control" ON public.pending_users
    USING (true) WITH CHECK (true);
