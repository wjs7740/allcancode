#!/bin/sh
set -eu

SUB2API_URL="${SUB2API_URL:-http://sub2api:8080}"
ADMIN_EMAIL="${SUB2API_ADMIN_EMAIL:-admin@allcancode.local}"
ADMIN_PASSWORD="${SUB2API_ADMIN_PASSWORD:-admin123456}"
PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGDATABASE="${PGDATABASE:-sub2api}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD="${PGPASSWORD:-postgres}"

wait_for_http() {
  url="$1"
  attempts="${2:-60}"
  i=0
  while [ "$i" -lt "$attempts" ]; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "Timed out waiting for $url" >&2
  return 1
}

upsert_setting() {
  key="$1"
  value="$2"
  psql "postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}" \
    -v ON_ERROR_STOP=1 \
    -c "insert into settings(key, value, updated_at) values ('${key}', '${value}', now()) on conflict (key) do update set value = excluded.value, updated_at = now();"
}

wait_for_http "${SUB2API_URL}/health" 90

LOGIN_PAYLOAD=$(jq -nc --arg email "$ADMIN_EMAIL" --arg password "$ADMIN_PASSWORD" '{email:$email,password:$password}')
LOGIN_RESPONSE=$(curl -fsS -X POST "${SUB2API_URL}/api/v1/auth/login" -H "Content-Type: application/json" -d "$LOGIN_PAYLOAD")
ADMIN_TOKEN=$(printf '%s' "$LOGIN_RESPONSE" | jq -r '.data.access_token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "Failed to obtain admin access token." >&2
  exit 1
fi

COMPLIANCE_PAYLOAD=$(jq -nc '{
  phrase: "I have read, understood, and agree to the Sub2API Deployment and Operation Compliance Commitment",
  language: "en"
}')

curl -fsS -X POST "${SUB2API_URL}/api/v1/admin/compliance/accept" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$COMPLIANCE_PAYLOAD" >/dev/null

PROVIDERS_RESPONSE=$(curl -fsS "${SUB2API_URL}/api/v1/admin/payment/providers" -H "Authorization: Bearer ${ADMIN_TOKEN}")
PROVIDER_ID=$(printf '%s' "$PROVIDERS_RESPONSE" | jq -r '.data[]? | select(.provider_key == "easypay" and .name == "Local EasyPay Mock") | .id' | head -n 1)

PROVIDER_PAYLOAD=$(jq -nc \
  --arg apiBase "http://kyren-mock:9000" \
  --arg notifyUrl "http://allcancode-api:3001/api/app/payment/callback/sub2api" \
  --arg returnUrl "${PUBLIC_BASE_URL:-http://localhost:8080}/payment/result" \
  --arg pid "${MOCK_EASYPAY_PID:-demo-pid}" \
  --arg pkey "${MOCK_EASYPAY_PKEY:-demo-pkey}" \
  '{
    provider_key: "easypay",
    name: "Local EasyPay Mock",
    config: {
      apiBase: $apiBase,
      notifyUrl: $notifyUrl,
      returnUrl: $returnUrl,
      pid: $pid,
      pkey: $pkey
    },
    supported_types: ["alipay", "wxpay"],
    enabled: true,
    payment_mode: "qrcode",
    sort_order: 10,
    limits: "{\"alipay\":{\"singleMin\":1,\"singleMax\":1000},\"wxpay\":{\"singleMin\":1,\"singleMax\":1000}}",
    refund_enabled: false,
    allow_user_refund: false
  }')

if [ -n "$PROVIDER_ID" ] && [ "$PROVIDER_ID" != "null" ]; then
  curl -fsS -X PUT "${SUB2API_URL}/api/v1/admin/payment/providers/${PROVIDER_ID}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PROVIDER_PAYLOAD" >/dev/null
else
  curl -fsS -X POST "${SUB2API_URL}/api/v1/admin/payment/providers" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$PROVIDER_PAYLOAD" >/dev/null
fi

upsert_setting "registration_enabled" "true"
upsert_setting "payment_enabled" "true"
upsert_setting "MIN_RECHARGE_AMOUNT" "1.00"
upsert_setting "MAX_RECHARGE_AMOUNT" "1000.00"
upsert_setting "DAILY_RECHARGE_LIMIT" "0.00"
upsert_setting "ORDER_TIMEOUT_MINUTES" "30"
upsert_setting "MAX_PENDING_ORDERS" "5"
upsert_setting "ENABLED_PAYMENT_TYPES" "alipay,wxpay"
upsert_setting "BALANCE_PAYMENT_DISABLED" "false"
upsert_setting "BALANCE_RECHARGE_MULTIPLIER" "1.00"
upsert_setting "RECHARGE_FEE_RATE" "0.00"
upsert_setting "PAYMENT_HELP_TEXT" "Local Docker payment demo is enabled through the bundled EasyPay mock provider."
upsert_setting "payment_visible_method_alipay_enabled" "true"
upsert_setting "payment_visible_method_alipay_source" "easypay_alipay"
upsert_setting "payment_visible_method_wxpay_enabled" "true"
upsert_setting "payment_visible_method_wxpay_source" "easypay_wxpay"

echo "sub2api bootstrap completed."
