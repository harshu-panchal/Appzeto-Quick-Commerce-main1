# MASTER PROMPT — COMPLETE END-TO-END PLAYWRIGHT TESTING FOR APPZETO QUICK COMMERCE

You are a senior QA automation engineer, Playwright architect, MERN engineer, security tester, and test-infrastructure engineer.

Your task is to take the existing repository:

`https://github.com/harshu-panchal/Appzeto-Quick-Commerce-main1.git`

and implement a **production-grade, comprehensive end-to-end Playwright testing framework** that tests the application's complete functionality across every available user role, module, route, API-backed workflow, state transition, validation, error condition, and business-critical flow.

The goal is NOT to create a small sample test suite.

The goal is:

> **Understand the entire application first, discover every functional flow, create a complete test matrix, then implement automated Playwright tests for every realistically testable flow.**

Do not assume the application's functionality from this prompt alone. The repository is the source of truth.

---

# 1. NON-NEGOTIABLE RULE

Before writing Playwright tests, deeply inspect the COMPLETE repository.

Do not immediately start creating tests.

First understand:

- frontend architecture
- backend architecture
- routing
- authentication
- authorization
- roles
- pages
- components
- forms
- API calls
- API routes
- controllers
- services
- models
- middleware
- validations
- database relationships
- order lifecycle
- payment lifecycle
- wallet lifecycle
- seller lifecycle
- delivery lifecycle
- admin lifecycle
- notifications
- Socket.IO
- queues
- scheduled jobs
- file uploads
- image handling
- maps/location
- coupons
- offers
- returns
- refunds
- payouts
- support tickets
- chat
- settings
- configuration
- error handling
- rate limiting
- security
- permissions
- background processes
- existing tests
- existing test utilities
- existing test data
- environment variables

The agent must treat the actual source code as authoritative.

---

# 2. DO NOT MODIFY BUSINESS LOGIC UNNECESSARILY

The primary task is TEST AUTOMATION.

Do NOT rewrite or refactor business logic simply to make testing easier.

Do NOT:

- change pricing rules
- change order logic
- change authentication behavior
- change payment logic
- change database models
- remove validations
- bypass authorization
- weaken security
- remove rate limiting
- change role permissions
- change production behavior
- replace existing architecture

Only modify application code if absolutely necessary to make a feature deterministic/testable and document every such modification.

Prefer:

- Playwright fixtures
- test-only environment variables
- API setup
- database seeding
- controlled mocks
- route interception
- test utilities
- dedicated test accounts
- test-mode integrations

instead of changing production behavior.

---

# 3. FIRST PHASE — COMPLETE CODEBASE DISCOVERY

Before implementation, recursively inspect the repository.

Analyze at minimum:

```text
frontend/
backend/
```

and every relevant source directory.

Inspect:

```text
package.json
package-lock.json
vite.config.*
.env.example
README*
documentation
existing tests
scripts
configuration
```

Find every:

```text
route
page
component
form
modal
drawer
dialog
API request
mutation
query
controller
service
model
middleware
authentication method
authorization rule
role
state transition
background job
queue
socket event
payment event
notification event
```

Use static code analysis to identify functionality instead of relying only on filenames.

---

# 4. CREATE A FUNCTIONAL INVENTORY BEFORE TESTING

Generate:

```text
docs/playwright/FUNCTIONAL_INVENTORY.md
```

Document every discovered feature.

Use this structure:

```text
Module
Feature
Route
User Role
Frontend Entry Point
Backend API
Database Models
Dependencies
Happy Path
Negative Paths
Validation Rules
Authorization Rules
Side Effects
External Services
Async Behavior
Testability
Priority
```

Do not omit minor features.

For example:

```text
Customer
  Login
  Signup
  Logout
  Forgot password/OTP
  Profile
  Edit profile
  Address
  Search
  Categories
  Product details
  Cart
  Wishlist
  Offers
  Checkout
  Coupons
  Wallet
  COD
  Online payment
  Orders
  Order details
  Cancellation
  Return
  Refund
  Support
  Chat
  Notifications
  Settings
```

But do not stop there.

Discover the actual application and include every additional feature found.

---

# 5. COMPLETE ROUTE DISCOVERY

Inspect the React Router configuration.

Create:

```text
docs/playwright/ROUTE_MATRIX.md
```

List EVERY route.

Example:

```text
/
/login
/signup
/categories
/category/:categoryName
/product/:id
/search
/offers
/shop-by-store

/wishlist
/orders
/orders/:orderId
/transactions
/addresses
/settings
/support
/chat
/checkout
/payment-status
/profile
/profile/edit
/wallet
/notifications

/seller/*
/seller/auth
/seller/...

/admin/*
/admin/auth
/admin/...

/delivery/*
/delivery/auth
/delivery/...
```

Do not assume these are the complete routes.

Extract the actual routes from source code.

For every route record:

```text
URL
Role
Authentication Required
Expected Access
Expected Redirect
Page Purpose
API Dependencies
Primary Actions
```

---

# 6. USER ROLE DISCOVERY

Determine every role from the actual code.

At minimum investigate:

```text
CUSTOMER
SELLER
ADMIN
DELIVERY
```

but discover additional roles if they exist.

For every role document:

```text
Role
Login mechanism
Registration mechanism
Permissions
Protected routes
Forbidden routes
Dashboard
Available actions
API permissions
Logout
Session behavior
```

---

# 7. AUTHENTICATION TESTING

Implement comprehensive authentication tests.

Test every authentication mechanism actually implemented.

Include:

### Customer

