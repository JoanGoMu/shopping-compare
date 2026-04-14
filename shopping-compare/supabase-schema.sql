-- Run this in the Supabase SQL editor to set up the database schema.

-- Products table: stores individual saved products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  price numeric(10, 2),
  currency text not null default 'USD',
  image_url text,
  product_url text not null,
  store_name text not null,
  store_domain text not null,
  specs jsonb not null default '{}',
  images text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  previous_price numeric(10, 2),
  price_updated_at timestamptz,
  last_checked_at timestamptz,
  price_check_failed boolean not null default false,
  price_alerts boolean not null default false
);

-- Comparison groups: named sets of products to compare
create table if not exists comparison_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- Comparison items: links products to groups
create table if not exists comparison_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references comparison_groups(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  position integer not null default 0,
  unique(group_id, product_id)
);

-- User preferences: notification settings
create table if not exists user_preferences (
  user_id uuid references auth.users(id) on delete cascade primary key,
  price_alerts boolean not null default true,
  created_at timestamptz not null default now()
);

-- Shared comparisons: public snapshots of product comparisons
create table if not exists shared_comparisons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  group_id uuid references comparison_groups(id) on delete cascade,
  title text not null,
  products jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  view_count integer not null default 0
);

-- Referrals: tracks who referred whom
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references auth.users(id) on delete cascade not null,
  referred_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique(referred_id)
);

-- Feedback: user-submitted feedback and bug reports
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  category text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Row-level security: users can only see and modify their own data
alter table products enable row level security;
alter table comparison_groups enable row level security;
alter table comparison_items enable row level security;
alter table user_preferences enable row level security;
alter table shared_comparisons enable row level security;
alter table feedback enable row level security;

create policy "Users can manage their own products"
  on products for all
  using (auth.uid() = user_id);

create policy "Users can manage their own groups"
  on comparison_groups for all
  using (auth.uid() = user_id);

create policy "Users can manage their own preferences"
  on user_preferences for all
  using (auth.uid() = user_id);

create policy "Users can manage items in their own groups"
  on comparison_items for all
  using (
    exists (
      select 1 from comparison_groups
      where comparison_groups.id = comparison_items.group_id
        and comparison_groups.user_id = auth.uid()
    )
  );

create policy "Anyone can view shared comparisons"
  on shared_comparisons for select
  using (true);

create policy "Users can manage their own shared comparisons"
  on shared_comparisons for all
  using (auth.uid() = user_id);

alter table referrals enable row level security;

create policy "Users can read their own referrals"
  on referrals for select
  using (auth.uid() = referrer_id);

create policy "Authenticated users can insert referrals"
  on referrals for insert
  with check (auth.uid() = referred_id);

create policy "Anyone can submit feedback"
  on feedback for insert
  with check (true);
