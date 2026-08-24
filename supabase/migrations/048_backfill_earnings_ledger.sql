-- ============================================================
-- 048_backfill_earnings_ledger.sql
--
-- Earnings read £0 for everyone while real balances sat in payout_balance.
--
-- contributor_earnings only came into existence with 034, so it holds nothing
-- for money credited before then — and the dashboard and Earnings page read
-- the ledger. A contributor with £235,200 was being shown "Available £0,
-- Lifetime £0", which is worse than showing nothing at all.
--
-- balance_adjustments has the whole history: 85 rows of every credit and debit
-- ever applied. This rebuilds the ledger from it, so the itemisation matches
-- the balance instead of contradicting it.
--
-- Only positive adjustments become earnings; the negatives are payouts, and
-- they are reflected by marking the oldest earnings paid, oldest first, up to
-- whatever has already left. No balance is touched — this is bookkeeping
-- catching up with money that already moved.
-- ============================================================

DO $$
DECLARE
  person      record;
  adj         record;
  credited    numeric;
  paid_out    numeric;
  running     numeric;
  entry_type  text;
  entry_state text;
BEGIN
  FOR person IN
    SELECT p.id, p.payout_balance
    FROM public.profiles p
    WHERE EXISTS (SELECT 1 FROM public.balance_adjustments b WHERE b.user_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.contributor_earnings e WHERE e.user_id = p.id)
  LOOP
    SELECT COALESCE(sum(amount), 0) INTO credited
    FROM public.balance_adjustments
    WHERE user_id = person.id AND amount > 0;

    -- Anything credited that is no longer in the balance has been paid out.
    paid_out := GREATEST(credited - COALESCE(person.payout_balance, 0), 0);
    running := 0;

    FOR adj IN
      SELECT amount, reason, created_at
      FROM public.balance_adjustments
      WHERE user_id = person.id AND amount > 0
      ORDER BY created_at
    LOOP
      entry_type := CASE
        WHEN adj.reason ILIKE '%sale approved%' OR adj.reason ILIKE '%licence%'
          OR adj.reason ILIKE '%license%' THEN 'licensing'
        WHEN adj.reason ILIKE '%acquisition%' THEN 'acquisition'
        WHEN adj.reason ILIKE '%bonus%' THEN 'bonus'
        WHEN adj.reason ILIKE '%award%' THEN 'award'
        ELSE 'adjustment'
      END;

      -- Oldest money is the money that already went out.
      IF running + adj.amount <= paid_out THEN
        entry_state := 'paid';
      ELSE
        entry_state := 'available';
      END IF;
      running := running + adj.amount;

      INSERT INTO public.contributor_earnings (
        user_id, type, status, description,
        gross_amount, platform_fee, net_amount,
        created_at, available_at, paid_at
      )
      VALUES (
        person.id, entry_type, entry_state,
        COALESCE(adj.reason, 'Earning'),
        adj.amount, 0, adj.amount,
        adj.created_at, adj.created_at,
        CASE WHEN entry_state = 'paid' THEN adj.created_at ELSE NULL END
      );
    END LOOP;

    RAISE NOTICE 'ledger rebuilt for %: credited %, balance %, marked paid %',
      person.id, credited, person.payout_balance, paid_out;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