```text
Signup
Valid signup
Invalid signup
Missing fields
Invalid phone
Invalid email
Weak password
Duplicate account
OTP request
Correct OTP
Incorrect OTP
Expired OTP
Resend OTP
Too many OTP attempts
Login
Invalid credentials
Empty credentials
Logout
Session persistence
Session expiration
Protected route without authentication
Back navigation after logout
Refresh while authenticated
Refresh after logout
```

If password reset exists:

```text
Forgot password
OTP
Reset password
Invalid reset token
Expired reset token
Reuse reset token
```

### Seller

Test:

```text
Seller signup
Seller login
Invalid credentials
Pending approval
Approved seller
Rejected seller if supported
Logout
Protected routes
Unauthorized routes
Session persistence
```

### Admin

Test:

```text
Admin login
Invalid credentials
Logout
Session persistence
Protected routes
Customer access to admin route
Seller access to admin route
Delivery access to admin route
```

### Delivery

Test:

```text
Delivery registration/login
Invalid credentials
Approval state if applicable
Logout
Protected routes
Role restrictions
```

---

# 8. AUTHORIZATION TESTING

This is mandatory.

For every protected route:

```text
Unauthenticated
Customer
Seller
Admin
Delivery
```

verify access behavior.

Create a matrix:

```text
Route                  Guest Customer Seller Admin Delivery
/admin/*                ❌      ❌       ❌     ✅    ❌
/seller/*               ❌      ❌       ✅     ❌    ❌
/delivery/*             ❌      ❌       ❌     ❌    ✅
/customer protected     ❌      ✅       ❌*    ❌*   ❌*
```

Use actual application permissions rather than assuming the matrix above.

Test both:

```text
Frontend route protection
Backend API authorization
```

---

# 9. CUSTOMER COMPLETE E2E TESTING

Implement full customer workflows.

## Home

Test:

```text
Home loads
Loading state
API failure
Banner rendering
Category rendering
Store rendering
Product rendering
Offers
Navigation
Location-dependent behavior
```

## Search

Test:

```text
Search page
Search text
Empty search
No results
Results
Search result navigation
Case handling
Special characters
Search debounce
Pagination/infinite loading if present
```

If voice search exists:

```text
Voice search UI
Permission denial
Successful voice input
Failure handling
```

## Categories

Test:

```text
Categories
Category selection
Category product listing
Empty category
Invalid category
Product navigation
```

## Product

Test:

```text
Product detail
Images
Price
Discount
Stock
Quantity
Variants if supported
Add to cart
Remove from cart
Wishlist
Reviews
Unavailable product
```

## Cart

Test:

```text
Empty cart
Add product
Increase quantity
Decrease quantity
Remove item
Multiple products
Multiple sellers
Stock changes
Price changes
Cart persistence
Cart refresh
Cart API failure
```

## Wishlist

Test:

```text
Add
Remove
Duplicate add
Product navigation
Persistence
Unauthenticated access
```

## Offers

Test:

```text
Offers page
Offer details
Eligible product
Ineligible product
Expired offer
Navigation
```

## Shop by Store

Test:

```text
Store listing
Store selection
Store products
Empty store
Unavailable store
```

---

# 10. ADDRESS AND LOCATION TESTING

If the application supports addresses/location/maps, test:

```text
Add address
Edit address
Delete address
Set default
Multiple addresses
Required fields
Invalid address
Location permission
Location denied
Map interaction
Coordinates
Delivery availability
Address selection during checkout
```

If Google Maps or another map provider is used, use deterministic test behavior where possible.

Do not make the test suite dependent on live map UI unless necessary.

---

# 11. CHECKOUT — EXTREMELY IMPORTANT

Build deep checkout coverage.

Test:

```text
Cart → Checkout
```

and every checkout variation discovered in the code.

Include:

```text
No address
Valid address
Multiple addresses
Address selection
Product quantity
Subtotal
Discount
Coupon
Delivery charge
Weather charge
Extra charge
Tax
Platform fee
Wallet
Grand total
```

Verify calculations from the UI against backend responses where appropriate.

Never blindly trust displayed frontend calculations.

---

# 12. COUPON TESTING

If coupons exist, test:

```text
Valid coupon
Invalid coupon
Expired coupon
Inactive coupon
Minimum cart value
Maximum discount
Percentage discount
Flat discount
Product-specific coupon
Category-specific coupon
Store-specific coupon
User-specific coupon
Usage limit
Per-user limit
Duplicate use
Coupon removal
Coupon recalculation
```

Test price manipulation attempts.

For example:

```text
negative discount
discount greater than subtotal
invalid coupon ID
tampered request payload
```

Verify backend rejects invalid values.

---

# 13. WALLET TESTING

If wallet exists, implement:

```text
Wallet page
Balance
Wallet history
Wallet credit
Wallet debit
Wallet redemption
Insufficient balance
Partial wallet usage
Full wallet usage
Wallet + COD
Wallet + online payment
Refund to wallet
Duplicate transaction
Refresh consistency
```

Verify:

```text
Displayed wallet balance
Backend wallet balance
Ledger/transaction records
Order payment breakdown
```

where test access permits.

---

# 14. COD ORDER — COMPLETE FLOW

Automate the complete COD lifecycle.

Example:

```text
Customer
↓
Login
↓
Browse
↓
Product
↓
Add to cart
↓
Checkout
↓
Address
↓
Coupon if applicable
↓
Wallet if applicable
↓
Select COD
↓
Place order
↓
Order confirmation
↓
Seller receives order
↓
Seller accepts
↓
Delivery assignment
↓
Delivery partner receives order
↓
Accept delivery
↓
Pickup
↓
Out for delivery
↓
Customer receives order
↓
OTP verification
↓
Delivered
↓
Settlement
↓
Payout
```

