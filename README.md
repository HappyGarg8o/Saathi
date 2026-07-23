# Saathi

A two-sided marketplace app for booking social companions, built for the Indian market.
Completely built by using AI (Claude, Antigravity and ChatGPT) 

Saathi connects users looking for company — for events, outings, or everyday activities — with verified companions, through a mobile-first booking experience with real-time chat and secure payments.

## Features

- **Two-sided marketplace** — separate user and companion (partner) apps
- **Booking flow** — browse, select, and book companions for sessions
- **In-app chat** — real-time messaging between users and companions
- **Active sessions** — live tracking and management of ongoing bookings
- **Ratings & reviews** — post-session feedback for accountability and trust
- **Secure payments** — integrated via Razorpay

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native + Expo |
| Backend / DB | Supabase |
| Payments | Razorpay |

## Project Status

**Archived.** This was built out as a two-sided marketplace app — booking flows, in-app chat, ratings, active sessions, and the partner (companion) app are all functional. Development has stopped and the project is not actively maintained.

A few pieces were left unfinished at the time development stopped: phone OTP auth (Twilio), companion payouts, an admin panel, Aadhaar verification, and automated refunds. Feel free to fork and pick up where it left off.

## Getting Started

### Prerequisites
- Node.js (LTS)
- Expo CLI
- A Supabase project
- A Razorpay account (test keys for development)

### Installation

```bash
git clone https://github.com/HappyGarg8o/Saathi.git
cd Saathi
npm install
```

### Environment Setup

Create a `.env` file in the project root with your Supabase and Razorpay credentials:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
RAZORPAY_KEY_ID=your_razorpay_key_id
```

> ⚠️ Never commit real API keys. Use `.env` (git-ignored) or Expo's secure env config for local development.

### Running the app

```bash
npx expo start
```

## Security

If you're contributing, be careful not to commit secrets (Supabase service keys, Razorpay keys, etc.) to the repo. Use environment variables and double-check `.gitignore` before pushing.

## Contributing

This project is no longer actively maintained. Feel free to fork it if you want to build on it — PRs likely won't be reviewed.

## License

_No license specified yet — all rights reserved by default until one is added._
