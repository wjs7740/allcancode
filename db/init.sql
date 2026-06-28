select 'create database sub2api'
where not exists (select from pg_database where datname = 'sub2api')\gexec

create table if not exists app_users (
  id serial primary key,
  username varchar(64) not null unique,
  email varchar(255) not null unique,
  password_hash text not null,
  password_salt text not null,
  balance numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists api_keys (
  id serial primary key,
  user_id integer not null references app_users(id) on delete cascade,
  name varchar(120) not null,
  key_value varchar(120) not null unique,
  scope varchar(120) not null,
  quota_tokens integer not null,
  used_tokens integer not null default 0,
  status varchar(32) not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists usage_records (
  id serial primary key,
  user_id integer not null references app_users(id) on delete cascade,
  api_key_id integer references api_keys(id) on delete set null,
  model varchar(120) not null,
  endpoint varchar(255) not null,
  status_code integer not null,
  request_tokens integer not null,
  cost numeric(12, 2) not null,
  latency_ms integer not null,
  created_at timestamptz not null default now()
);

create table if not exists billing_records (
  id serial primary key,
  user_id integer not null references app_users(id) on delete cascade,
  type varchar(64) not null,
  amount numeric(12, 2) not null,
  status varchar(32) not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists payment_provider_instances (
  id serial primary key,
  provider_code varchar(64) not null unique,
  display_name varchar(120) not null,
  mode varchar(64) not null,
  endpoint text not null,
  merchant_id varchar(120) not null,
  secret_ref varchar(120) not null,
  enabled boolean not null default true,
  callback_config jsonb not null default '{}'::jsonb,
  extra_config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists payment_method_catalog (
  id serial primary key,
  method_code varchar(64) not null unique,
  method_name varchar(120) not null,
  icon varchar(64),
  enabled boolean not null default true,
  display_order integer not null default 0,
  client_support varchar(32) not null default 'web'
);

create table if not exists payment_method_bindings (
  id serial primary key,
  method_id integer not null references payment_method_catalog(id) on delete cascade,
  provider_instance_id integer not null references payment_provider_instances(id) on delete cascade,
  provider_method_code varchar(64) not null,
  priority integer not null default 1,
  enabled boolean not null default true,
  rule_json jsonb not null default '{}'::jsonb
);

create table if not exists recharge_orders (
  id serial primary key,
  user_id integer not null references app_users(id) on delete cascade,
  order_no varchar(64) not null unique,
  package_name varchar(120) not null,
  amount numeric(12, 2) not null,
  bonus_amount numeric(12, 2) not null default 0,
  method_code varchar(64) not null,
  status varchar(32) not null default 'pending',
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

insert into app_users (id, username, email, password_hash, password_salt, balance, created_at)
values
  (1, 'demo', 'demo@allcancode.local', 'c2142a447a7682bae313f9af95966714fe44ebcbf94a78c6b80f7a305b0594ad6e59f2526d227a0211d90a1f9da87509df56462808bfe7fb257792a682fc8ea4', 'demo-user-salt', 328.60, now() - interval '7 days')
on conflict (id) do nothing;

insert into payment_provider_instances (id, provider_code, display_name, mode, endpoint, merchant_id, secret_ref, callback_config, extra_config_json)
values
  (1, 'kyren_epay_main', 'Kyren Epay Compatibility', 'epay_compat', 'https://docs.kyren.top/epay/mapi.php', 'demo-pid', 'env:KYREN_EPAY_KEY', '{"notifyPath":"/api/app/payment/callback/kyren"}', '{"supports":["alipay","wxpay","creditcard","crypto","paynow"]}')
on conflict (id) do nothing;

insert into payment_method_catalog (id, method_code, method_name, icon, enabled, display_order, client_support)
values
  (1, 'alipay', 'Alipay', 'wallet', true, 10, 'web'),
  (2, 'wxpay', 'WeChat Pay', 'wechat', true, 20, 'web'),
  (3, 'creditcard', 'Credit Card', 'card', true, 30, 'web'),
  (4, 'crypto', 'Crypto', 'coins', true, 40, 'web'),
  (5, 'paynow', 'PayNow', 'sparkles', true, 50, 'web')
on conflict (id) do nothing;

insert into payment_method_bindings (id, method_id, provider_instance_id, provider_method_code, priority, enabled, rule_json)
values
  (1, 1, 1, 'alipay', 1, true, '{}'),
  (2, 2, 1, 'wxpay', 1, true, '{}'),
  (3, 3, 1, 'creditcard', 1, true, '{}'),
  (4, 4, 1, 'crypto', 1, true, '{}'),
  (5, 5, 1, 'paynow', 1, true, '{}')
on conflict (id) do nothing;

insert into api_keys (id, user_id, name, key_value, scope, quota_tokens, used_tokens, status, created_at)
values
  (1, 1, 'Production Router', 'ack_live_n97jqk4m8vw6', 'GPT / Claude', 2400000, 1720000, 'active', now() - interval '6 days'),
  (2, 1, 'Staging Lab', 'ack_test_v2pq8xr5nt31', 'Gemini / Codex', 800000, 304000, 'active', now() - interval '4 days'),
  (3, 1, 'Mobile Client', 'ack_live_zh72pl9xc0ab', 'All models', 1100000, 918000, 'disabled', now() - interval '2 days')
on conflict (id) do nothing;

insert into usage_records (user_id, api_key_id, model, endpoint, status_code, request_tokens, cost, latency_ms, created_at)
values
  (1, 1, 'gpt-5-fast', '/v1/chat/completions', 200, 18400, 2.18, 842, now() - interval '2 hours'),
  (1, 1, 'claude-sonnet-4-8', '/v1/messages', 200, 42100, 5.76, 1200, now() - interval '3 hours'),
  (1, 2, 'gemini-flash', '/v1/images/analyze', 200, 6800, 0.61, 688, now() - interval '4 hours'),
  (1, 3, 'gpt-5-mini', '/v1/responses', 429, 0, 0.00, 124, now() - interval '5 hours'),
  (1, 1, 'claude-haiku-4-6', '/v1/messages', 200, 9700, 0.92, 731, now() - interval '6 hours'),
  (1, 1, 'gpt-5-fast', '/v1/chat/completions', 200, 15200, 1.84, 704, now() - interval '1 day'),
  (1, 2, 'gemini-pro', '/v1/responses', 200, 8300, 0.78, 654, now() - interval '2 days'),
  (1, 1, 'claude-opus-4-8', '/v1/messages', 200, 51200, 6.62, 1430, now() - interval '3 days'),
  (1, 2, 'gpt-5-mini', '/v1/responses', 200, 9400, 0.81, 611, now() - interval '4 days'),
  (1, 1, 'gpt-5-fast', '/v1/chat/completions', 200, 20500, 2.47, 809, now() - interval '5 days'),
  (1, 1, 'claude-sonnet-4-8', '/v1/messages', 200, 33700, 4.18, 1088, now() - interval '6 days');

insert into billing_records (user_id, type, amount, status, description, created_at)
values
  (1, 'recharge', 216.00, 'completed', 'Recharge order AC20260601001 credited', now() - interval '6 days'),
  (1, 'usage', -5.76, 'completed', 'Claude Sonnet long-context request charge', now() - interval '3 hours'),
  (1, 'usage', -2.18, 'completed', 'GPT-5 Fast chat request charge', now() - interval '2 hours'),
  (1, 'manual_adjustment', 12.00, 'completed', 'Admin compensation credit', now() - interval '1 day'),
  (1, 'usage', -6.62, 'completed', 'Claude Opus request charge', now() - interval '3 days');

insert into recharge_orders (id, user_id, order_no, package_name, amount, bonus_amount, method_code, status, created_at, paid_at)
values
  (1, 1, 'AC20260601001', 'Team 200', 200.00, 16.00, 'alipay', 'paid', now() - interval '6 days', now() - interval '6 days'),
  (2, 1, 'AC20260615002', 'Starter 50', 50.00, 3.00, 'wxpay', 'paid', now() - interval '2 days', now() - interval '2 days'),
  (3, 1, 'AC20260626003', 'Scale 500', 500.00, 75.00, 'creditcard', 'pending', now() - interval '18 hours', null)
on conflict (id) do nothing;

select setval('app_users_id_seq', coalesce((select max(id) from app_users), 1), true);
select setval('api_keys_id_seq', coalesce((select max(id) from api_keys), 1), true);
select setval('usage_records_id_seq', coalesce((select max(id) from usage_records), 1), true);
select setval('billing_records_id_seq', coalesce((select max(id) from billing_records), 1), true);
select setval('payment_provider_instances_id_seq', coalesce((select max(id) from payment_provider_instances), 1), true);
select setval('payment_method_catalog_id_seq', coalesce((select max(id) from payment_method_catalog), 1), true);
select setval('payment_method_bindings_id_seq', coalesce((select max(id) from payment_method_bindings), 1), true);
select setval('recharge_orders_id_seq', coalesce((select max(id) from recharge_orders), 1), true);
