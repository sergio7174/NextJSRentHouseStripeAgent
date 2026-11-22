<h1 align="center">NEXT HOUSE RENTING WITH DEEP AGENT</h1>
<h4 align="center">Full-stack house rental application with Stripe Checkout &amp; Webhooks, Docker Compose, GitHub Actions CI, and a Human-in-the-Loop AI Rental Assistant</h4>
<h4 align="center">Built with Next.js, TypeScript, Node.js (Express), MongoDB, Stripe, Docker, and FastAPI / LangGraph</h4>

<p align="center">
  <a href="#configuration-and-setup">Configuration &amp; Setup</a> •
  <a href="#key-features">Key Features</a> •
  <a href="#stripe-checkout--webhook-flow">Stripe Payments</a> •
  <a href="#docker--github-actions-ci">Docker &amp; CI</a> •
  <a href="#core-agent-features--architecture">AI Helper Agent</a> •
  <a href="#technologies-used">Technologies Used</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#author">Author</a>
</p>

![Status project](https://img.shields.io/badge/STATUS-Active%20Development-GREEN?style=for-the-badge)

## 🔌 Technologies Used ✔️

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-008CDD?style=for-the-badge&logo=stripe&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python%203.13-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)

---

## 🛠️ Tech Stack &amp; Architecture

- **Frontend (`:3000`)**: Next.js (App Router / Pages Router), React, TypeScript, Redux Toolkit, Bootstrap / CSS Modules  `PayNowButton`, `/booking/success` &amp; `/booking/cancel` pages, and `AiChatWidget` with HITL interactive cards.
- **Backend API (`:3001`)**: Node.js + Express microservice handling house listings (`House`), bookings (`Booking` / `bookingdetails`), authentication, Stripe Checkout session creation (`POST /create-checkout-session`), and raw-body Stripe webhook processing (`POST /api/payments/webhook`).
- **AI Helper Service (`:8000`)**: Python 3.13, FastAPI (SSE streaming &amp; `/api/agent/turn`), LangGraph / Deep Agents, `MemorySaver` checkpointer keyed on `thread_id`, `httpx`, and `pytest` + `pytest-asyncio`.
- **Database**: MongoDB storing users, house listings, and bookings (`bookingdetails` with fields such as `paymentStatus` / `paymentstatus`, `stripeSessionId`, and `paidAt`).
- **Containers &amp; CI**: Multi-stage Dockerfiles, `docker-compose.yml` (with `host.docker.internal` support for local MongoDB), and GitHub Actions CI (`.github/workflows/ci.yml`).

---
##  Screenshots:
📸
<br>
<img src="./SYSTEM IMAGES/ADMINDASHBOARD01.jpg" alt="project screenshot01" />
<img src="./SYSTEM IMAGES/ADMINDASHBOARD02.jpg" alt="project screenshot02" />
<img src="./SYSTEM IMAGES/ADMINDASHBOARD03.jpg" alt="project screenshot03" />
<img src="./SYSTEM IMAGES/ADMINDASHBOARD04.jpg" alt="project screenshot04" />
<img src="./SYSTEM IMAGES/MAINDASBOARD.jpg" alt="project screenshot05" />
<img src="./SYSTEM IMAGES/OWNERDASBOARD01.jpg" alt="project screenshot06" />
<img src="./SYSTEM IMAGES/OWNERDASBOARD02.jpg" alt="project screenshot07" />
<img src="./SYSTEM IMAGES/OWNERDASBOARD03.jpg" alt="project screenshot08" />
<img src="./SYSTEM IMAGES/OWNERDASBOARD04.jpg" alt="project screenshot09" />
<img src="./SYSTEM IMAGES/OWNERDASBOARD05.jpg" alt="project screenshot10" />
<img src="./SYSTEM IMAGES/TENANTDASBOARD01.jpg" alt="project screenshot11" />
<img src="./SYSTEM IMAGES/TENANTDASBOARD02.jpg" alt="project screenshot12" />
<img src="./SYSTEM IMAGES/TENANTDASBOARDAGENTPAYPLATT.jpg" alt="project screenshot13" />
<br>
---
## 🔑 Key Features

- **Role-Based Rental Workflows**: Support for Tenant, Owner, and Admin flows—browsing/managing houses, bookings, and accounts.
- **Stripe Checkout &amp; Idempotent Webhooks**: Creates Stripe Checkout sessions from booking/house pricing, redirects via `PayNowButton`, handles `/booking/success` and `/booking/cancel`, verifies `stripe-signature` using `express.raw({ type: "application/json" })`, checks `session.payment_status === "paid"`, and prevents duplicate updates on retries.
- **Containerized Local Run (`Docker Compose`)**: Runs `rentahouse-backend` (`:3001`) and `rentahouse-frontend` (`:3000`) together with `docker compose up --build`.
- **Automated CI (`GitHub Actions`)**: Runs dependency checks, linting/tests, and production builds on `push` and `pull_request` to `main`.
- **Conversational AI Helper Agent (`HITL` + `thread_id`)**: Multi-turn assistant with thread memory and Human-in-the-Loop approval/rejection for write tools (`create_booking`, `create_house_listing`).

---

## 💳 Stripe Checkout &amp; Webhook Flow

1. **Create Session (`POST /create-checkout-session`)**: Looks up the tenant's target booking and resolves the matching `House` (checking `House.findById` with fallback to `{ houseId }`), computes `unit_amount` in cents, creates the Stripe Checkout Session with `metadata: { bookingId }`, saves `stripeSessionId`, and returns `{ url, sessionId }`.
2. **Frontend Redirect &amp; Return Pages**: `PayNowButton` calls the backend and redirects to Stripe Checkout, returning to `/booking/success?session_id={CHECKOUT_SESSION_ID}` or `/booking/cancel?booking_id=...` on `:3000`.
3. **Webhook Verification &amp; Idempotency (`POST /api/payments/webhook`)**: Registered with `express.raw({ type: "application/json" })` before global JSON body parsers, verifies `stripe-signature` via `STRIPE_WEBHOOK_SECRET`, confirms `session.payment_status === "paid"`, skips already-paid sessions idempotently, and sets `paymentStatus: "paid"`, `paymentstatus: "paid"`, `stripeSessionId`, and `paidAt`.

For local webhook forwarding with Stripe CLI:

```powershell
stripe listen --events checkout.session.completed --forward-to localhost:3001/api/payments/webhook
