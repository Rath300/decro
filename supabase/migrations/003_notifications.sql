-- Notification triggers for likes, comments, follows

create or replace function public.notify_like()
returns trigger language plpgsql as $$
declare v_owner uuid; v_username text;
begin
  select p.creator_id into v_owner from public.posts p where p.id = new.post_id;
  if v_owner is not null and v_owner <> new.user_id then
    select username into v_username from public.profiles where id = new.user_id;
    insert into public.notifications(user_id, type, actor_id, actor_username, post_id, message)
    values (v_owner, 'like', new.user_id, v_username, new.post_id, 'liked your post');
  end if;
  return null;
end; $$;

drop trigger if exists trg_notify_like on public.likes;
create trigger trg_notify_like
after insert on public.likes
for each row execute function public.notify_like();

create or replace function public.notify_comment()
returns trigger language plpgsql as $$
declare v_owner uuid; v_username text;
begin
  select p.creator_id into v_owner from public.posts p where p.id = new.post_id;
  if v_owner is not null and v_owner <> new.user_id then
    select username into v_username from public.profiles where id = new.user_id;
    insert into public.notifications(user_id, type, actor_id, actor_username, post_id, comment_id, message)
    values (v_owner, 'comment', new.user_id, v_username, new.post_id, new.id, 'commented on your post');
  end if;
  return null;
end; $$;

drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment
after insert on public.comments
for each row execute function public.notify_comment();

create or replace function public.notify_follow()
returns trigger language plpgsql as $$
declare v_username text;
begin
  select username into v_username from public.profiles where id = new.follower_id;
  insert into public.notifications(user_id, type, actor_id, actor_username, message)
  values (new.followee_id, 'follow', new.follower_id, v_username, 'started following you');
  return null;
end; $$;

drop trigger if exists trg_notify_follow on public.follows;
create trigger trg_notify_follow
after insert on public.follows
for each row execute function public.notify_follow();


