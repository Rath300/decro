-- Complete notification system implementation
-- Adds missing tables, columns, and triggers for comprehensive notifications

-- Add missing columns to comments table for replies
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
alter table public.comments add column if not exists updated_at timestamptz default now();
alter table public.comments add column if not exists vote_score integer default 0;
alter table public.comments add column if not exists reply_count integer default 0;

-- Create comment_votes table for comment likes
create table if not exists public.comment_votes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote integer not null check (vote in (-1, 1)), -- -1 for dislike, 1 for like
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(comment_id, user_id)
);

-- Create profile_views table for tracking profile views
create table if not exists public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewed_profile_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid references public.profiles(id) on delete set null, -- null for anonymous views
  created_at timestamptz default now()
);

-- Enable RLS on new tables
alter table public.comment_votes enable row level security;
alter table public.profile_views enable row level security;

-- RLS policies for comment_votes
create policy "comment_votes_select_all" on public.comment_votes for select using (true);
create policy "comment_votes_insert_auth" on public.comment_votes for insert with check (
  exists (
    select 1 from public.profiles 
    where id = user_id and external_id = auth.uid()::text
  )
);
create policy "comment_votes_delete_own" on public.comment_votes for delete using (
  exists (
    select 1 from public.profiles 
    where id = user_id and external_id = auth.uid()::text
  )
);

-- RLS policies for profile_views
create policy "profile_views_select_all" on public.profile_views for select using (true);
create policy "profile_views_insert_auth" on public.profile_views for insert with check (true);

-- Function to handle comment vote updates and aggregates
create or replace function public.update_comment_votes()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.comments 
    set vote_score = vote_score + new.vote,
        updated_at = now()
    where id = new.comment_id;
  elsif tg_op = 'UPDATE' then
    update public.comments 
    set vote_score = vote_score - old.vote + new.vote,
        updated_at = now()
    where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.comments 
    set vote_score = vote_score - old.vote,
        updated_at = now()
    where id = old.comment_id;
  end if;
  return coalesce(new, old);
end; $$;

-- Trigger for comment vote updates
drop trigger if exists trg_comment_votes_ins on public.comment_votes;
create trigger trg_comment_votes_ins
after insert on public.comment_votes
for each row execute function public.update_comment_votes();

drop trigger if exists trg_comment_votes_upd on public.comment_votes;
create trigger trg_comment_votes_upd
after update on public.comment_votes
for each row execute function public.update_comment_votes();

drop trigger if exists trg_comment_votes_del on public.comment_votes;
create trigger trg_comment_votes_del
after delete on public.comment_votes
for each row execute function public.update_comment_votes();

-- Function to update comment reply count
create or replace function public.update_comment_reply_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.parent_id is not null then
    update public.comments 
    set reply_count = reply_count + 1,
        updated_at = now()
    where id = new.parent_id;
  elsif tg_op = 'DELETE' and old.parent_id is not null then
    update public.comments 
    set reply_count = greatest(0, reply_count - 1),
        updated_at = now()
    where id = old.parent_id;
  end if;
  return coalesce(new, old);
end; $$;

-- Trigger for comment reply count
drop trigger if exists trg_comments_reply_count_ins on public.comments;
create trigger trg_comments_reply_count_ins
after insert on public.comments
for each row execute function public.update_comment_reply_count();

drop trigger if exists trg_comments_reply_count_del on public.comments;
create trigger trg_comments_reply_count_del
after delete on public.comments
for each row execute function public.update_comment_reply_count();

-- Notification trigger for replies
create or replace function public.notify_new_reply()
returns trigger language plpgsql as $$
declare v_owner uuid; v_username text; v_parent_username text;
begin
  -- Only notify if this is a reply (has parent_id) and the parent comment owner is different
  if new.parent_id is not null then
    select user_id, (
      select username from public.profiles where id = user_id
    ) into v_owner, v_parent_username
    from public.comments where id = new.parent_id;
    
    if v_owner is not null and v_owner <> new.user_id then
      select username into v_username from public.profiles where id = new.user_id;
      insert into public.notifications(user_id, type, actor_id, actor_username, post_id, comment_id, message)
      values (v_owner, 'reply', new.user_id, v_username, new.post_id, new.id, 
              format('replied to your comment'));
    end if;
  end if;
  return new;
