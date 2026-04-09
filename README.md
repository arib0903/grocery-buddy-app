# 🛒 Grocery Buddy

A **cross-platform mobile app** (iOS + Android) for households to collaboratively plan, manage, and execute grocery shopping trips — with voice control, real-time sync across family members, and an intelligent in-store shopping mode.

---

## Features

### Authentication & Households
- Sign up / log in via **AWS Cognito** (email/password + social OAuth)
- Create or join a **household** — a shared space for your family's lists
- Each user has a profile with a display name used to show who added items

### Grocery List Management
- Create named lists tied to a specific **store** (Costco, Whole Foods, Trader Joe's, etc.)
- Lists are **reusable blueprints** — you never destroy a list by shopping from it
- Add, edit, delete, and reorder items with optional **quantity** and **price** fields
- Items track `addedBy` so you know who put what on the list
- Search and filter lists on the home screen

### Shopping Mode (In-Store Experience)
- Tap **"Start Shopping"** to create a live shopping session from a list snapshot
- Items can be **toggled as complete** (checked off) without altering the original list
- Items grouped by **aisle/category** for faster navigation through the store
- A **progress indicator** shows how many items are checked vs. remaining
- Session is archived when done, preserving purchase history

### Real-Time Collaboration
- Multiple family members can be in the same shopping session simultaneously
- Item completions sync **live** across all connected devices (no refresh needed)
- Powered by **AWS AppSync** subscriptions (GraphQL over WebSocket)
- Conflict resolution handled server-side

### Voice Commands
- Hands-free item management: *"Add two gallons of milk"*, *"Remove eggs"*, *"Mark bread as done"*
- Works during list editing and shopping mode
- Voice pipeline processes natural language and maps it to context CRUD operations

### In-App Messaging / Chat
- Each grocery list has an attached **chat thread**
- Family members can leave notes tied to specific items: *"Get organic if they have it"*
- Messages persist and are visible during shopping mode

### Persistent Data & Offline Support
- Local data persisted with **AsyncStorage** so nothing is lost on app restart
- Offline queue: changes made without internet sync when reconnected
- Cache-first reading, network sync in background

---

## Technical Specification

### Mobile (Client)

| Layer | Technology |
|---|---|
| Framework | **Expo** (~54) + **React Native** (0.81) |
| Language | **TypeScript** |
| Routing | **Expo Router** (file-based, dynamic routes) |
| State | **React Context API** + custom hooks |
| UI | React Native primitives + `@expo/vector-icons` |
| Local Storage | **AsyncStorage** |
| Voice | Expo Speech / React Native Voice → NLP pipeline |
| Testing | **Jest** (jest-expo, ts-jest, @testing-library/react) |

### Backend (AWS Cloud)

| Service | Role |
|---|---|
| **AWS Cognito** | User authentication, household identity, JWT tokens |
| **AWS AppSync** | GraphQL API layer — queries, mutations, and real-time subscriptions |
| **AWS DynamoDB** | Primary NoSQL database for lists, items, sessions, messages |
| **AWS Lambda** | Business logic handlers (validation, voice NLP processing, notifications) |
| **AWS S3** | Media/attachment storage for item photos or receipts |
| **AWS SNS / Push** | Push notifications (e.g., "Your partner started shopping") |