Do not stop at order creation.

Test the complete lifecycle.

---

# 15. ONLINE PAYMENT TESTING

Implement deterministic test-mode payment testing.

Do not use real production payments.

Test:

```text
Create payment
Payment initiation
Payment success
Payment failure
Payment cancellation
Payment timeout
Webhook success
Webhook failure
Webhook retry
Duplicate webhook
Invalid webhook
Order/payment state synchronization
```

Verify:

```text
Payment status
Order status
Transaction/ledger state
Wallet state
Admin earning
Seller payout state
Delivery payout state
```

Use mocking/interception/test gateway mechanisms where necessary.

---

# 16. ORDER MANAGEMENT

Test every order state found in the application.

Discover the actual state machine.

Create:

```text
docs/playwright/ORDER_STATE_MACHINE.md
```

For every state document:

```text
State
Allowed previous states
Allowed next states
Allowed role
API
UI
Side effects
```

Then automate:

```text
Order creation
Seller acceptance
Seller rejection
Seller timeout
Delivery assignment
Delivery acceptance
Pickup
Out for delivery
OTP
Delivered
Cancellation
Return
Refund
```

Test invalid transitions too.

For example:

```text
Delivered → Seller pending
Delivered → Cancelled
Cancelled → Delivered
```

if the backend should reject them.

---

# 17. ORDER CANCELLATION

Test cancellation at every supported stage.

For each stage determine whether cancellation is allowed.

Test:

```text
Customer cancellation
Seller cancellation
Admin cancellation
Automatic cancellation
Cancellation reason
Stock restoration
Payment reversal
Wallet reversal
Coupon behavior
Notifications
Order status
```

Verify no duplicated financial side effects.

---

# 18. RETURN AND REFUND

Implement the full return lifecycle.

Test:

```text
Customer requests return
Invalid return request
Seller approves
Seller rejects
Return pickup assignment
Delivery partner accepts
Return OTP
Return in transit
Seller receives return
Admin QC
QC pass
QC fail
Refund
Refund to wallet
Refund accounting
Payout cancellation/adjustment
Duplicate refund attempt
```

Verify idempotency.

---

# 19. SELLER COMPLETE TESTING

Inspect every seller route/page and test every feature.

Likely areas include:

```text
Seller authentication
Application
Approval
Dashboard
Profile
Store
Products
Add product
Edit product
Delete product
Images
Categories
Inventory
Stock
Pricing
Offers
Orders
Order acceptance
Order rejection
Order status
Earnings
Payouts
Transactions
Support
Notifications
Settings
Logout
```

For every seller form test:

```text
Valid input
Required fields
Invalid input
Boundary values
Duplicate records
Unauthorized access
API failure
Loading
Success
Error
```

---

# 20. SELLER PRODUCT MANAGEMENT

Test every product operation:

```text
Create
Read
Update
Delete
Search
Filter
Category
Price
Discount
Stock
Images
Variants
Availability
Validation
Duplicate product
Invalid product
```

If image upload exists:

```text
Valid image
Invalid extension
Large file
Upload failure
Delete image
Replace image
```

---

# 21. INVENTORY / STOCK

Test:

```text
Stock increase
Stock decrease
Out of stock
Insufficient stock
Concurrent purchase
Cart stock mismatch
Order stock reservation
Cancellation stock release
Return stock handling
```

Where practical, use API/database assertions to verify stock integrity.

---

# 22. DELIVERY PARTNER COMPLETE TESTING

Inspect all delivery routes.

Test:

```text
Login
Dashboard
Available orders
Order assignment
Accept
Reject
Pickup
OTP
Out for delivery
Delivered
Cash collection
Cash in hand
COD reconciliation
Earnings
Payouts
Return pickup
Return delivery
Notifications
Location/tracking
Logout
```

If real-time Socket.IO functionality exists, test it.

---

# 23. ADMIN COMPLETE TESTING

Inspect every admin route.

Test every CRUD/action workflow.

Potential areas:

```text
Dashboard
Users
Customers
Sellers
Delivery partners
Products
Categories
Stores
Offers
Coupons
Orders
Order workflow
Billing
Charges
Finance
Wallet
Transactions
Payouts
Support
Notifications
Settings
Reports
```

For every admin page:

```text
Page loads
Data loading
Search
Filter
Sort
Pagination
Create
Edit
Delete
Status change
Confirmation dialog
Cancel action
Validation
API failure
Permission
```

---

# 24. BILLING / CHARGES

If billing supports configurable charges such as:

```text
delivery charge
weather charge
extra charge
city-specific charges
```

test every dimension discovered in the actual code.

Example:

```text
Create charge
Edit charge
Delete charge
Enable/disable
City
Category
Order amount
Delivery conditions
Conflict resolution
Fallback behavior
Checkout calculation
```

Verify frontend and backend agree.

---

# 25. FINANCE TESTING

Because this application has substantial finance logic, create a dedicated suite:

```text
playwright/tests/finance/
```

Test:

```text
Customer payment
Wallet
Admin earnings
Seller payout
Delivery payout
COD cash
COD reconciliation
Refund
Return
Cancellation
Ledger
Transaction history
Duplicate operations
Idempotency
```

Test repeated requests.

For every financial mutation test:

```text
First request
Second identical request
Concurrent duplicate request
Retry after failure
```

The second execution must not incorrectly double-charge or double-credit.

