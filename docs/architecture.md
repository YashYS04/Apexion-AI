# Apexion AI - System Architecture

Apexion AI replicates the high-pressure, telemetry-heavy environment of a Formula 1 pit wall. The platform utilizes real-time physics modeling, custom document retrieval (RAG), and generative AI reasoning to make strategy predictions.

---

## 1. System Design Graph

Below is the end-to-end information flow, tracing metrics from F1 telemetry inputs to the Next.js visual dashboard:

```
[ Telemetry Ingestion ]
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Backend                      │
│                                                         │
│  ┌────────────────────────┐   ┌──────────────────────┐  │
│  │   Telemetry Streamer   │   │  Strategy Simulator  │  │
│  │  (Reads JSON Replays / │   │                      │  │
│  │   Math fallback waves) │   │  - Tyre Wear curves  │  │
│  │                        │   │  - Fuel Weight delta │  │
│  └───────────┬────────────┘   │  - Pit Lane Loss     │  │
│              │                └──────────┬───────────┘  │
│              ▼                           │              │
│      [WebSocket /ws]                     ▼              │
│              │                   [REST POST /api/sim]   │
└──────────────┼───────────────────────────┼──────────────┘
               │                           │
               ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│               Next.js 15 Frontend Deck                  │
│                                                         │
│  ┌────────────────────────┐   ┌──────────────────────┐  │
│  │   Live Dashboard UI    │   │  Strategy Planner    │  │
│  │  - Speed/RPM charts    │   │  - Pit stint builder │  │
│  │  - Input correlation   │   │  - Projected gains   │  │
│  │  - Heatmap tyre grid   │   │  - Stint wear curves │  │
│  └────────────────────────┘   └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Explainable AI & RAG Pipeline

For RAG query processing and reasoning:

```
                  [ User Question ] (e.g. "Should we pit under VSC?")
                          │
                          ▼
             ┌─────────────────────────┐
             │      FastAPI Route      │
             │   (copilot/chat API)    │
             └────────────┬────────────┘
                          │
                          ▼
             ┌─────────────────────────┐
             │      RegulationRAG      │
             │  (Scans sporting rules  │
             │   & finds citations)    │
             └────────────┬────────────┘
                          │
                          ▼
             ┌─────────────────────────┐
             │   RaceEngineerAgent     │
             │                         │
             │  - Ingests Telemetry    │
             │  - Binds RAG direct     │
             │  - Combines prompts     │
             └────────────┬────────────┘
                          │
       ┌──────────────────┴──────────────────┐
       ▼ (Keys configured)                   ▼ (No Keys - Offline)
┌─────────────────────────────┐       ┌─────────────────────────────┐
│       LangFlow Server       │       │    Local F1 Expert Core     │
│  - WatsonX IBM Granite      │       │  - Code-level heuristics    │
│  - JSON response parser     │       │  - Formats thoughts,        │
│                             │       │    citations, and actions   │
└──────────────┬──────────────┘       └──────────────┬──────────────┘
               │                                     │
               └──────────────────┬──────────────────┘
                                  │
                                  ▼
                     [ Structured Output Response ]
                     - Thoughts chain graph list
                     - Final radio answer (Engineering vs Fan)
                     - Exact rule citations
                     - Projected actions (PIT NOW)
```

---

## 3. Physics Simulator Formulas

The Strategy Time Machine calculations are performed in `backend/app/services/strategy_model.py` based on motorsport engineering parameters:

### 3.1. Tyre Degradation (Wear Effect)
Tyre wear increases non-linearly with lap count, accelerated by track temperature:
$$\text{wear\_pct} = \min(100, \text{lap} \times \text{base\_wear\_rate} \times \text{temp\_modifier})$$

Where:
$$\text{temp\_modifier} = 1.0 + (\text{track\_temp} - 35) \times 0.015 \quad (\text{if track\_temp} > 35^\circ\text{C})$$

If wear exceeds $35\%$, a thermal/traction grip penalty is added to the laptime:
$$\text{deg\_effect} = \left(\frac{\text{wear\_pct} - 35}{10}\right)^{\alpha} \times \text{wear\_penalty\_factor}$$

- **Soft Compound:** $\alpha = 1.6$, wear penalty = $0.15\text{s}$
- **Medium Compound:** $\alpha = 1.3$, wear penalty = $0.09\text{s}$
- **Hard Compound:** $\alpha = 1.1$, wear penalty = $0.05\text{s}$

### 3.2. Fuel Load Weight Penalty
The car gets lighter by burning fuel lap-by-lap, which makes it faster:
$$\text{fuel\_effect} = \text{fuel\_left} \times \text{fuel\_penalty\_factor}$$

- **Silverstone fuel burn rate:** $1.6\text{kg/lap}$
- **Fuel penalty coefficient:** $0.03\text{s/kg}$

### 3.3. Lap Time Calculation
$$\text{lap\_time} = \text{base\_laptime} + \text{compound\_pace\_offset} + \text{deg\_effect} + \text{fuel\_effect} + \text{pit\_time\_loss}$$

- **Pit Time Loss:** $20.5\text{s}$ (Silverstone) or $25.0\text{s}$ (Monaco) added only on the lap the driver enters the pits.
