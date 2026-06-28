# AllCanCode

`allcancode` is the ordinary-user application layer for a fresh `allcancode + sub2api` deployment.

This workspace currently contains:

- `allcancode-web`: React user frontend
- `allcancode-api`: Node/Express user backend
- real `sub2api` source under `.vendor/sub2api-main`
- `postgres` initialization script for the current user-side schema
- `docker-compose.yml`: local one-command deployment

The intended boundary is:

- regular users use `allcancode`
- admin users use `sub2api`
- gateway traffic stays in `sub2api`

This workspace is designed for fresh deployment only.
It does not try to enhance an existing in-production `sub2api` instance in place.

## Local start

1. Copy `.env.example` to `.env`
2. Run `docker compose up -d --build`
3. Open [http://localhost:8080](http://localhost:8080)

Useful local routes:

- user app: [http://localhost:8080](http://localhost:8080)
- user API health: [http://localhost:8080/health](http://localhost:8080/health)
- sub2api admin: [http://localhost:8080/admin/](http://localhost:8080/admin/)
- sub2api API namespace: [http://localhost:8080/api/v1/settings/public](http://localhost:8080/api/v1/settings/public)
- gateway namespace: [http://localhost:8080/v1/models](http://localhost:8080/v1/models)

Default local admin account for `sub2api`:

- Email: `admin@allcancode.local`
- Password: `admin123456`

Fresh deploy bootstrap now does the following automatically:

- accepts the required admin compliance acknowledgement
- enables ordinary-user registration
- enables payment
- creates or updates a local EasyPay-compatible provider for Docker demo use
- enables visible `alipay` and `wxpay` payment methods

Ordinary-user login and registration use real `sub2api` user accounts through `allcancode-api`.

## Local payment demo

1. Register a new user from the `allcancode` frontend
2. Log in and open the recharge page
3. Create a recharge order with `Alipay` or `WeChat Pay`
4. Open the returned mock payment URL under `/mock-pay/...`
5. The bundled EasyPay mock marks the order as paid and redirects back to `/payment/result`

This flow has been verified locally in Docker with webhook-driven order status update.

## Current delivered scope

- login / register
- daily overview
- key management
- usage records
- billing records
- recharge order creation
- backend-config-driven payment methods
- checkout payload generation over real `sub2api` payment orders
- order status verification through real `sub2api` payment APIs
- order history
- ordinary-user frontend access isolated to `/api/app/*`
- Docker topology with `allcancode-web`, `allcancode-api`, `sub2api`, `postgres`, and `redis`

## Current limitations

- `allcancode-api` now wraps real `sub2api` user auth, dashboard, keys, usage, payment methods, and orders, but the codebase still needs deeper modular refactoring.
- Billing records in `allcancode` are currently a user-facing aggregated read model composed from usage, payment orders, and redeem history rather than a dedicated upstream ledger API.
- Payment webhook now enters through `allcancode-api` and is forwarded to `sub2api`, so the user-side app keeps ownership of the external callback route while `sub2api` still owns final payment order processing.

## Notes

- Secrets are backend-only and provided through environment variables.
- `sub2api` requires Redis in this local deployment topology.
- Admin frontend requests need both `/admin/*` and `/api/v1/*` routing to `sub2api`.
- The bundled payment demo uses the local `kyren-mock` service and is intended for development verification only.