---

# 26. NOTIFICATIONS

Test every notification mechanism found.

Include:

```text
Customer notification
Seller notification
Delivery notification
Admin notification
Read
Unread
Mark as read
Mark all as read
Navigation from notification
Real-time notification
Notification after order state transition
```

If Socket.IO is used, verify real-time updates.

---

# 27. SOCKET.IO / REAL-TIME TESTING

Inspect every socket event.

Create:

```text
docs/playwright/SOCKET_EVENT_MATRIX.md
```

Document:

```text
Event
Emitter
Listener
Role
Trigger
Payload
Expected UI result
```

Then automate important events.

Examples:

```text
New order
Order accepted
Delivery assignment
Order status change
Notification
Support/chat message
Tracking update
```

Do not make tests dependent on arbitrary sleep.

Use event-driven waits.

---

# 28. CHAT / SUPPORT

If chat exists:

```text
Create conversation
Send message
Receive message
Multiple messages
Unread count
Read status
Refresh
Reconnect
Message failure
Empty message
Long message
Special characters
```

For support:

```text
Create ticket
Required fields
Invalid ticket
Reply
Status
Close
Reopen
Admin response
Seller response
Delivery response
Notifications
```

---

# 29. FILE UPLOAD TESTING

Discover all upload functionality.

Test:

```text
Valid image
Invalid file
Oversized file
Multiple files
Empty upload
Upload failure
Remove file
Replace file
Persist uploaded file
```

Use deterministic fixture files stored under:

```text
playwright/fixtures/files/
```

---

# 30. API CONTRACT TESTING THROUGH PLAYWRIGHT

Playwright should not only click UI.

Use Playwright's `request` API where appropriate.

Create tests for important API contracts:

```text
Authentication
Products
Cart
Orders
Payments
Wallet
Coupons
Returns
Refunds
Seller
Delivery
Admin
Notifications
Support
```

Use this especially for:

```text
setup
cleanup
database seeding
authentication
test state creation
negative API tests
authorization
```

Do not duplicate the entire Jest/Supertest suite unnecessarily.

Browser E2E should focus on user-visible behavior and critical API contracts.

---

# 31. SECURITY TESTING

Add a dedicated security suite.

Test:

```text
Unauthenticated API access
Wrong role
Missing JWT
Invalid JWT
Expired JWT
Malformed JWT
Tampered ID
Access another customer's order
Access another seller's product
Access another seller's order
Admin endpoint as customer
Seller endpoint as delivery user
IDOR attempts
Unauthorized update
Unauthorized delete
```

Test input validation:

```text
negative quantity
negative price
invalid ObjectId
unexpected fields
oversized payload
malformed JSON
XSS strings
HTML injection
special characters
```

Do not attempt destructive attacks against production.

All security tests must target a local/test environment.

---

# 32. RATE LIMITING

Inspect the application's rate-limit implementation.

Test appropriate protected endpoints:

```text
Login
OTP
Payment
Sensitive mutations
```

Verify rate limiting behaves as intended without making the test suite excessively slow.

---

# 33. RESPONSIVE TESTING

Run critical flows on:

```text
Desktop Chromium
Mobile Chromium
```

At minimum test:

```text
Login
Home
Search
Product
Cart
Checkout
Order
Seller dashboard
Admin dashboard
Delivery dashboard
```

Check:

```text
No horizontal overflow
Buttons accessible
Forms usable
Dialogs visible
Navigation works
Mobile menus work
```

Do not turn every desktop test into a duplicate mobile test.

Use a critical responsive subset.

---

# 34. ACCESSIBILITY

Add automated accessibility checks using a suitable Playwright-compatible accessibility tool where practical.

Check critical pages for:

```text
Missing labels
Buttons
Inputs
Form errors
Keyboard navigation
Dialog accessibility
Heading hierarchy
Image alt text
Color-independent errors
Focus behavior
```

Do not let accessibility checks become the only test of functionality.

---

# 35. ERROR AND FAILURE TESTING

For important API calls, test:

```text
500
400
401
403
404
409
422
429
network failure
timeout
empty response
malformed response
```

Verify UI:

```text
error message
toast
retry
fallback
loading state
no crash
```

Use Playwright route interception when deterministic backend failure simulation is required.

---

# 36. LOADING STATES

Test important async components for:

```text
Initial loading
Skeleton
Spinner
Disabled buttons
Double-click protection
Slow API
Network delay
Retry
```

Ensure users cannot accidentally submit important actions twice.

---

# 37. DOUBLE-SUBMISSION / IDEMPOTENCY

This is mandatory for:

```text
Place order
Payment creation
Payment webhook
Wallet transaction
Cancellation
Refund
Payout
COD reconciliation
Seller acceptance
Delivery acceptance
```

Trigger repeated requests where practical.

Verify no duplicated side effects.

---

# 38. DATABASE TEST DATA STRATEGY

Create a deterministic test data system.

Do NOT depend on manually created production data.

Create:

```text
playwright/data/
```

and appropriate seed utilities.

Create dedicated users:

```text
customer
seller
admin
delivery
```

with unique test identifiers.

Prefer generated unique email/phone values.

Example:

```text
e2e.customer.<timestamp>@example.test
e2e.seller.<timestamp>@example.test
```

Do not use real people's data.

---

# 39. DATABASE CLEANUP

Every test must avoid polluting other tests.

Prefer:

```text
beforeAll
beforeEach
afterEach
afterAll
```

with deterministic cleanup.

Where appropriate:

```text
create test entity
run test
delete test entity
```

