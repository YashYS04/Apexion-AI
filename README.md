# Apexion AI // Explainable AI Race Engineer

Apexion AI is a hackathon-winning, production-quality F1 pit-wall strategy optimizer and telemetry dashboard. It represents the ultimate decision support cockpit for motorsport strategy, helping drivers and pit crews decide when to pit, predict tyre failures, simulate alternate pit window lines, and cross-reference complex FIA regulations using an explainable AI engineer.

---

## 1. Core Modules

1. **AI Race Engineer Copilot (Chat)**
   - Resolves F1 questions like "Should we box now?" or "Why are lap times dropping?".
   - Connects to WatsonX IBM Granite or uses a fallback local rule engine to explain rationale.
   - Dual UI presentation: **Engineering Mode** (tire degradation index, carcass temps, FIA article citations) vs **Fan Mode** (simplifies metrics using analogies).
   
2. **Live Telemetry Console**
   - High-tech, F1-style dark deck streaming speed, RPM, throttle/brake pedal inputs, gearbox gears, and fuel load.
   - Live 4-tire heatmaps rendering tyre wear bars, thermal states (cold/optimal/overheating), and issue warning indicators.
   
3. **Embedded F1 Racing Simulator**
   - Pseudo-3D (Road Rash/Outrun style) canvas driving simulator with rear chase camera.
   - Auto-drives dynamically or allows manual keyboard steering (W/A/S/D) to generate live telemetry.
   - Feeds live dashboard charts, metrics, and backend AI analysis in real time.
   
4. **Strategy Time Machine (Simulator)**
   - Interactive planner letting you design stint structures (e.g., start on Medium, pit on Lap 22 for Hards).
   - Computes degradation rate, fuel weight curves, pit entry time loss, and outputs cumulative race delta vs baseline.
   
4. **Regulations RAG (Docling)**
   - Processes FIA regulations.
   - Grounding query interface returning chunks, source references, and confidence relevance scores.

5. **Historical Race Replays**
   - Preloaded logs of iconic Grand Prix moments:
     * *Silverstone 2020:* Lewis Hamilton winning on 3 wheels after a front-left puncture on the final lap.
     * *Monaco 2022:* Dynamic rain drying transitions causing pit stops strategy double-stack chaos.

---

## 2. Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, Recharts.
- **Backend:** FastAPI (Python), WebSockets (async live stream), Uvicorn.
- **AI Core:** IBM Granite LLM models ("ibm/granite-13b-instruct-v2"), LangChain, LangFlow orchestrator.
- **RAG Engine:** Docling PDF/Markdown parser, RegulationRAG (semantic keyword indexes).

---

## 3. Directory Layout

```
Apexion AI/
├── frontend/             # Next.js 15 React web deck
├── backend/              # FastAPI server (rest endpoints & WS stream)
├── ai-engine/            # RAG parser and IBM Granite LangChain clients
├── langflow/             # LangFlow orchestration graph JSON
├── datasets/             # Regulation drafts and telemetry historical logs
├── docs/                 # Systems design guides and formulas
└── README.md             # Project documentation
```

---

## 4. Setup & Installation

### 4.1. Prerequisites
- Python 3.10+
- Node.js 18+

### 4.2. Running Backend Services
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend/` directory:
   ```env
   # (Optional) If provided, connects live to WatsonX/IBM Cloud:
   IBM_GRANITE_API_KEY=your_ibm_api_key
   WATSONX_PROJECT_ID=your_watsonx_project_id
   ```
5. Launch the FastAPI server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

### 4.3. Running Frontend Web Console
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Boot the Next.js dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Hackathon Demo Walkthrough Flow

Here is how to demonstrate Apexion AI to judges in a 3-minute pitch:

1. **Dashboard Replay Sync:**
   - Go to the **Live Telemetry** page.
   - Select the **British GP 2020 (Silverstone)** session profile.
   - Click **Stream Telemetry** (Play).
   - Show the charts updating live. Fast forward to **Lap 52** (using 2x or 5x speed) and watch the *Front-Left tyre wear hit 100%* and trigger the **TYRE DELAMINATION** alert in the pit-wall ticker.
   
2. **F1 Cinematic Simulator Driving:**
   - On the same **Live Telemetry** dashboard, click **Launch Simulator**.
   - Watch the pseudo-3D F1 arcade game drop down and begin driving itself automatically (Autopilot mode).
   - Point out that the speedometers, input meters (throttle/brake), and Recharts traces are updating in real time using the game's physics!
   - Toggle **Manual Mode** and drive using `W/A/S/D` to generate custom telemetry curves.
   
3. **Strategy Simulation (Time Machine):**
   - Go to the **Strategy Simulator** page.
   - Select **Silverstone Circuit**. Set starting tyre to **Medium**.
   - Add a planned pitstop on **Lap 20** for **Hard** tyres. Click **Run Physics Simulation**.
   - Review the projected position gains, tyre wear charts, and explainable insights.
   
4. **AI Copilot (Live Sim Analysis):**
   - Keep the simulator running, and navigate to the **AI Race Copilot** page.
   - Type *"Why are lap times increasing?"* or *"Should we pit now?"* and press Enter.
   - The AI will read the live simulator's tyre wear and temps context, generate a step-by-step thinking trace, and recommend an action (e.g. *BOX BOX BOX*).
   - Toggle to **Fan Deck** to see the explanation rewrite itself using analogies (comparing tyre wear to sliding on ice).

---

## 6. Future Scope
- **Voice AI Race Engineer:** Convert the chat system into a voice-to-voice link using WebRTC so drivers can talk directly over team radio.
- **FastF1 Live API Ingest:** Direct sockets hookup to live timing streams during official FIA Grand Prix sessions.
- **Predictive tyre blowout alerts:** Machine learning anomaly detectors running on suspension loads.
