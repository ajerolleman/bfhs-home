# GEMINI Context: BFHS Internal Student Portal

This document provides essential context for Gemini AI interactions within the **BFHS Internal Student Portal** repository.

---

## 🚀 Project Overview
The **BFHS Internal Student Portal** is a specialized dashboard designed for students of Ben Franklin High School. It serves as a centralized hub for school schedules, administrative links, technical resources, and AI-driven academic support.

### Core Objectives
- **Smart Scheduling:** Real-time countdowns to classes and periods based on the school's block schedule.
- **Academic Support:** A Gemini-powered AI assistant ("BFHS Help") grounded in the Student Handbook and optimized for "Study Mode" (tutoring over direct answers).
- **Gamified Productivity:** A "Falcon Focus" mode that rewards students with XP, levels, and ranks for focused study sessions.
- **Technical Utility:** Easy access to guides for school WiFi (PaperCut), printing, and PowerSchool.

---

## 🛠️ Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS.
- **Backend/Auth:** Firebase (Firestore, Authentication restricted to `@bfhsla.org`).
- **AI Integration:** Google Gemini API (`@google/genai`) using the `gemini-3-flash-preview` model.
- **External APIs:** Spotify Web Playback for integrated focus music.

---

## 📂 Project Structure
- `components/`: UI modules (Header, FocusOverlay, ChatPanel, RankModal, etc.).
- `services/`: Core logic for external integrations (`firebase.ts`, `geminiService.ts`, `authService.ts`).
- `utils/`: Reusable helper functions, specifically for `gamification.ts` (XP curves and rankings).
- `data/`: Static school data, including `handbookData.ts`.
- `App.tsx`: The main application orchestrator.
- `constants.ts`: Global configuration, including the `BLOCK_SCHEDULE` and `BFHS_SYSTEM_PROMPT`.

---

## 📜 Development Conventions

### UI & Styling
- **Aesthetic:** Modern "Liquid Glass" / OLED-inspired design. High use of `backdrop-blur`, semi-transparent backgrounds (`bg-white/10`), and `ease-spring` transitions.
- **Responsiveness:** Mobile-first approach using Tailwind's responsive prefixes.

### AI Behavior (BFHS Help)
- **Identity:** Refers to BFHS as "we/our".
- **Source Priority:** Must prioritize the Student Handbook and official school links over general knowledge.
- **Study Mode:** If a student asks a direct academic question, the AI must shift to a pedagogical approach—asking guiding questions instead of solving the problem.
- **Optimization:** Uses a local cache and an `FAQ_SHORT_CIRCUITS` dictionary in `geminiService.ts` to reduce API costs for common questions (e.g., "dress code", "wifi").

### Data Logic
- **Grade Parsing:** Student grades are inferred from the graduation year in their email prefix (e.g., `25...` -> Class of 2025).
- **Gamification:** XP is calculated based on study minutes (10 XP/min) with streaks and tiered ranks ranging from "Falcon Fledgling" to "Time Lord".

---

## ⚙️ Building & Running
- **Install Dependencies:** `npm install`
- **Development Server:** `npm run dev`
- **Build for Production:** `npm run build`
- **Preview Build:** `npm run preview`
- **Deployment:** Targets Google Cloud Run (configured via `Dockerfile` and `gcloud`).

---

## 🧪 Testing & Quality
- **Type Checking:** Run `npx tsc --noEmit` to verify TypeScript integrity.
- **Pre-commit:** Ensure no secrets or API keys are exposed (Gemini API key should be in `.env` as `VITE_GEMINI_API_KEY`).