end; $$;

-- Trigger for reply notifications
drop trigger if exists trg_notify_new_reply on public.comments;
create trigger trg_notify_new_reply
after insert on public.comments
for each row execute function public.notify_new_reply();

-- Notification trigger for comment likes
create or replace function public.notify_comment_like()
returns trigger language plpgsql as $$
declare v_owner uuid; v_username text;
begin
  if new.vote = 1 then -- only notify for likes, not dislikes
    select user_id, (
      select username from public.profiles where id = user_id
    ) into v_owner, v_username
    from public.comments where id = new.comment_id;
    
    if v_owner is not null and v_owner <> new.user_id then
      select username into v_username from public.profiles where id = new.user_id;
      insert into public.notifications(user_id, type, actor_id, actor_username, comment_id, message)
      values (v_owner, 'comment_like', new.user_id, v_username, new.comment_id, 'liked your comment');
    end if;
  end if;
  return new;
end; $$;

-- Trigger for comment like notifications
drop trigger if exists trg_notify_comment_like on public.comment_votes;
create trigger trg_notify_comment_like
after insert on public.comment_votes
for each row execute function public.notify_comment_like();

-- Notification trigger for profile views
create or replace function public.notify_profile_view()
returns trigger language plpgsql as $$
declare v_username text;
begin
  -- Only notify if the viewer is different from the viewed profile and viewer is authenticated
  if new.viewer_id is not null and new.viewer_id <> new.viewed_profile_id then
    select username into v_username from public.profiles where id = new.viewer_id;
    
    -- Only create one notification per day per viewer to avoid spam
    if not exists (
      select 1 from public.notifications 
      where user_id = new.viewed_profile_id 
        and actor_id = new.viewer_id 
        and type = 'profile_view' 
        and created_at > now() - interval '1 day'
    ) then
      insert into public.notifications(user_id, type, actor_id, actor_username, message)
      values (new.viewed_profile_id, 'profile_view', new.viewer_id, v_username, 'viewed your profile');
    end if;
  end if;
  return new;
end; $$;

-- Trigger for profile view notifications
drop trigger if exists trg_notify_profile_view on public.profile_views;
create trigger trg_notify_profile_view
after insert on public.profile_views
for each row execute function public.notify_profile_view();

-- Update existing comment and follow notification functions to use proper external_id mapping
create or replace function public.notify_comment()
returns trigger language plpgsql as $$
declare v_owner uuid; v_username text;
begin
  select p.creator_id into v_owner from public.posts p where p.id = new.post_id;
  if v_owner is not null and v_owner <> new.user_id then
    -- Get username from profiles table using the user_id
    select username into v_username from public.profiles where id = new.user_id;
    insert into public.notifications(user_id, type, actor_id, actor_username, post_id, comment_id, message)
    values (v_owner, 'comment', new.user_id, v_username, new.post_id, new.id, 'commented on your post');
  end if;
  return null;
end; $$;

create or replace function public.notify_like()
returns trigger language plpgsql as $$
declare v_owner uuid; v_username text;
begin
  select p.creator_id into v_owner from public.posts p where p.id = new.post_id;
  if v_owner is not null and v_owner <> new.user_id then
    -- Get username from profiles table using the user_id
    select username into v_username from public.profiles where id = new.user_id;
    insert into public.notifications(user_id, type, actor_id, actor_username, post_id, message)
    values (v_owner, 'like', new.user_id, v_username, new.post_id, 'liked your post');
  end if;
  return null;
end; $$;

create or replace function public.notify_follow()
returns trigger language plpgsql as $$
declare v_username text;
begin
  select username into v_username from public.profiles where id = new.follower_id;
  insert into public.notifications(user_id, type, actor_id, actor_username, message)
  values (new.followee_id, 'follow', new.follower_id, v_username, 'started following you');
  return null;
end; $$;

-- Create indexes for better performance
create index if not exists idx_comments_parent_id on public.comments(parent_id);
create index if not exists idx_comment_votes_comment_id on public.comment_votes(comment_id);
create index if not exists idx_comment_votes_user_id on public.comment_votes(user_id);
create index if not exists idx_profile_views_viewed_profile_id on public.profile_views(viewed_profile_id);
create index if not exists idx_profile_views_viewer_id on public.profile_views(viewer_id);