Avoid wiping the entire database unless using an isolated dedicated test database.

---

# 40. TEST ENVIRONMENT

Create:

```text
.env.playwright.example
```

Document:

```text
PLAYWRIGHT_BASE_URL
API_BASE_URL
MONGODB_URI
TEST_CUSTOMER_EMAIL
TEST_CUSTOMER_PASSWORD
TEST_SELLER_EMAIL
TEST_SELLER_PASSWORD
TEST_ADMIN_EMAIL
TEST_ADMIN_PASSWORD
TEST_DELIVERY_EMAIL
TEST_DELIVERY_PASSWORD
TEST_OTP
PAYMENT_TEST_MODE
```

Never commit real secrets.

Never expose:

```text
API keys
JWT secrets
database passwords
payment secrets
Firebase private keys
Cloudinary secrets
```

---

# 41. AUTH STORAGE STATES

Implement reusable authenticated states:

```text
playwright/.auth/customer.json
playwright/.auth/seller.json
playwright/.auth/admin.json
playwright/.auth/delivery.json
```

Create a setup project:

```text
auth.setup.ts
```

or equivalent JavaScript implementation matching the repository's language conventions.

Use authenticated contexts to reduce repeated login time.

However, retain dedicated authentication tests that actually test login.

---

# 42. PLAYWRIGHT FIXTURES

Create reusable fixtures.

At minimum:

```text
customerPage
sellerPage
adminPage
deliveryPage
apiRequest
testData
database
```

Create domain helpers:

```text
createCustomer()
createSeller()
createDeliveryPartner()
createProduct()
createCategory()
createCoupon()
createOrder()
createAddress()
createWalletBalance()
```

Only implement helpers that are compatible with the actual backend.

---

# 43. PAGE OBJECTS

Use Page Object Models only where they add real value.

Create:

```text
playwright/pages/
```

Possible examples:

```text
CustomerLoginPage
HomePage
ProductPage
CartPage
CheckoutPage
OrdersPage
WalletPage

SellerLoginPage
SellerDashboardPage
SellerProductsPage
SellerOrdersPage

AdminLoginPage
AdminDashboardPage
AdminOrdersPage
AdminBillingPage

DeliveryLoginPage
DeliveryDashboardPage
DeliveryOrderPage
```

Do not create pointless abstractions.

Selectors should prefer:

```text
getByRole()
getByLabel()
getByPlaceholder()
getByText()
data-testid
```

Use CSS/XPath only when necessary.

---

# 44. ADD TEST IDS ONLY WHEN NECESSARY

If the application has unstable selectors, add stable attributes such as:

```html
data-testid="add-to-cart"
data-testid="checkout-button"
data-testid="place-order"
```

But do not litter the application with unnecessary test IDs.

Prefer semantic selectors first.

Document any application modifications.

---

# 45. TEST FILE ORGANIZATION

Use a structure similar to:

```text
playwright/
│
├── tests/
│   ├── public/
│   ├── auth/
│   ├── customer/
│   │   ├── home.spec.js
│   │   ├── search.spec.js
│   │   ├── product.spec.js
│   │   ├── cart.spec.js
│   │   ├── wishlist.spec.js
│   │   ├── address.spec.js
│   │   ├── checkout.spec.js
│   │   ├── coupon.spec.js
│   │   ├── wallet.spec.js
│   │   ├── orders.spec.js
│   │   ├── returns.spec.js
│   │   ├── support.spec.js
│   │   └── notifications.spec.js
│   │
│   ├── seller/
│   ├── admin/
│   ├── delivery/
│   ├── payments/
│   ├── finance/
│   ├── realtime/
│   ├── security/
│   ├── api/
│   ├── negative/
│   ├── responsive/
│   └── regression/
│
├── fixtures/
├── pages/
├── helpers/
├── data/
├── auth/
└── setup/
```

Adapt this structure if repository conventions suggest a better organization.

---

# 46. TEST NAMING

Tests must describe actual behavior.

Bad:

```text
test('checkout works')
```

Good:

```text
test('customer can place a COD order with a valid address')
```

Better:

```text
test('customer can place a COD order, seller can accept it, delivery partner can deliver it using OTP, and order becomes delivered')
```

Tests should make failures understandable.

---

# 47. TEST TAGGING

Implement tags or project/group conventions for:

```text
@smoke
@critical
@customer
@seller
@admin
@delivery
@payment
@finance
@security
@negative
@mobile
@realtime
```

Use Playwright-supported tagging/project configuration appropriately.

Create:

```text
smoke
critical
full regression
```

execution modes.

---

# 48. SMOKE SUITE

Create a small smoke suite covering:

```text
Application loads
Customer login
Product browsing
Add to cart
Checkout
COD order
Seller login
Admin login
Delivery login
```

Smoke must execute quickly.

---

# 49. FULL REGRESSION SUITE

Full regression must execute:

```text
ALL discovered functional tests
ALL critical negative tests
ALL role authorization tests
ALL payment tests
ALL order lifecycle tests
ALL finance tests
ALL important Socket.IO tests
critical responsive tests
```

---

# 50. AUTOMATIC FAILURE ARTIFACTS

Configure:

```text
HTML report
screenshots
videos
traces
console logs
network/API failures
```

For failures capture:

```text
URL
role
test name
request
response
status code
console error
screenshot
trace
```

Do not store secrets in logs.

---

# 51. DEBUGGING QUALITY

When a test fails:

Do NOT simply increase timeout.

Determine whether the problem is:

```text
Application bug
Test bug
Environment issue
Test-data issue
Race condition
Selector issue
Network issue
Third-party service issue
```

