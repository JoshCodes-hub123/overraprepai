
ALTER TABLE public.referral_rewards ALTER COLUMN referee_tokens SET DEFAULT 1;

CREATE OR REPLACE FUNCTION public.credit_tokens_for_purchase(
  p_user_id uuid, p_paddle_transaction_id text, p_price_id text,
  p_tokens integer, p_amount_cents integer, p_currency text, p_environment text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  v_purchase_id uuid;
  v_wallet_id uuid;
  v_prior_purchases int;
  v_reward record;
  v_referrer_wallet uuid;
begin
  select id into v_purchase_id from public.token_purchases
    where paddle_transaction_id = p_paddle_transaction_id;
  if v_purchase_id is not null then
    return v_purchase_id;
  end if;

  select id into v_wallet_id from public.token_wallets where user_id = p_user_id;
  if v_wallet_id is null then
    insert into public.token_wallets (user_id, balance) values (p_user_id, 0)
      returning id into v_wallet_id;
  end if;

  select count(*) into v_prior_purchases
    from public.token_purchases where user_id = p_user_id and status = 'completed';

  insert into public.token_purchases (
    user_id, paddle_transaction_id, price_id, tokens_credited,
    amount_cents, currency, environment, status
  ) values (
    p_user_id, p_paddle_transaction_id, p_price_id, p_tokens,
    p_amount_cents, p_currency, p_environment, 'completed'
  ) returning id into v_purchase_id;

  update public.token_wallets
    set balance = balance + p_tokens,
        total_earned = total_earned + p_tokens,
        updated_at = now()
    where id = v_wallet_id;

  insert into public.token_transactions (wallet_id, amount, type, description, reference_id)
    values (v_wallet_id, p_tokens, 'credit',
            'Token purchase (' || p_tokens || ' tokens)', v_purchase_id);

  insert into public.notifications (user_id, title, message, type, link)
    values (p_user_id, 'Tokens credited',
            p_tokens || ' tokens added to your wallet.', 'success', '/wallet');

  -- Referral payout on FIRST purchase only
  if v_prior_purchases = 0 then
    select * into v_reward from public.referral_rewards
      where referee_id = p_user_id and status = 'pending' limit 1;

    if found then
      -- Referrer bonus
      select id into v_referrer_wallet from public.token_wallets where user_id = v_reward.referrer_id;
      if v_referrer_wallet is null then
        insert into public.token_wallets (user_id, balance) values (v_reward.referrer_id, 0)
          returning id into v_referrer_wallet;
      end if;

      update public.token_wallets
        set balance = balance + v_reward.referrer_tokens,
            total_earned = total_earned + v_reward.referrer_tokens,
            updated_at = now()
        where id = v_referrer_wallet;

      insert into public.token_transactions (wallet_id, amount, type, description, reference_id)
        values (v_referrer_wallet, v_reward.referrer_tokens, 'referral_bonus',
                'Referral bonus — your invite made their first purchase', v_reward.id);

      insert into public.notifications (user_id, title, message, type, link)
        values (v_reward.referrer_id, 'Referral reward!',
                'You earned ' || v_reward.referrer_tokens || ' tokens — a friend you invited just topped up.',
                'success', '/referrals');

      -- Referee welcome bonus
      if v_reward.referee_tokens > 0 then
        update public.token_wallets
          set balance = balance + v_reward.referee_tokens,
              total_earned = total_earned + v_reward.referee_tokens,
              updated_at = now()
          where id = v_wallet_id;

        insert into public.token_transactions (wallet_id, amount, type, description, reference_id)
          values (v_wallet_id, v_reward.referee_tokens, 'referral_bonus',
                  'Welcome bonus for using a referral code', v_reward.id);

        insert into public.notifications (user_id, title, message, type, link)
          values (p_user_id, 'Welcome bonus!',
                  'You got ' || v_reward.referee_tokens || ' bonus tokens for using a referral code.',
                  'success', '/wallet');
      end if;

      update public.referral_rewards
        set status = 'completed', completed_at = now()
        where id = v_reward.id;
    end if;
  end if;

  return v_purchase_id;
end;
$function$;
