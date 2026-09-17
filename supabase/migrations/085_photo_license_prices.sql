-- Photographers can set their own price for each licence.
--
-- photos.price stays the Commercial price (or the only licence's price for editorial-only and
-- exclusive-only photos). license_prices holds the photographer's own Editorial, Extended and
-- Exclusive prices in GBP. NULL means NS CAPTURES works them out from photos.price
-- (Editorial 0.7x, Extended 2.4x, Exclusive 6x).
--
-- Photographers already update their own photos (price, title, category) under the existing
-- photos policies, so no new policy is needed.

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS license_prices jsonb;

COMMENT ON COLUMN public.photos.license_prices IS
  'Photographer-set licence prices in GBP, e.g. {"EDITORIAL":1050,"EXTENDED":3600,"EXCLUSIVE":9000}. NULL = automatic from price.';

NOTIFY pgrst, 'reload schema';
