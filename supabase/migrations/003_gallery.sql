-- Community photo gallery, backed by Supabase Storage.
-- Anyone may view; signed-in members may upload.

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- Public read + listing of gallery photos.
drop policy if exists "Gallery photos are publicly visible" on storage.objects;
create policy "Gallery photos are publicly visible"
  on storage.objects for select
  using (bucket_id = 'gallery');

-- Signed-in members may add photos.
drop policy if exists "Members can upload gallery photos" on storage.objects;
create policy "Members can upload gallery photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'gallery');
