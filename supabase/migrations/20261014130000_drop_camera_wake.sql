begin;

-- Camera wake is gone: a closed camera comes back by scanning the reconnect QR instead.
drop function if exists public.save_device_push(uuid, text, text, text);
drop function if exists public.claim_device_wake(uuid);
drop function if exists public.forget_device_push(uuid, text);
drop table if exists private.device_push_subscriptions;

commit;
