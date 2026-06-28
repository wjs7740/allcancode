#!/bin/sh
set -eu

SUB2API_URL="${SUB2API_URL:-http://sub2api:8080}"
ADMIN_EMAIL="${SUB2API_ADMIN_EMAIL:-admin@allcancode.local}"
ADMIN_PASSWORD="${SUB2API_ADMIN_PASSWORD:-admin123456}"
DEMO_EMAIL="${DEMO_USER_EMAIL:-demo@allcancode.local}"
DEMO_PASSWORD="${DEMO_USER_PASSWORD:-demo123456}"
DEMO_USERNAME="${DEMO_USER_USERNAME:-demo}"
KYREN_API_BASE="${KYREN_EASYPAY_API_BASE:-http://kyren-mock:9000}"
KYREN_PROVIDER_NAME="${KYREN_EASYPAY_PROVIDER_NAME:-Kyren EasyPay}"
KYREN_PID="${KYREN_EASYPAY_PID:-${MOCK_EASYPAY_PID:-demo-pid}}"
KYREN_PKEY="${KYREN_EASYPAY_PKEY:-${MOCK_EASYPAY_PKEY:-demo-pkey}}"
KYREN_PAYMENT_MODE="${KYREN_EASYPAY_PAYMENT_MODE:-qrcode}"
KYREN_PAYMENT_TYPES="${KYREN_EASYPAY_TYPES:-alipay,wxpay,creditcard,crypto,paynow}"
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
PROVIDER_ID=$(printf '%s' "$PROVIDERS_RESPONSE" | jq -r '.data[]? | select(.provider_key == "easypay" and (.name == "Kyren EasyPay" or .name == "Local EasyPay Mock")) | .id' | head -n 1)

PROVIDER_PAYLOAD=$(jq -nc \
  --arg name "$KYREN_PROVIDER_NAME" \
  --arg apiBase "$KYREN_API_BASE" \
  --arg notifyUrl "http://allcancode-api:3001/api/app/payment/callback/sub2api" \
  --arg returnUrl "${PUBLIC_BASE_URL:-http://localhost:8080}/payment/result" \
  --arg pid "$KYREN_PID" \
  --arg pkey "$KYREN_PKEY" \
  --argjson supportedTypes "$(printf '%s' "$KYREN_PAYMENT_TYPES" | jq -R 'split(",") | map(gsub("^\\s+|\\s+$"; "")) | map(select(length > 0))')" \
  --arg paymentMode "$KYREN_PAYMENT_MODE" \
  '{
    provider_key: "easypay",
    name: $name,
    config: {
      apiBase: $apiBase,
      notifyUrl: $notifyUrl,
      returnUrl: $returnUrl,
      pid: $pid,
      pkey: $pkey
    },
    supported_types: $supportedTypes,
    enabled: true,
    payment_mode: $paymentMode,
    sort_order: 10,
    limits: "{\"alipay\":{\"singleMin\":1,\"singleMax\":1000},\"wxpay\":{\"singleMin\":1,\"singleMax\":1000},\"creditcard\":{\"singleMin\":1,\"singleMax\":1000},\"crypto\":{\"singleMin\":1,\"singleMax\":1000},\"paynow\":{\"singleMin\":1,\"singleMax\":1000}}",
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
upsert_setting "ENABLED_PAYMENT_TYPES" "$KYREN_PAYMENT_TYPES"
upsert_setting "BALANCE_PAYMENT_DISABLED" "false"
upsert_setting "BALANCE_RECHARGE_MULTIPLIER" "1.00"
upsert_setting "RECHARGE_FEE_RATE" "0.00"
upsert_setting "PAYMENT_HELP_TEXT" "Kyren EasyPay is enabled. Configure KYREN_EASYPAY_API_BASE, KYREN_EASYPAY_PID and KYREN_EASYPAY_PKEY for production."
upsert_setting "payment_visible_method_alipay_enabled" "true"
upsert_setting "payment_visible_method_alipay_source" "easypay_alipay"
upsert_setting "payment_visible_method_wxpay_enabled" "true"
upsert_setting "payment_visible_method_wxpay_source" "easypay_wxpay"

DEMO_LOGIN_PAYLOAD=$(jq -nc --arg email "$DEMO_EMAIL" --arg password "$DEMO_PASSWORD" '{email:$email,password:$password}')
if curl -fsS -X POST "${SUB2API_URL}/api/v1/auth/login" -H "Content-Type: application/json" -d "$DEMO_LOGIN_PAYLOAD" >/dev/null 2>&1; then
  echo "Demo user already available: ${DEMO_EMAIL}"
else
  EXISTING_USER_ID=$(curl -fsS "${SUB2API_URL}/api/v1/admin/users?search=${DEMO_EMAIL}&page=1&page_size=10" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    | jq -r --arg email "$DEMO_EMAIL" '.data.items[]? | select(.email == $email) | .id' \
    | head -n 1)

  if [ -n "$EXISTING_USER_ID" ] && [ "$EXISTING_USER_ID" != "null" ]; then
    DEMO_UPDATE_PAYLOAD=$(jq -nc --arg password "$DEMO_PASSWORD" --arg username "$DEMO_USERNAME" '{password:$password, username:$username, status:"active"}')
    curl -fsS -X PUT "${SUB2API_URL}/api/v1/admin/users/${EXISTING_USER_ID}" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$DEMO_UPDATE_PAYLOAD" >/dev/null
    echo "Demo user password refreshed: ${DEMO_EMAIL}"
  else
    DEMO_CREATE_PAYLOAD=$(jq -nc --arg email "$DEMO_EMAIL" --arg password "$DEMO_PASSWORD" --arg username "$DEMO_USERNAME" '{email:$email,password:$password,username:$username,balance:100,concurrency:2,rpm_limit:120}')
    curl -fsS -X POST "${SUB2API_URL}/api/v1/admin/users" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$DEMO_CREATE_PAYLOAD" >/dev/null
    echo "Demo user created: ${DEMO_EMAIL}"
  fi
fi

echo "sub2api bootstrap completed."
