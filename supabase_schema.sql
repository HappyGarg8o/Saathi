    -- Supabase Schema for Saathi App

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
create table public.users (
    id uuid references auth.users on delete cascade primary key,
    phone text unique not null,
    name text,
    avatar_url text,
    gender text check (gender in ('male', 'female', 'other')),
    is_blocked boolean default false,
    emergency_contact_name text,
    emergency_contact_phone text,
    created_at timestamptz default now()
);

-- COMPANIONS TABLE
create table public.companions (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    aadhaar_verified boolean default false,
    bio text,
    hourly_rate integer not null check (hourly_rate >= 299 and hourly_rate <= 2000),
    rating_avg numeric(3, 2) default 5.00,
    total_sessions integer default 0,
    is_active boolean default true,
    city text,
    service_radius_km integer default 10,
    created_at timestamptz default now()
);

-- BOOKINGS TABLE
create table public.bookings (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.users(id) on delete set null not null,
    companion_id uuid references public.companions(id) on delete set null not null,
    activity_type text not null check (activity_type in ('Coffee', 'Dinner', 'Movie', 'City Walk', 'Event Plus-One', 'Custom')),
    start_time timestamptz not null,
    duration_hours numeric(3, 1) not null check (duration_hours >= 1.0),
    meeting_point text not null,
    total_price integer not null,
    platform_fee integer not null,
    companion_payout integer not null,
    status text default 'pending' check (status in ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
    payment_id text,
    cancelled_by text,
    created_at timestamptz default now()
);

-- REVIEWS TABLE
create table public.reviews (
    id uuid default uuid_generate_v4() primary key,
    booking_id uuid references public.bookings(id) on delete cascade not null,
    reviewer_id uuid references public.users(id) on delete cascade not null,
    reviewee_id uuid references public.users(id) on delete cascade not null,
    stars integer not null check (stars >= 1 and stars <= 5),
    text text,
    created_at timestamptz default now()
);

-- SESSIONS TABLE
create table public.sessions (
    id uuid default uuid_generate_v4() primary key,
    booking_id uuid references public.bookings(id) on delete cascade not null,
    started_at timestamptz,
    ended_at timestamptz,
    sos_triggered boolean default false,
    created_at timestamptz default now()
);

-- MESSAGES TABLE (Chat is per-booking only)
create table public.messages (
    id uuid default uuid_generate_v4() primary key,
    booking_id uuid references public.bookings(id) on delete cascade not null,
    sender_id uuid references public.users(id) on delete set null not null,
    content text not null,
    created_at timestamptz default now()
);

-- COMPANION AVAILABILITY TABLE
create table public.companion_availability (
    id uuid default uuid_generate_v4() primary key,
    companion_id uuid references public.companions(id) on delete cascade not null,
    day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6), -- 0=Sunday, 6=Saturday
    start_hour integer not null check (start_hour >= 0 and start_hour <= 23),
    end_hour integer not null check (end_hour >= 0 and end_hour <= 23),
    is_open boolean default true,
    constraint check_hours check (start_hour < end_hour),
    unique(companion_id, day_of_week, start_hour)
);

-- INDEXES FOR PERFORMANCE
create index idx_companions_user_id on public.companions(user_id);
create index idx_bookings_user_id on public.bookings(user_id);
create index idx_bookings_companion_id on public.bookings(companion_id);
create index idx_messages_booking_id on public.messages(booking_id);
create index idx_reviews_booking_id on public.reviews(booking_id);
create index idx_availability_companion_id on public.companion_availability(companion_id);

-- ENABLE ROW LEVEL SECURITY (RLS)
alter table public.users enable row level security;
alter table public.companions enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;
alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.companion_availability enable row level security;

-- RLS POLICIES

-- Users Policies
create policy "Public profiles are viewable by authenticated users"
on public.users for select to authenticated using (true);

create policy "Users can update their own profile"
on public.users for update to authenticated using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.users for insert to authenticated with check (auth.uid() = id);

-- Companions Policies
create policy "Companions are viewable by authenticated users"
on public.companions for select to authenticated using (true);

create policy "Companions can update their own details"
on public.companions for update to authenticated using (
    user_id = auth.uid()
);

create policy "Companions can insert their own details"
on public.companions for insert to authenticated with check (
    user_id = auth.uid()
);

-- Bookings Policies
create policy "Booking participants can view their bookings"
on public.bookings for select to authenticated using (
    user_id = auth.uid() or 
    companion_id in (select id from public.companions where user_id = auth.uid())
);

create policy "Users can create bookings"
on public.bookings for insert to authenticated with check (
    user_id = auth.uid()
);

create policy "Booking participants can update bookings"
on public.bookings for update to authenticated using (
    user_id = auth.uid() or 
    companion_id in (select id from public.companions where user_id = auth.uid())
);

-- Reviews Policies
create policy "Reviews are viewable by authenticated users"
on public.reviews for select to authenticated using (true);

create policy "Booking participants can create reviews"
on public.reviews for insert to authenticated with check (
    reviewer_id = auth.uid() and
    exists (
        select 1 from public.bookings b
        where b.id = booking_id and (
            b.user_id = auth.uid() or 
            b.companion_id in (select id from public.companions where user_id = auth.uid())
        )
    )
);

-- Sessions Policies
create policy "Booking participants can view sessions"
on public.sessions for select to authenticated using (
    exists (
        select 1 from public.bookings b
        where b.id = booking_id and (
            b.user_id = auth.uid() or 
            b.companion_id in (select id from public.companions where user_id = auth.uid())
        )
    )
);

create policy "Booking participants can create sessions"
on public.sessions for insert to authenticated with check (
    exists (
        select 1 from public.bookings b
        where b.id = booking_id and (
            b.user_id = auth.uid() or 
            b.companion_id in (select id from public.companions where user_id = auth.uid())
        )
    )
);

create policy "Booking participants can update sessions"
on public.sessions for update to authenticated using (
    exists (
        select 1 from public.bookings b
        where b.id = booking_id and (
            b.user_id = auth.uid() or 
            b.companion_id in (select id from public.companions where user_id = auth.uid())
        )
    )
);

-- Messages Policies
create policy "Booking participants can view messages"
on public.messages for select to authenticated using (
    exists (
        select 1 from public.bookings b
        where b.id = booking_id and (
            b.user_id = auth.uid() or 
            b.companion_id in (select id from public.companions where user_id = auth.uid())
        )
    )
);

create policy "Booking participants can send messages"
on public.messages for insert to authenticated with check (
    sender_id = auth.uid() and
    exists (
        select 1 from public.bookings b
        where b.id = booking_id and (
            b.user_id = auth.uid() or 
            b.companion_id in (select id from public.companions where user_id = auth.uid())
        )
    )
);

-- Companion Availability Policies
create policy "Availability slots are viewable by authenticated users"
on public.companion_availability for select to authenticated using (true);

create policy "Companions can manage their own availability"
on public.companion_availability for all to authenticated using (
    companion_id in (select id from public.companions where user_id = auth.uid())
) with check (
    companion_id in (select id from public.companions where user_id = auth.uid())
);
