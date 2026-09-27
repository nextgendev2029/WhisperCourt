# Whisper Court ⚜

> **A social deduction courtroom where the AI never leaves the seat empty.**

Whisper Court is an autonomous AI multiplayer courtroom deduction game. In a tense imperial council chamber, human nobles and autonomous AI agents deliberate, question testimonies, cross-examine contradictions, and cast exile ballots to uncover a concealed traitor.

Unlike traditional AI deduction prototypes that fall apart when a player loses connection, Whisper Court introduces **Living Seats**: if a human disconnects, an autonomous AI immediately assumes the seat without resetting memory, trust, or alliances. When the player returns, their sovereign seat and character standing are seamlessly reclaimed.

---

## Live Demo

**Frontend:** [Whisper Court - Live Demo](https://whisper-court.vercel.app/)

**Backend:** [Whisper Court API](https://whispercourt.onrender.com/)

---

## ⚜ The Three Differentiators

```
┌───────────────────────────────────────────────────────────────────────────┐
│                               WHISPER COURT                               │
│         A Social Deduction Court Where The AI Never Leaves The Seat Empty │
└───────────────────────────────────────────────────────────────────────────┘
         │                                    │                       │
         ▼                                    ▼                       ▼
 1. LIVING SEATS                      2. SOCIAL MEMORY       3. SOCIAL OBSERVABILITY
 ────────────────                     ────────────────       ───────────────────────
 Human disconnects? The seat          Every statement is     Explore live contradictions,
 continues under AI. Character        ingested into private  causal trust shifts, social
 standing, memory, and public        trust ledgers with     heat tension, and post-game
 alliances remain uninterrupted.      causal rationales.     temporal social replay.
```

1. **Living Seats:** Seats belong to characters, not transient socket connections. Disconnects trigger a 15-second grace period before autonomous AI assumes control. Upon reconnecting with a sovereign session token, the human immediately reclaims their exact seat.
2. **Social Memory:** Agents do not merely react to the last prompt. Each courtier maintains an evolving memory ledger tracking historical trust, accusations made/received, public commitments, and verified contradictions.
3. **Social Observability:** Behind the dramatic courtroom UI sits the **Agent Observatory** - a zero-LLM forensic analysis engine surfacing emergent contradictions, social heat pairs, influence cascades, and causal relationship dossiers.

---

## 🏛 The Problem & The Solution

- **The Problem:** Social deduction games (Mafia, Werewolf, Blood on the Clocktower) require 5-10 synchronized players and collapse instantly if a player disconnects or leaves mid-round. Existing AI deduction demos are typically brittle single-player prompts with stateless LLM calls and no verifiable reasoning trace.
- **The Solution:** Whisper Court combines authoritative server-side room orchestration, persistent character seats, and bounded LLM call accounting. Human players and AI lords occupy identical seat structures with real-time WebSocket state synchronization.

---

## ⚔ Core Gameplay Loop

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   TESTIMONY     │ ───► │  PLAYER ACTION  │ ───► │  DELIBERATION   │
│ Courtiers speak │      │ Question/Accuse │      │ Trust updates & │
│ under royal oath│      │ Defend/Silence  │      │ Contradictions  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                                           │
┌─────────────────┐      ┌─────────────────┐               │
│   POST-GAME     │ ◄─── │     VERDICT     │ ◄─────────────┘
│ Observatory &   │      │ Wax-sealed vote │
│ Social Replay   │      │ Unmasking decree│
└─────────────────┘      └─────────────────┘
```

1. **Assembly & Oath:** The high council convenes with 4 to 6 lords. One is secretly anointed the Traitor.
2. **Spoken Testimony:** Courtiers deliver statements sequentially with cinematic spotlights. Bystanders visually recede.
3. **Player Interrogation & Agency:** When a player holds the floor, they can:
 - **Question Suspect:** Cross-examine an agent on specific claims.
 - **Formally Accuse:** Elevate social heat against a suspected traitor.
 - **Plead Defense:** Offer public justifications into the chamber record.
 - **Remain Silent:** Yield the floor strategically.
4. **Contradiction Discovery:** When statements conflict, a **Contradiction Detected** banner surfaces verbatim quotes with a 1-click `[ INVESTIGATE EVIDENCE ]` action opening the Observatory.
5. **Wax-Sealed Ballots:** During voting, courtiers cast decisive exile ballots. Peer deliberation statuses are indicated in real time.
6. **Verdict & Revelation:** A 3-tiered reveal displays vote distribution $\rightarrow$ royal banishment decree $\rightarrow$ unmasking of the true traitor.
7. **Forensic Debrief:** After proceedings conclude, players explore the **Court Replay** scrubber and complete **Court Analysis** journey graphs.

---

## ⚙ System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   FRONTEND (VITE/REACT)                │
│ Court Header • Testimony Feed • Roster • Observatory   │
│ Force Graph • Wax Ballot • Replay • Synthesized Audio  │
└────────────────────────────────────────────────────────┘
                           ▲
                           │ JSON via WebSocket / HTTP
                           ▼
┌────────────────────────────────────────────────────────┐
│               FASTAPI AUTHORITATIVE ENGINE             │
│   Rooms • Join Codes • Disconnect Grace • Host Migr.   │
└────────────────────────────────────────────────────────┘
         │                                       │
         ▼                                       ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│     GAME ENGINE         │             │      SOCIAL ENGINE      │
│  State Machine • Turns  │             │  Claims • Contradictions│
│  Phase Transitions      │             │  Social Heat • Dossiers │
│  Deterministic Voting   │             │  Post-Game Analysis     │
└─────────────────────────┘             └─────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│             INSTRUMENTED GROQ CLIENT LAYER             │
│  Bounded Concurrency (4) • LLM Telemetry Accounting    │
│  Request Timeouts (18s) • Exponential Backoff Retries  │
└────────────────────────────────────────────────────────┘
```

### Living Seat Continuity Architecture

```
PLAYER CONNECTS ──► Assigned character seat (e.g. Duchess Morvaine)
                          │
PLAYER LOSES CONNECTION ──► 15-Second Grace Countdown Broadcasted
                          │
GRACE PERIOD EXPIRES ─────► AI Controller seamlessly assumes SAME seat.
                          │ Character memory, trust scores & role remain intact.
                          │
PLAYER RECONNECTS ────────► Submits original sovereign player token.
                            Human control restored to the EXACT same seat.
```

---

## 📊 Strict LLM Call Budget (Non-Negotiable)

Whisper Court enforces strict centralized LLM accounting via `llm_telemetry.py`. Every API invocation is bounded and budgeted:

| Action / Phase | 1 Human + 3 AI (1 Round) | 1 Human + 3 AI (2 Rounds) | Incurred LLM Calls |
| :--- | :---: | :---: | :---: |
| **Living AI Speeches** | 3 | 6 | 1 call per living AI per round |
| **Trust Evaluations** | 6 | 12 | 2 calls per AI speech (evaluated by peers) |
| **Voting / Ballots** | 0 | 0 | **0 calls** (Deterministic multi-factor engine) |
| **Agent Observatory** | 0 | 0 | **0 calls** (Algorithmic claim/graph extraction) |
| **Contradiction Detection** | 0 | 0 | **0 calls** (Heuristic statement conflict engine) |
| **Court Replay Scrubber** | 0 | 0 | **0 calls** (Temporal diff event log) |
| **Court Transcript** | 0 | 0 | **0 calls** (Verbatim public event log) |
| **Relationship Dossiers** | 0 | 0 | **0 calls** (In-memory relationship ledgers) |
| **Seat Takeover / Reclaim**| 0 | 0 | **0 calls** (In-memory controller swap) |
| **Procedural Audio** | 0 | 0 | **0 calls** (Synthesized Web Audio API) |
| **TOTAL CALLS** | **9 Calls** | **18 Calls** | **Strictly Preserved** |

---

## 🔒 Privacy & Secret Boundaries

Whisper Court enforces strict boundaries between public courtroom knowledge and private strategic state:

| Information | Active Gameplay (Chamber) | Post-Game (Verdict / Debrief) |
| :--- | :--- | :--- |
| **Character Role (Traitor/Innocent)** | 🔒 **SEALED** (Except player's own role or GM View) | 👁️ **REVEALED** in decree |
| **Peer Private Trust Scores** | 🔒 **PRIVATE** (Evaluated secretly by each peer) | 👁️ **UNLOCKED** in Court Analysis |
| **Agent Memory Ledgers** | 🔒 **INTERNAL** (Only public statements broadcast) | 👁️ **INSPECTABLE** in Dossier |
| **Claims & Contradictions** | 🏛️ **PUBLIC EVIDENCE** (Derived from open testimony)| 🏛️ **HISTORICAL EVIDENCE** |
| **Vote Ballots** | 🔒 **CONCEALED** until voting phase resolves | 👁️ **FULL TALLY RECORDED** |

---

## 🛠 Technology Stack

- **AI Inference:** [Groq API](https://console.groq.com) using high-speed instruction models (`qwen/qwen3.8-27b`) with bounded concurrency (4) and deterministic fallbacks.
- **Backend:** Python 3.11+, FastAPI, WebSockets, Pydantic v2, `python-dotenv`, `uvicorn`.
- **Frontend:** React 19, Vite 8, Tailwind CSS v4, `react-force-graph-2d`.
- **Audio:** Pure procedural Web Audio API synthesis (gavel strikes, tension chords, wax seals, contradiction chimes) - zero external sound files.
- **State Architecture:** Authoritative in-memory room management (`RoomInfo`, `GameState`, `SeatInfo`) with deterministic fallback safety.

---

## 🚀 Local Setup & Installation

### Prerequisites

- **Python 3.11+**
- **Node.js 18+** & `npm`
- **Groq API Key:** Free at [console.groq.com](https://console.groq.com)

### 1. Repository Setup

```bash
git clone https://github.com/your-username/WhisperCount.git
cd WhisperCount
```

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create your `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit `backend/.env` with your Groq API key:

```env
GROQ_API_KEY=gsk_your_actual_key_here
PORT=8000
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Start the backend server:

```bash
uvicorn main:app --reload --port 8000
```

Verify backend health at: [http://localhost:8000/health](http://localhost:8000/health) $\rightarrow$ `{"status": "ok"}`

### 3. Frontend Setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open your browser to: [http://localhost:5173](http://localhost:5173)

---

## 🎬 Judge Demo & Watch Mode

For live hackathon evaluations, Whisper Court includes a **deterministic demo mode**:

1. Click **`WATCH THE COURT`** on the landing page (or click **`🎬 Run Full Demo`** inside any court chamber).
2. The engine automatically executes 2 full discussion rounds with a 1.5-second watchable delay between testimonies.
3. Observe live speaker spotlights, real-time trust graph shifts, surfaced contradiction alerts, and deterministic multi-factor voting leading to the unmasking verdict.
4. Open the **Court Replay** modal post-verdict to scrub through the chronological event timeline.

---

## 🧪 Comprehensive Test Suite

Whisper Court includes 8 automated test suites covering backend concurrency, seat continuity, telemetry accounting, and courtroom quality:

```bash
cd backend
source venv/bin/activate

# 1. Polish Quality & Security Suite (5 tests)
python test_polish_quality.py

# 2. Courtroom Experience & Replay Suite (6 tests)
python test_court_experience.py

# 3. Living Agents & Heuristic Reasoning Suite (25 tests)
python test_living_agents.py

# 4. Deterministic API Call Budget Audit (6 tests)
python test_audit_call_counts.py

# 5. Room Concurrency & Idempotency Locks (4 tests)
python test_concurrency_and_locks.py

# 6. Agent Observatory & Contradiction Detection (6 tests)
python test_observatory.py

# 7. Live Multiplayer Room Flow
python test_multiplayer.py

# 8. Real WebSocket Living Seat Continuity & AI Takeover
python test_continuity_live.py
```

Frontend production build check:

```bash
cd frontend
npm run build    # Compiles 1077 modules with 0 errors
```

---

## 📁 Repository Directory Structure

```
WhisperCount/
├── .gitignore                     # Environments, caches, build files
├── .env.example                   # Clean environment configuration template
├── README.md                      # Comprehensive project documentation
├── backend/
│   ├── .env.example               # Backend environment template
│   ├── requirements.txt           # Pinned production Python dependencies
│   ├── main.py                    # Authoritative room & WebSocket router
│   ├── game_engine.py             # Chamber phase loop & rules engine
│   ├── social_engine.py           # Claims, contradictions, heat, dossiers
│   ├── models.py                  # Pydantic state models (GameState, Agent)
│   ├── agent.py                   # System prompt builders & persona definitions
│   ├── groq_client.py             # Instrumented Groq client with concurrency limits
│   ├── llm_telemetry.py           # Centralized API call accounting manager
│   ├── test_polish_quality.py     # Final polish & security verification
│   ├── test_court_experience.py   # Replay & verdict experience tests
│   ├── test_living_agents.py      # Living agent memory & voting tests
│   ├── test_audit_call_counts.py  # Call budget assertion tests
│   ├── test_concurrency_and_locks.py # Lock safety & duplicate guard tests
│   ├── test_observatory.py        # Observatory extraction tests
│   ├── test_multiplayer.py        # Full multiplayer room scenario tests
│   └── test_continuity_live.py   # Live WebSocket seat takeover & reclaim
└── frontend/
    ├── package.json               # Node dependencies & scripts
    ├── vite.config.js             # Vite configuration with Tailwind CSS v4
    ├── index.html                 # Aristocratic typography & viewport tags
    └── src/
        ├── App.jsx                # Screen router (Landing, Setup, Lobby, Chamber)
        ├── App.css / index.css    # Courtroom color tokens & animations
        ├── screens/
        │   ├── MainMenu.jsx       # 30-Second Judge Landing Screen
        │   ├── GameSetup.jsx      # Court assembly & seat configuration
        │   ├── CourtLobby.jsx     # Multiplayer lobby & seat assignment
        │   └── GameShell.jsx      # Primary courtroom chamber orchestration
        ├── components/
        │   ├── CourtHeader.jsx    # Imperial chamber insignia & GM View
        │   ├── CreateCourtModal.jsx # Room convening dialog
        │   ├── JoinCourtModal.jsx # Summons code entry dialog
        │   ├── HowItWorksModal.jsx # Aristocratic court rules & loop diagram
        │   └── game/
        │       ├── TestimonyCard.jsx          # Spotlighted speaker transcript
        │       ├── CourtRoster.jsx            # Courtier standing & connection badges
        │       ├── DossierPanel.jsx           # Peer standing & trust metric panel
        │       ├── ContradictionBanner.jsx    # Real-time testimony conflict alert
        │       ├── ObservatoryDrawer.jsx      # Full forensic graph & dossiers
        │       ├── RelationshipDossierModal.jsx # Bilateral relationship history
        │       ├── VotingView.jsx             # Wax-sealed council ballot
        │       ├── VerdictModal.jsx           # 3-tier unmasking revelation
        │       ├── CourtReplayModal.jsx       # Causal event timeline scrubber
        │       ├── TranscriptModal.jsx        # Complete verbatim court record
        │       └── PhaseTransitionOverlay.jsx # Gold-leaf phase title banner
        └── utils/
            ├── network.js         # Dynamic API/WS base resolution with env fallback
            └── courtAudio.js      # Procedural Web Audio API synthesis engine
```

---

## 🚢 Deployment Preparation

Whisper Court is designed to deploy cleanly to modern cloud hosting platforms:

1. **Backend Deployment (e.g. Render, Railway, Fly.io, Cloud Run):**
 - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
 - **Environment Variables:** `GROQ_API_KEY`, `CORS_ORIGINS`
 - **Important Requirement:** The platform must support **persistent WebSocket connections** (`ws://` and `wss://`). Serverless function platforms with short HTTP execution timeouts (such as pure AWS Lambda or Vercel Serverless Functions) should not be used for the WebSocket room orchestrator.
2. **Frontend Deployment (e.g. Vercel, Netlify, Cloudflare Pages):**
 - **Build Command:** `npm run build`
 - **Output Directory:** `dist`
 - **Environment Variables:** `VITE_API_URL=https://whispercourt.onrender.com` and `VITE_WS_URL=wss://whispercourt.onrender.com`

---

## ⚖️ Known Limitations & Honest Technical Framing

Whisper Court is a **hackathon-winning real-time multiplayer prototype**, not an enterprise banking system:

1. **In-Memory Room Durability:** Room states and agent memory ledgers are held in memory on the authoritative backend server. Restarting the backend server clears active sessions.
2. **LLM Availability:** Speeches and trust evaluations depend on the Groq API. The application includes retry backoff and deterministic fallbacks (`"[Agent hesitates and says nothing.]"`), preventing crashes if an external rate limit occurs.
3. **Environment Playwright Note:** The local environment has a known system-level Playwright driver issue (404 on driver download), which does not affect Whisper Court runtime, build, or tests. All visual and interactive capabilities are verified through source inspection and automated test suites.

---

## ⚜ Final Assessment

Whisper Court communicates its premise within 30 seconds: **The Court Never Loses A Mind.** Living Seats ensure uninterrupted drama, Social Memory guarantees believable intrigue, and Social Observability allows judges and players to inspect why every betrayal occurred.
