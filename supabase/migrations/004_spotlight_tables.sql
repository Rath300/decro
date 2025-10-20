-- Spotlight Collections and Items Tables
-- Create tables for spotlight functionality

-- Spotlight Collections Table
create table if not exists public.spotlight_collections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_image_url text,
  is_featured boolean default false,
  created_by text references auth.users(id) on delete set null,
  creator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Spotlight Items Table (junction table for posts in spotlights)
create table if not exists public.spotlight_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.spotlight_collections(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  order_index integer default 0,
  created_at timestamptz default now(),
  unique(collection_id, post_id)
);

-- Enable RLS
alter table public.spotlight_collections enable row level security;
alter table public.spotlight_items enable row level security;

-- Create indexes
create index if not exists idx_spotlight_collections_creator_id on public.spotlight_collections(creator_id);
create index if not exists idx_spotlight_collections_created_at on public.spotlight_collections(created_at desc);
create index if not exists idx_spotlight_items_collection_id on public.spotlight_items(collection_id);
create index if not exists idx_spotlight_items_post_id on public.spotlight_items(post_id);
create index if not exists idx_spotlight_items_order on public.spotlight_items(collection_id, order_index);

-- RLS Policies for spotlight_collections
create policy "spotlight_collections_select_all" on public.spotlight_collections for select using (true);
create policy "spotlight_collections_insert_own" on public.spotlight_collections for insert with check (
  exists (
    select 1 from public.profiles 
    where id = creator_id and external_id = auth.uid()
  )
);
create policy "spotlight_collections_update_own" on public.spotlight_collections for update using (
  exists (
    select 1 from public.profiles 
    where id = creator_id and external_id = auth.uid()
  )
);
create policy "spotlight_collections_delete_own" on public.spotlight_collections for delete using (
  exists (
    select 1 from public.profiles 
    where id = creator_id and external_id = auth.uid()
  )
);

-- RLS Policies for spotlight_items
create policy "spotlight_items_select_all" on public.spotlight_items for select using (true);
create policy "spotlight_items_insert_own" on public.spotlight_items for insert with check (
  exists (
    select 1 from public.spotlight_collections sc
    join public.profiles p on p.id = sc.creator_id
    where sc.id = collection_id and p.external_id = auth.uid()
  )
);
create policy "spotlight_items_delete_own" on public.spotlight_items for delete using (
  exists (
    select 1 from public.spotlight_collections sc
    join public.profiles p on p.id = sc.creator_id
    where sc.id = collection_id and p.external_id = auth.uid()
  )
);

-- Function to create spotlight collection with items
create or replace function public.create_spotlight_collection_ext_with_items(
  title_param text,
  description_param text,
  cover_image_url_param text,
  external_id_param text,
  post_ids_param uuid[]
)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_profile_id uuid;
  v_collection_id uuid;
  v_post_id uuid;
  v_order_index integer := 0;
begin
  -- Get profile ID from external ID
  select id into v_profile_id 
  from public.profiles 
  where external_id = external_id_param;
  
  if v_profile_id is null then
    return json_build_object('success', false, 'error', 'Profile not found');
  end if;

  -- Insert spotlight collection with explicit column list to avoid "INSERT has more target columns than expressions"
  insert into public.spotlight_collections (
    title,
    description,
    cover_image_url,
    created_by,
    creator_id
  ) values (
    title_param,
    description_param,
    cover_image_url_param,
    external_id_param,
    v_profile_id
  ) returning id into v_collection_id;

  -- Insert spotlight items if any post IDs provided
  if array_length(post_ids_param, 1) > 0 then
    foreach v_post_id in array post_ids_param
    loop
      insert into public.spotlight_items (
        collection_id,
        post_id,
        order_index
      ) values (
        v_collection_id,
        v_post_id,
        v_order_index
      );
      v_order_index := v_order_index + 1;
    end loop;
  end if;

  return json_build_object('success', true, 'collection_id', v_collection_id);
end;
$$;
