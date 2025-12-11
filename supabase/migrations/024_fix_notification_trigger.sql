-- Migration: Fix notification trigger for likes
-- Description: Handle NULL username and add better error handling
-- Date: 2024-12-11

-- Recreate notify_like function with NULL handling
create or replace function public.notify_like()
returns trigger 
language plpgsql 
security definer
set search_path = public
as $$
declare 
  v_owner uuid; 
  v_username text;
begin
  -- Get the post creator (who will receive the notification)
  select p.creator_id into v_owner 
  from public.posts p 
  where p.id = new.post_id;
  
  -- Only create notification if:
  -- 1. Post owner exists
  -- 2. Liker is not the owner (don't notify yourself)
  if v_owner is not null and v_owner <> new.user_id then
    -- Get the liker's username
    select username into v_username 
    from public.profiles 
    where id = new.user_id;
    
    -- Only insert notification if we have a valid username
    -- This prevents NULL constraint violations
    if v_username is not null and v_username <> '' then
      insert into public.notifications(
        user_id, 
        type, 
        actor_id, 
        actor_username, 
        post_id, 
        message
      )
      values (
        v_owner, 
        'like', 
        new.user_id, 
        v_username, 
        new.post_id, 
        'liked your post'
      );
    else
      -- Log warning but don't fail the like operation
      raise warning 'Skipping notification: username not found for user_id %', new.user_id;
    end if;
  end if;
  
  return null;
end;
$$;

-- Drop and recreate the trigger to ensure it uses the new function
drop trigger if exists trg_notify_like on public.likes;
create trigger trg_notify_like
after insert on public.likes
for each row execute function public.notify_like();

-- Add comment
comment on function public.notify_like is 'Creates notification when a post is liked. Handles NULL usernames gracefully.';
