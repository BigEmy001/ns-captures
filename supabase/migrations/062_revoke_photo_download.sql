-- Take back the download a rejected purchase counted.
--
-- The download counter increments at checkout, when the buyer submits payment.
-- If an admin later rejects that payment, rejectPurchase() cancels the
-- photographer's pending earning but leaves the download on the photograph
-- for good. The sale never happened, so the download should not stand either.
--
-- Only an admin can call this. A plain `adjust_photo_downloads` granted to
-- authenticated would let any signed-in user drive a competitor's counter down.

create or replace function public.revoke_photo_download(p_photo_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.caller_is_admin() then
    raise exception 'only an admin may revoke a download';
  end if;

  update public.photos
     set downloads = greatest(coalesce(downloads, 0) - 1, 0)
   where id = p_photo_id;
end;
$$;

revoke all on function public.revoke_photo_download(text) from public;
grant execute on function public.revoke_photo_download(text) to authenticated;
