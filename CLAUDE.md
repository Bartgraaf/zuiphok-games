# CLAUDE.md

## Project Overview

Build a local-first multiplayer challenge game mobile application.

The app allows admins to create games with tasks/challenges that teams complete together by submitting photos, videos, and text. All submissions must include timestamps and geolocation data.

The application must prioritize:
- Reliability
- Offline persistence
- Autosave
- Ease of use
- Real-time collaboration
- Local-first development

Everything must run and be tested locally first.

---

# Core Stack

## Mobile App
- React Native
- Expo (preferred unless native modules are required)
- TypeScript

## Backend
- Node.js
- Fastify (preferred) or Express
- Socket.IO

## Database
- PostgreSQL
- Prisma ORM

## Frontend
- NativeWind or Tailwind for React Native
- React Hook Form
- Zustand (preferred) or Redux Toolkit
- Zod validation
- React Query / TanStack Query

## Authentication
- Google SSO
- Email/password login
- Email confirmation

## Storage
- Local filesystem for uploaded media
- PostgreSQL for metadata
- AsyncStorage + SQLite for offline persistence

---

# Product Goals

The app should feel:
- Fast
- Simple
- Reliable
- Persistent
- Collaborative

The app must preserve state between app restarts.

Examples:
- Uploaded photos/videos still exist after reopening app
- Draft text survives crashes/restarts
- Interrupted uploads can resume
- Team progress is synchronized live
- Offline submissions sync automatically later

---

# Core Features

## Authentication

Implement:
- Email/password signup
- Email verification
- Login
- Google OAuth SSO
- Persistent sessions
- Secure logout

Requirements:
- Password hashing
- Secure token storage
- Session persistence

Use:
- Expo Auth Session or Firebase/Auth provider equivalent
- SecureStore for tokens

---

# User Roles

## Admin

Admins can:
- Create games
- Edit/delete games
- Create tasks
- Invite users
- Create/manage teams
- Monitor submissions
- View progress

## Player

Players can:
- Join games via invite link
- Join teams
- View tasks
- Submit photo/video/text
- View team progress
- Continue unfinished submissions

---

# Game System

## Game

Fields:
- id
- name
- description
- status
- inviteCode
- startDate
- endDate

Statuses:
- Draft
- Active
- Finished

---

# Teams

Requirements:
- Shared progress
- Shared submissions
- Real-time updates

Fields:
- id
- name
- gameId

---

# Tasks

Each game contains tasks.

## Task Requirements

Each task may require:
- Photo upload
- Video upload
- Text submission
- Combination of all

Fields:
- id
- gameId
- title
- description
- taskType
- points
- requiresLocation
- timeLimit

---

# Submission System

Submissions must support:
- Images
- Videos
- Text
- Multiple uploads

Store:
- Timestamp
- User
- Team
- Location
- Media metadata

---

# Geolocation

When submitting:
- Automatically capture GPS location
- Save latitude/longitude
- Optionally reverse geocode readable location
- Display mini-map preview

Use:
- Expo Location API

---

# Persistence Requirements (CRITICAL)

This app MUST preserve all important state.

Required:
- Autosave drafts
- Restore unfinished work
- Offline-safe behavior
- Upload retry system
- Persistent local media storage

Implement:
- AsyncStorage
- SQLite persistence
- Background sync queue
- Draft persistence
- Crash recovery
- Upload retry queue

The app should work even with poor/no internet.

---

# Real-Time Multiplayer

Use Socket.IO or WebSockets.

Required sync events:
- Team member uploads submission
- Task completion updates
- Admin edits task
- Team progress updates

Other users should see updates instantly.

---

# Media Upload System

Requirements:
- Camera uploads
- Gallery uploads
- Upload progress
- Retry failed uploads
- Thumbnail generation
- Compression for large files

Support:
- Images
- Videos
- Text attachments

Use:
- Expo Image Picker
- Expo Camera
- Expo FileSystem
- Expo AV

---

# UX Requirements

Prioritize:
- Minimal clicks
- Large touch-friendly UI
- Fast startup
- Dark mode
- Responsive layouts
- Smooth reconnection handling
- Clear upload states
- Reliable autosave feedback

The UX should feel:
- Mobile-first
- Fast
- Extremely simple

---

# Suggested Architecture

## Frontend Structure

/src
/modules
/components
/screens
/navigation
/hooks
/services
/stores
/utils

---

# Backend Structure

/apps/api
/packages/shared

Suggested:
- Shared TypeScript types
- Shared validation schemas
- Shared API contracts

---

# Database Models

## User
- id
- name
- email
- passwordHash
- role
- createdAt

## Game
- id
- name
- description
- status
- inviteCode

## Team
- id
- name
- gameId

## TeamMember
- id
- userId
- teamId

## Task
- id
- gameId
- title
- description
- taskType
- points

## Submission
- id
- taskId
- teamId
- userId
- text
- locationLat
- locationLng
- submittedAt

## Media
- id
- submissionId
- filePath
- mimeType
- thumbnailPath

---

# API Requirements

Build:
- REST API
- WebSocket event layer

Endpoints:
- auth/*
- games/*
- teams/*
- tasks/*
- submissions/*
- uploads/*

---

# MVP Priorities

Build in this order:

## Phase 1
- React Native setup
- Authentication
- PostgreSQL + Prisma
- Basic app shell

## Phase 2
- Games
- Teams
- Invite system
- Tasks

## Phase 3
- Media uploads
- Persistence
- Autosave
- Offline cache

## Phase 4
- Real-time synchronization
- Team collaboration

## Phase 5
- Polish
- Reliability improvements
- Reconnection handling

---

# Security Requirements

Implement:
- Secure password hashing
- File validation
- File size limits
- Authorization checks
- Protected routes
- Sanitized input
- Upload restrictions

Prevent:
- Unauthorized game access
- Invalid uploads
- Injection attacks

---

# Nice-to-Have Features

If simple to implement:
- QR invite codes
- Team chat
- Push notifications
- Task timers
- Leaderboards
- Admin approval flow
- Interactive map
- Media gallery
- AI moderation

---

# Engineering Principles

Always prioritize:
1. Reliability
2. Persistence
3. Simplicity
4. Scalability
5. Offline-first UX

Avoid:
- Overengineering
- Unnecessary cloud dependencies
- Complex microservices
- Premature optimization

---

# Important UX Principles

The app should never lose user work.

Examples:
- Draft text autosaves instantly
- Upload resumes after reconnect
- App crash does not remove progress
- Team members always see latest updates

Users should trust the app completely.

---

# Local Development Requirements

Provide:
- Docker setup for PostgreSQL
- Local environment configs
- Seed scripts
- Prisma migrations
- Development scripts
- Expo startup scripts

Everything must work locally before any cloud deployment.

---

# Deliverables

Generate:
- Full architecture
- Prisma schema
- React Native setup
- API layer
- Screens/components
- WebSocket implementation
- Upload system
- Offline persistence layer
- Autosave system
- Local dev environment
- Docker configuration
- Setup documentation

---

# Coding Standards

Use:
- Strict TypeScript
- ESLint
- Prettier
- Modular architecture
- Shared types
- Zod validation everywhere

Prefer:
- Composition over inheritance
- Reusable hooks/components
- Clear folder structure
- Strong typing

---

# Final Goal

Build a polished MVP that feels:
- Reliable
- Collaborative
- Fast
- Persistent
- Production-ready

The most important feature is preserving user progress and media safely across sessions and reconnects.