Fix the correct layer.

Avoid:

```text
page.waitForTimeout(5000)
```

unless absolutely unavoidable.

Prefer:

```text
expect(locator).toBeVisible()
page.waitForResponse()
page.waitForURL()
expect.poll()
event-based synchronization
```

---

# 52. THIRD-PARTY SERVICES

Discover every external service.

Examples may include:

```text
MongoDB
PhonePe
Firebase
Cloudinary
Google Maps
Google APIs
Redis
Email
SMS/OTP
```

Classify each as:

```text
Must use in E2E
Can mock
Needs test mode
Needs local replacement
Not suitable for CI
```

Do not let third-party outages randomly break the entire test suite.

---

# 53. SOCKET.IO TESTING

Do not use arbitrary sleeps for real-time tests.

Use:

```text
event listeners
UI state changes
network events
socket synchronization
```

If direct socket inspection is necessary, build a small test helper.

---

# 54. BACKGROUND JOBS

Inspect:

```text
Bull queues
workers
scheduled jobs
auto cancellation
payout jobs
return jobs
notification workers
cleanup jobs
```

Identify which workflows depend on them.

For test environments:

```text
run worker
trigger job
wait for deterministic result
assert state
```

Do not wait for real production intervals such as 30 minutes.

Use test-mode configuration to shorten intervals where appropriate.

---

# 55. ORDER STATE TEST MATRIX

Create a matrix similar to:

```text
                 Customer Seller Delivery Admin
CREATED             ✓       ✓       -       ✓
SELLER_PENDING      ✓       ✓       -       ✓
ACCEPTED            ✓       ✓       ✓       ✓
DELIVERY_SEARCH     ✓       -       ✓       ✓
DELIVERY_ASSIGNED   ✓       -       ✓       ✓
PICKUP_READY        ✓       ✓       ✓       ✓
OUT_FOR_DELIVERY    ✓       -       ✓       ✓
DELIVERED           ✓       ✓       ✓       ✓
CANCELLED           ✓       ✓       -       ✓
RETURN_REQUESTED    ✓       ✓       ✓       ✓
RETURNED            ✓       ✓       ✓       ✓
REFUND_COMPLETED    ✓       ✓       -       ✓
```

But derive the actual states from the source code.

Do not invent states.

---

# 56. FINANCIAL INVARIANTS

Where feasible, create assertions for invariants such as:

```text
Order total matches backend pricing
Payment amount matches order payable amount
Wallet debit equals expected amount
Refund equals expected refund
Seller payout equals expected seller amount
Delivery payout equals expected delivery amount
Admin earning equals expected amount
Stock is not negative
Repeated webhook does not double-credit
Repeated refund does not double-refund
Repeated payout does not double-pay
```

Use API/database assertions where UI alone cannot prove correctness.

---

# 57. DATA CONSISTENCY TESTING

For critical flows compare:

```text
UI
API
Database
```

where appropriate.

Example:

```text
Place order
↓
UI shows ₹X
↓
API says ₹X
↓
DB order stores ₹X
↓
Payment stores ₹X
```

For financial flows:

```text
Wallet
Ledger
Order
Payment
Payout
Transaction
```

Verify consistency according to the application's intended architecture.

---

# 58. PERFORMANCE-RELATED E2E CHECKS

Do not turn Playwright into a load-testing framework.

But test basic user-perceived performance:

```text
page loads
critical content appears
loading state resolves
no endless spinner
API eventually resolves
```

Optionally capture:

```text
navigation timing
API response timing
```

for critical pages.

---

# 59. ACCESSIBILITY + RESPONSIVE + FUNCTIONAL

For critical pages combine:

```text
functional test
responsive check
accessibility check
```

but avoid making every test unnecessarily expensive.

---

# 60. CI/CD

Create CI configuration if the project does not already have suitable Playwright CI.

Support:

```text
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:debug
npm run test:e2e:smoke
npm run test:e2e:critical
npm run test:e2e:regression
```

Add CI support for:

```text
install dependencies
install browsers
start frontend
start backend
seed test DB
run tests
upload report
upload traces/screenshots
```

Do not require real production secrets.

---

# 61. PACKAGE.JSON

Add Playwright dependencies/scripts cleanly.

For example:

```text
@playwright/test
```

Do not blindly install duplicate packages.

First inspect existing dependencies.

Use the package manager already used by the project.

---

# 62. PLAYWRIGHT CONFIGURATION

Create a proper:

```text
playwright.config.js
```

or `.ts` only if the repository already uses TypeScript for tooling.

Do not unnecessarily convert JavaScript to TypeScript.

Configure:

```text
testDir
baseURL
projects
webServer
timeouts
retries
workers
reporter
trace
video
screenshot
storageState
```

Use environment variables.

---

# 63. COMPLETE TEST MATRIX

Create:

```text
docs/playwright/TEST_MATRIX.md
```

Every discovered flow must have a row.

Use:

```text
ID
Module
Role
Feature
Scenario
Preconditions
Steps
Expected Result
API
Database
Priority
Automation Status
Test File
```

Example:

```text
CUS-AUTH-001
Customer
Login
Valid login
Registered account
Enter credentials
Customer dashboard/home opens
POST /...
User
P0
Implemented
auth/customer-login.spec.js
```

---

# 64. TRACEABILITY

Every functional inventory item must map to one or more tests.

Create:

```text
docs/playwright/TRACEABILITY_MATRIX.md
```

Structure:

```text
Requirement/Feature
Route
API
Test ID
Test File
Covered?
```

