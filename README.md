# Adaptive Interview Challenge

A local-first mock interview application built with a C++17 Crow server and a vanilla HTML/CSS/JavaScript frontend. Questions are composed in the browser from reusable topics, concepts, formats, scenarios, and difficulty. Answers are assessed by a transparent C++ rule-based engine. No AI provider, external inference service, API key, or fixed bank of complete questions is used.

Candidate details, interview progress, submitted answers, and reports are saved in browser LocalStorage. The backend keeps no interview sessions; it only validates and scores an answer sent by the browser.

## Features

- Categories: C++, Java, Python, Data Structures, DBMS, Operating Systems, Computer Networks, OOP, HR Interview, and General Technical Interview.
- Question formats: conceptual, practical, scenario, problem-solving, compare-and-contrast, and real-world application.
- Questions adapt to the selected role, experience, category, difficulty, past topics, and previous scores. Repeated topics are avoided until other topics have been covered; exact question repeats are avoided within the session.
- The C++ evaluator checks configured concept and keyword coverage, answer length, relevance, completeness, and selected contradictory statements. Its scores are heuristic, not semantic or AI judgments.
- Difficulty rises for scores of 8–10, stays for scores of 5–7, and falls for scores of 0–4.
- The final report includes scores, percentage, difficulty progression, strong and weak topics, missing concepts, and improvement suggestions.
- In-progress sessions restore from LocalStorage after reload.

## Run locally

### One-click Windows setup

Install CMake 3.20+, Git for Windows, and a C++17 compiler available on `PATH`. Double-click `RUN_PROJECT.bat`. It configures and builds the C++ backend, starts it on port 8080, waits for its health check, and opens `http://localhost:8080`. Use `STOP_PROJECT.bat` to stop this project's server.

An internet connection is needed on the first CMake configure to fetch Crow, Asio (when not installed), and nlohmann/json. Runtime interview questions and evaluations do not require internet access or credentials.

### Manual build and run

```powershell
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
.\build\adaptive-interview.exe
```

The server listens on port 8080 by default. Set `PORT` to use another port. The frontend and evaluator are served by the same C++ process.

## How question generation works

The frontend stores topic/concept metadata per interview category, plus reusable question formats and scenario fragments. For each question it selects concepts using topic history and prior scores, then composes a new prompt with the candidate's role and current difficulty. It tracks exact question text to avoid duplicates and stores the result in LocalStorage. The metadata is not a list of complete questions.

## How answer evaluation works

The browser sends the current question's expected concepts/keyword groups and candidate answer to `POST /api/evaluate`. The C++ engine normalizes text, matches phrase alternatives, measures concept and keyword coverage, checks a difficulty-specific minimum explanation length, and looks for configured contradiction phrases. It returns 0–10 scores, matched and missing concepts/keywords, and targeted improvement feedback. This is a rule-based practice aid; it does not understand meaning like a human reviewer.

## API

All endpoints are served by the C++ backend:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Backend and evaluator status |
| `POST` | `/api/evaluate` | Rule-based evaluation for the supplied question and answer |

Interview setup, question generation, progression, reporting, and persistence happen in the browser.

## Deploy

The included `Dockerfile` builds the C++ server and `render.yaml` configures a Render web service. Connect this repository to Render as a Blueprint; no provider credentials or secret environment variables are required. Render supplies `PORT` automatically.

The frontend itself is static HTML, CSS, and JavaScript, but answer evaluation requires the C++ backend. Static hosting alone is not sufficient unless `/api/evaluate` is routed to a running instance of this backend.

## Tests

Run the C++ evaluator and service tests with:

```powershell
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
ctest --test-dir build --output-on-failure
```
