# IPTV SaaS - Business Logic & Integration Rules

## Core Principle
The application's source of truth for a user's permissions and limits is their **Stripe Subscription status** and the associated `plans` table. The backend must enforce these limits on every relevant API call.

## 0. Technology Mandate
- **Rule 0.1 (Runtime & Package Manager):** The Bun runtime and package manager **must** be used exclusively. The use of `npm`, `yarn`, or `pnpm` is explicitly forbidden for dependency management, script execution, and running the application.
- **Rule 0.2 (Programming Language):** The codebase **must** be written in JavaScript (.js files). The use of TypeScript (.ts files) or any other language that requires a compile-to-JS step is explicitly forbidden.
- **Rule 0.3 (Package installation):** Use `bun add` and do not insert packages directly to package.json
- **Rule 0.4 (Authentication):** Users authenticate with email only. No username field is used.
- **Rule 0.5 (Authorization):** Use a single `role` column with values: 'user', 'reseller', 'admin'. No boolean flags for roles.

## 1. Subscription & Payment Rules

### 1.1. Trial Management
- **Rule 1.1.1 (One Trial Per User):** A user can only have one trial ever. The `users.has_used_trial` flag is the source of truth. This flag must be set to `TRUE` immediately upon successful trial signup, even if the user cancels early.
- **Rule 1.1.2 (Trial Eligibility):** A user is eligible for a trial **only if** `has_used_trial` is `FALSE` and they have never had an active paid subscription in the past.
- **Rule 1.1.3 (Trial End):** When a trial ends (via a `customer.subscription.trial_will_end` or `customer.subscription.deleted` webhook), immediately downgrade the user's access to the `free` plan limits.

### 1.2. Plan Changes
- **Rule 1.2.1 (Stripe Manages Proration):** All plan changes must be done through the Stripe API. The application must **not** calculate proration manually.
- **Rule 1.2.2 (Immediate Upgrade Access):** New limits must be effective **immediately** upon confirmation from the Stripe webhook (`invoice.paid`, `customer.subscription.updated`).
- **Rule 1.2.3 (Downgrade at Period End):** Downgrades switch at the end of the current billing period. Limits must remain active until then. The `subscriptions.cancel_at_period_end` flag must be set correctly.

### 1.3. Webhook Handling
- **Rule 1.3.1 (Single Source of Truth):** The `subscriptions` table must **only** be updated via verified Stripe webhooks.
- **Rule 1.3.2 (Critical Webhooks):** Handle these key events:
    - `customer.subscription.updated`: Update status, price_id, period end.
    - `customer.subscription.deleted`: Set status to 'canceled', enforce `free` plan.
    - `invoice.paid`: Finalize payment success (e.g., upgrade access).
    - `invoice.payment_failed`: Initiate grace period procedures.
- **Rule 1.3.3 (Idempotency):** Webhook handlers must use the `idempotency_key` or a database check to prevent duplicate event processing.

## 2. Access & Entitlement Rules

### 2.1. Enforcement
- **Rule 2.1.1 (Real-Time Checks):** The user's active plan limits must be checked on every API call that creates a restricted resource (profile, playlist, favorite).
- **Rule 2.1.2 (Over-Limit Handling):** Users over their limit cannot create new resources. Do not auto-delete data. Lock access to excess resources instead.
- **Rule 2.1.3 (Payment Failure Grace Period):** Upon payment failure, a 3-7 day grace period begins before downgrading to `free`.

### 2.2. Security
- **Rule 2.2.1 (Plan Spoofing Prevention):** The user's plan is determined by their active `stripe_price_id` in the `subscriptions` table, **never** by a field on the `users` table.
- **Rule 2.2.2 (Sensitive API Protection):** Endpoints that mutate state or return sensitive data must calculate user rights on-the-fly from the database, not from cached JWT claims.

### 2.3. Session & Profile Management
- **Rule 2.3.1 (Profile Context in JWT):** The active profile for a user's session must be stored in the JWT token via the `POST /auth/profile/:id/select` endpoint.
- **Rule 2.3.2 (Profile Selection):** The profile selection endpoint must:
    1.  Verify the profile belongs to the user.
    2.  Verify the provided PIN against the profile's `parental_pin` (plain text comparison).
    3.  Issue a new JWT with the `current_profile_id` claim.
- **Rule 2.3.3 (Profile-Scoped Endpoints):** Endpoints like `GET /favorites` must use the `current_profile_id` from the JWT to scope their response, not a parameter.

## 3. Reseller & Credit System Rules

### 3.1. Credit Application
- **Rule 3.1.1 (Credit Check):** When a reseller creates a client, the system must:
    1.  Check the reseller's `credits_balance` is sufficient. **(See Concurrency Rules 4.1)**
    2.  Create the Stripe subscription using the reseller's `stripe_customer_id`.
    3.  Debit the reseller's balance via a `credits_transactions` record.
    4.  Set the client's `parent_reseller_id` correctly.
- **Rule 3.1.2 (Credit Non-Transferable):** Credits are non-transferable between users and non-refundable.

### 3.2. Credit Purchases
- **Rule 3.2.1 (Hybrid Payment Model):** Credits can be purchased via:
    - **Stripe:** User buys a credit package. On successful `invoice.paid`, credits are added.
    - **Manual Admin Addition:** An admin adds credits via an API call after an offline payment (cash, bank transfer).

## 4. Concurrency & Data Integrity Rules

### 4.1. Atomic Operations
- **Rule 4.1.1 (Transactional Integrity):** Any operation that checks a balance or count and then performs a write **must** be executed within a database transaction.
- **Rule 4.1.2 (Row Locking for Credits):** For credit-based operations, the transaction must begin with `SELECT ... FROM users WHERE id = $user_id FOR UPDATE`.
- **Rule 4.1.3 (Count Checking in Transaction):** For plan limit operations, the current resource count must be checked within the transaction.

### 4.2. Idempotent API Design
- **Rule 4.2.1 (Idempotency Keys):** For critical operations (credit purchase, client creation), use **idempotency keys**. The client sends a `Idempotency-Key` header. The server must return the same response for duplicate requests within a timeframe.

## 5. Data Handling & Security Rules

### 5.1. Sensitive Data
- **Rule 5.1.1 (Playlist Password Storage):** The `password` field in the `playlists` table is stored as plain text (per updated requirements).
- **Rule 5.1.2 (PIN Storage):** Profile parental PINs are stored as plain text in `profiles.parental_pin` (per updated requirements).
- **Rule 5.1.3 (User Password Security):** User account passwords must still be hashed using bcrypt for security.

### 5.2. API Response Format
- **Rule 5.2.1 (Standardized Response):** All API responses must follow the format:
    ```json
    {
      "success": boolean,
      "message": string, // optional
      "data": T | null    // can be an object, array, or null
    }
    ```
- **Rule 5.2.2 (Error Handling):** All errors, including validation and not found, must be caught and formatted into the standard response. HTTP status codes must still be set appropriately.