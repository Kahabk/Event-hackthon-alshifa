<div align="center">
  <img src="./banar.png" alt="Shifa SDG Innovation Platform banner" width="100%" />
</div>

# Shifa SDG Innovation Platform

A modern event platform for managing the Shifa SDG student innovation challenge. The app helps participants register teams, generate QR registration banners, submit ideas, track event stages, and interact with dashboards for participants, admins, and judges.

## Overview

Shifa SDG is built as a responsive React and Firebase web application for innovation events focused on Sustainable Development Goals. It combines a public event website with authenticated workflows for team registration, profile access, idea submission, QR badge generation, judge review, and admin operations.

## Features

- Public landing page with hero, domains, stages, prizes, mentors, FAQ, and event CTA sections
- Firebase authentication for participants, admins, and judges
- Team registration with team member validation and duplicate email protection
- QR registration banner generated from team details
- Downloadable team badge/banner with registration ID, QR code, college, phone number, district, and leader details
- Profile panel with persistent access to the team QR banner
- Team dashboard for idea submission and pitch deck links
- Admin panel for registrations, finalists, judges, announcements, and event operations
- Judge review panel for assigned team evaluation
- Firestore security rules for role-based access
- Responsive mobile-first UI using Tailwind CSS

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Firebase Auth
- Cloud Firestore
- Motion
- Lucide React icons
- QRCode generation
- Google GenAI SDK included for future AI features

## Demo
https://event-hackthon-alshifa.vercel.app/
## Project Structure

```text
src/
  components/        Reusable pages and UI sections
  lib/               Firebase and registration badge helpers
  data.ts            Event content, tracks, schedule, mentors, FAQ
  types.ts           Shared TypeScript types
  App.tsx            Main routing and application state
public/              Public media assets
firestore.rules      Firestore role and data security rules
banar.png            README banner image
```

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- Firebase project with Authentication and Firestore enabled

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file from `.env.example` and update the Firebase values:

```bash
cp .env.example .env.local
```

Required frontend variables:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_FUNCTIONS_REGION=
VITE_ADMIN_EMAIL=
```

Optional AI/server variables:

```env
GEMINI_API_KEY=
APP_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Do not expose private server secrets in frontend code.

## Development

Start the local development server:

```bash
npm run dev
```

The Vite server runs on port `3000` by default and will try the next available port if `3000` is already in use.

## Available Scripts

```bash
npm run dev       # Start local development server
npm run build     # Build production assets
npm run preview   # Preview production build
npm run lint      # Run TypeScript checks
npm run clean     # Remove generated build/server files
```

## Firebase Setup

1. Create a Firebase project.
2. Enable Authentication providers used by the event.
3. Enable Cloud Firestore.
4. Enable Cloud Functions.
5. Add the Firebase web app config to `.env.local`.
6. Publish `firestore.rules` to your Firebase project.
7. Set `VITE_ADMIN_EMAIL` to the primary admin email.
8. Copy `functions/.env.example` to `functions/.env` and set `ADMIN_EMAIL` to the same primary admin email.
9. Deploy the backend with `firebase deploy --only functions`.

Firestore collections used by the app include:

- `registrations`
- `accountRegistrations`
- `teamNames`
- `participantEmails`
- `ideaSubmissions`
- `admins`
- `judges`
- `judgeAssignments`
- `scores`
- `announcements`
- `finalists`
- `userProfiles`

## Registration and QR Banner Flow

After a team registers, the app generates a verified team banner containing:

- Registration ID
- QR code
- Team leader name
- Team name
- College name
- Department/course
- District/location
- Phone number
- Selected innovation track
- Team size

Participants can access and download the QR pass later from the Profile panel.

## Admin and Judge Access

Admin access is controlled by `VITE_ADMIN_EMAIL` and the Firestore `admins` collection. Judge access is controlled through the `judges` collection and assigned review documents.

## Build

```bash
npm run build
```

Production assets are generated in `dist/`.

## Notes

- Keep `banar.png`, `fest_image.png`, and other required assets in the repository so builds and README previews render correctly.
- Firestore rules must be deployed for registration, dashboard, admin, and judge workflows to work in production.
- The frontend should never contain private API keys. Use server-side functions for AI or privileged operations.
