# Hospital EMR - Electronic Medical Records System

A modern, simple hospital EMR web application built with Next.js 14, Tailwind CSS, and Supabase.

## Features

- **Patient Management**: Create, edit, search, and soft-delete patients
- **Patient History**: PMH, PSH, current medications, allergies, family/social history
- **Encounters (Admissions)**: Track patient admissions with status workflow
- **Diagnosis & Problem List**: Primary diagnosis and problem tracking per encounter
- **Clinical Notes**: CC, HPI, ROS, and Summary documentation
- **Timeline**: Chronological actions including transfers, treatments, investigations
- **Medications**: Dynamic start/stop medication tracking with automatic timeline entries
- **Authentication**: Secure login with Supabase Auth

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

### 1. Clone and Install

```bash
cd /Users/yusif/Dev/EMR
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to **Settings → API** and copy:
   - Project URL
   - Anon/Public key

3. Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set Up Database

1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Copy the contents of `supabase/schema.sql` and run it
4. This creates all tables, indexes, triggers, and RLS policies

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create Your First Account

1. Go to the login page
2. Click "Need an account? Sign up"
3. Enter email and password
4. Check your email for confirmation (if email confirmation is enabled in Supabase)

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/          # Login page
│   ├── (dashboard)/
│   │   ├── patients/       # Patients list & detail pages
│   │   └── encounters/     # Encounter detail page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Redirects to /patients
├── components/
│   ├── layout/             # Header component
│   ├── patients/           # Patient-specific components
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── supabase/           # Supabase client helpers
│   ├── types/              # TypeScript types
│   └── utils.ts            # Utility functions
└── middleware.ts           # Auth middleware
```

## Database Schema

### Tables

- **patients**: Patient demographics
- **patient_details**: Medical history (PMH, PSH, allergies, etc.)
- **encounters**: Admissions with status workflow
- **encounter_actions**: Timeline events
- **encounter_medications**: Active/stopped medications

### Key Principles

- **Soft delete**: All tables use `deletedAt` instead of hard delete
- **Timestamps**: `createdAt`, `updatedAt`, `deletedAt` on all tables
- **Auto-update**: Database triggers update `updatedAt` automatically

## Workflow

### Patient Workflow
1. Add patient with basic demographics
2. Fill in patient history details
3. Create encounters as needed

### Encounter Workflow
1. Create new encounter (status = ACTIVE)
2. Add diagnosis, problems, and clinical notes
3. Track medications (start/stop)
4. Document timeline events and transfers
5. Discharge or mark deceased when complete

### Medication Rules
- Adding a med creates a new row with status = ACTIVE
- Stopping a med sets status = STOPPED and stopAt = now
- Restarting requires creating a NEW medication row
- Timeline entries auto-generated for start/stop

## MVP Validation Rules

- **Patients**: fullName required, sex must be M/F/U if provided
- **Encounters**: status must be ACTIVE/DISCHARGED/DECEASED
- **Timeline**: type and text required
- **Medications**: name required, status must be ACTIVE/STOPPED

## Future Extensions

- Structured encounter problems table
- Roles & permissions
- File attachments
- Structured vitals table
- Lab/imaging orders and results
- Audit log / version history
- Discharge summary generator

## License

MIT

