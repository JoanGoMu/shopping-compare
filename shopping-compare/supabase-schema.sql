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
  notes text,
  created_at timestamptz not null default now()
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

-- Row-level security: users can only see and modify their own data
alter table products enable row level security;
alter table comparison_groups enable row level security;
alter table comparison_items enable row level security;

create policy "Users can manage their own products"
  on products for all
  using (auth.uid() = user_id);

create policy "Users can manage their own groups"
  on comparison_groups for all
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
