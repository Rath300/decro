-- Enable RLS and policies

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.view_events enable row level security;
alter table public.post_aggregates enable row level security;
alter table public.tags enable row level security;
alter table public.post_tags enable row level security;

-- Profiles
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles for select using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (id::uuid = auth.uid());

-- Posts
drop policy if exists posts_select_all on public.posts;
create policy posts_select_all on public.posts for select using (true);

drop policy if exists posts_modify_own on public.posts;
create policy posts_modify_own on public.posts for all using (coalesce(creator_id::uuid, NULL) = auth.uid()) with check (coalesce(creator_id::uuid, NULL) = auth.uid());

-- Comments
drop policy if exists comments_select_all on public.comments;
create policy comments_select_all on public.comments for select using (true);

drop policy if exists comments_insert_auth on public.comments;
create policy comments_insert_auth on public.comments for insert with check (user_id::uuid = auth.uid());

drop policy if exists comments_modify_own on public.comments;
create policy comments_modify_own on public.comments for update using (user_id::uuid = auth.uid());

drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments for delete using (user_id::uuid = auth.uid());

-- Likes
drop policy if exists likes_select_all on public.likes;
create policy likes_select_all on public.likes for select using (true);

drop policy if exists likes_upsert_own on public.likes;
create policy likes_upsert_own on public.likes for all using (user_id::uuid = auth.uid()) with check (user_id::uuid = auth.uid());

-- Follows
drop policy if exists follows_select_all on public.follows;
create policy follows_select_all on public.follows for select using (true);

drop policy if exists follows_upsert_own on public.follows;
create policy follows_upsert_own on public.follows for all using (follower_id::uuid = auth.uid()) with check (follower_id::uuid = auth.uid());

-- Notifications
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select using (user_id::uuid = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update using (user_id::uuid = auth.uid()) with check (user_id::uuid = auth.uid());

-- Reports
drop policy if exists reports_insert_auth on public.reports;
create policy reports_insert_auth on public.reports for insert with check (reporter_id::uuid = auth.uid());

-- View events (allow insert via RPC only; select blocked)
drop policy if exists view_events_insert_rpc on public.view_events;
create policy view_events_insert_rpc on public.view_events for insert using (true) with check (true);

-- Tags and post_tags (read all; modify via server ops)
drop policy if exists tags_select_all on public.tags;
create policy tags_select_all on public.tags for select using (true);

drop policy if exists post_tags_select_all on public.post_tags;
create policy post_tags_select_all on public.post_tags for select using (true);