At the end:

```text
Discovered features: X
Automated: Y
Not automatable: Z
Coverage: Y/X
```

Do not claim 100% if anything remains untested.

---

# 65. UNSUPPORTED / MANUAL FLOWS

If a flow cannot be safely automated, document it.

Create:

```text
docs/playwright/MANUAL_TESTS.md
```

For every manual item explain:

```text
Feature
Reason automation is unsuitable
Required environment
Manual steps
Expected result
```

Examples might include:

```text
real SMS provider
real payment gateway
physical device hardware
real GPS
external third-party dashboard
```

But do not mark something manual merely because it is inconvenient.

Find a deterministic test approach first.

---

# 66. BUG DISCOVERY

If tests expose existing bugs:

DO NOT silently change application behavior.

Create:

```text
docs/playwright/BUGS_FOUND.md
```

For each:

```text
Bug ID
Severity
Module
Test
Steps
Expected
Actual
Evidence
Likely source
Recommended fix
```

Continue implementing the remaining tests even if some existing tests fail.

---

# 67. EXISTING TESTS

Inspect all existing:

```text
Jest
Supertest
unit
integration
backend
frontend
scripts
```

Do not duplicate existing coverage without reason.

Instead:

```text
Existing unit test → keep
Existing API test → keep
Missing browser workflow → Playwright
Critical integration gap → Playwright/API
```

---

# 68. DO NOT GAME THE TESTS

Absolutely do not:

```text
mock everything
assert only status 200
assert only page title
skip failed tests
catch errors and ignore them
use massive timeouts
disable security
disable authentication
hardcode dynamic IDs
use production data
```

The suite must detect real regressions.

---

# 69. TEST DATA ISOLATION

Use unique identifiers:

```text
E2E_<timestamp>_<random>
```

for:

```text
email
phone
product
order
coupon
store
seller
ticket
```

Tests must be repeatable.

---

# 70. PARALLEL EXECUTION

Make tests parallel-safe.

If a test modifies shared data:

```text
isolate its entities
```

Do not rely on execution order except where a true lifecycle test intentionally requires:

```text
Customer → Seller → Delivery → Admin
```

For lifecycle tests, clearly mark them as serial where necessary.

---

# 71. CRITICAL BUSINESS JOURNEYS

Create dedicated end-to-end tests for complete journeys.

At minimum:

### Journey 1 — Customer COD

```text
Customer login
→ Browse
→ Search
→ Product
→ Cart
→ Address
→ Checkout
→ Coupon
→ COD
→ Place order
→ Seller accepts
→ Delivery assigned
→ Delivery accepts
→ Pickup
→ Out for delivery
→ OTP
→ Delivered
→ Customer order updated
```

### Journey 2 — Customer online payment

```text
Customer
→ Cart
→ Checkout
→ Online payment
→ Payment success
→ Order
→ Seller
→ Delivery
→ Delivered
```

### Journey 3 — Cancellation

```text
Customer
→ Order
→ Cancel
→ Stock restored
→ Payment/wallet handled
→ Order cancelled
```

### Journey 4 — Return/refund

```text
Customer
→ Delivered order
→ Return request
→ Seller approval
→ Delivery pickup
→ Return
→ Admin QC
→ Refund
→ Wallet/financial state
```

### Journey 5 — Seller

```text
Seller login
→ Dashboard
→ Product
→ Inventory
→ Order
→ Accept
→ Process
→ Earnings
→ Payout
```

### Journey 6 — Delivery

```text
Delivery login
→ Available order
→ Accept
→ Pickup
→ OTP
→ Deliver
→ Cash
→ Earnings
```

### Journey 7 — Admin

```text
Admin login
→ Dashboard
→ Users
→ Sellers
→ Products
→ Orders
→ Billing
→ Finance
→ Payouts
→ Support
```

These must be true cross-role E2E tests, not isolated page tests.

---

# 72. TEST EVERY UI CONTROL

During code inspection identify:

```text
button
link
input
select
checkbox
radio
switch
tab
dropdown
modal
drawer
pagination
filter
sort
search
upload
download
```

For every meaningful control determine:

```text
Expected action
Backend interaction
State change
Success
Failure
```

Automate it where it represents meaningful application behavior.

Do not test purely decorative elements.

---

# 73. FORMS

For every meaningful form test:

```text
Initial state
Required fields
Invalid values
Boundary values
Valid values
Submit
Loading
Success
Failure
Reset
Cancel
Duplicate submission
```

Use actual validation rules from source code.

---

# 74. URL AND NAVIGATION ASSERTIONS

Verify:

```text
Correct route
Correct redirect
Protected route redirect
Role redirect
Deep links
Browser refresh
Back
Forward
Direct URL
```

Do not only test clicking navigation.

---

# 75. BROWSER REFRESH TESTING

For important pages:

```text
Home
Product
Cart
Checkout
Orders
Order details
Seller dashboard
Admin dashboard
Delivery dashboard
```

test browser refresh.

Ensure state does not unexpectedly disappear.

---

# 76. LOCAL STORAGE / SESSION STORAGE

Inspect actual persistence mechanisms.

Test:

```text
auth token
cart
preferences
language
location
theme
session
```

where applicable.

Verify stale/invalid persisted state is handled.

---

# 77. MULTI-TAB / CONCURRENCY

For important flows where relevant:

```text
Customer opens product in tab A
Customer changes cart in tab B
Refresh tab A
```

Test consistency if application behavior requires it.

For payment/order operations, test duplicate submissions.

---

# 78. NETWORK INTERRUPTION

