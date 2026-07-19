-- Allow standard users to initialize their own photographer directory record upon upgrading to Creator
create policy "Photographers can insert own directory profile"
  on public.photographers for insert
  with check (id = (select slug from public.profiles where id = auth.uid() and role = 'Photographer'));