Test critical flows under:

```text
offline
slow network
request failure
request timeout
```

Especially:

```text
Login
Cart
Checkout
Place order
Payment
Order status
```

Verify graceful recovery.

---

# 79. COMPLETE IMPLEMENTATION REQUIREMENT

Do not stop after creating configuration.

You must actually:

1. Install Playwright.
2. Configure Playwright.
3. Create fixtures.
4. Create test users/data utilities.
5. Create authentication storage states.
6. Create page objects where useful.
7. Create test files.
8. Implement tests.
9. Create test matrix.
10. Create traceability matrix.
11. Create manual-test documentation.
12. Create bug documentation.
13. Add package scripts.
14. Add CI support if appropriate.
15. Run the tests.
16. Fix test infrastructure problems.
17. Fix selectors.
18. Fix race conditions.
19. Investigate failures.
20. Re-run.
21. Produce final coverage report.

---

# 80. ITERATIVE EXECUTION

Do NOT write thousands of tests and only run them at the end.

Work in phases:

```text
Phase 1
Infrastructure
↓
Run

Phase 2
Authentication
↓
Run

Phase 3
Customer
↓
Run

Phase 4
Seller
↓
Run

Phase 5
Delivery
↓
Run

Phase 6
Admin
↓
Run

Phase 7
Orders
↓
Run

Phase 8
Payments
↓
Run

Phase 9
Finance
↓
Run

Phase 10
Returns/refunds
↓
Run

Phase 11
Realtime
↓
Run

Phase 12
Security
↓
Run

Phase 13
Responsive/accessibility
↓
Run

Phase 14
Full regression
```

After each phase fix infrastructure/test problems before proceeding.

---

# 81. FAILURE CLASSIFICATION

Every failure must be classified as:

```text
TEST_FAILURE
APPLICATION_BUG
ENVIRONMENT_FAILURE
TEST_DATA_FAILURE
EXTERNAL_SERVICE_FAILURE
CONFIGURATION_FAILURE
```

Do not automatically modify application logic to make a test pass.

---

# 82. FINAL TEST EXECUTION

Run:

```text
Smoke
Critical
Full regression
```

If resources allow:

```text
Chromium
Mobile Chromium
```

Produce:

```text
playwright-report/
test-results/
```

Do not commit generated artifacts unless repository conventions require them.

---

# 83. FINAL REPORT

Create:

```text
docs/playwright/FINAL_REPORT.md
```

Include:

```text
Total discovered features
Total test cases
Implemented test cases
Passed
Failed
Skipped
Blocked
Manual
Coverage percentage
```

Also include:

```text
Customer coverage
Seller coverage
Admin coverage
Delivery coverage
Payment coverage
Finance coverage
Security coverage
Realtime coverage
Responsive coverage
Accessibility coverage
```

List every remaining gap.

---

# 84. FINAL RESPONSE FROM THE CODING AGENT

At the end, report:

```text
1. What was discovered
2. What was implemented
3. Number of tests
4. Number of suites
5. Number passed
6. Number failed
7. Number skipped
8. Number requiring manual testing
9. Existing application bugs discovered
10. Files created
11. Files modified
12. Commands to run
13. Environment variables required
14. CI instructions
15. Remaining coverage gaps
```

Also provide:

```text
npm run test:e2e
npm run test:e2e:smoke
npm run test:e2e:critical
npm run test:e2e:regression
npm run test:e2e:ui
npm run test:e2e:report
```

using the actual script names implemented in the repository.

---

# 85. IMPORTANT: SOURCE-OF-TRUTH RULE

Never assume a feature exists because this prompt mentions it.

For every feature:

```text
Find it in source
Understand it
Test it
```

If it does not exist:

```text
Do not create a fake test.
```

If the feature exists under another name:

```text
Use the actual implementation.
```

---

# 86. IMPORTANT: COMPLETE COVERAGE RULE

"Complete E2E testing" means:

```text
Every user-facing feature
+
Every important backend-backed workflow
+
Every role
+
Every important state transition
+
Every critical negative path
+
Every important authorization boundary
+
Every critical financial operation
+
Every important realtime workflow
```

It does NOT mean blindly generating a test for every `<div>`.

Prioritize meaningful behavior.

---

# 87. FINAL QUALITY BAR

The finished test suite must be capable of catching regressions such as:

```text
Login stops working
Signup breaks
Protected route becomes public
Customer accesses admin
Seller accesses another seller's data
Product cannot be added
Cart quantity is wrong
Price calculation changes
Coupon incorrectly applies
Wallet incorrectly debits
COD order fails
Online payment fails
Duplicate payment occurs
Seller does not receive order
Delivery does not receive order
OTP fails
Order state becomes invalid
Cancellation does not restore stock
Refund does not happen
Seller payout is wrong
Delivery payout is wrong
Admin earning is wrong
Notification is missing
Socket event stops working
Support ticket fails
Chat fails
Image upload fails
Form validation breaks
Mobile layout breaks
API failure crashes UI
```

---

# 88. START NOW

Start by inspecting the repository.

Do NOT ask me to manually provide the routes, pages, APIs, models, or features if they can be discovered from the repository.

Do NOT give me only a plan.

Actually implement the testing framework.

Use the repository's existing JavaScript conventions unless there is a strong reason otherwise.

At every stage preserve existing business behavior.

When you discover an existing application bug, document it and continue testing instead of silently changing the application to hide it.

The final result must be a **real, runnable, maintainable Playwright E2E test system for the entire Appzeto Quick Commerce application**, not a demonstration or sample test suite.