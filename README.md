# 🍞 BreadBuddy — your money's bestie

> A Gen Z-coded financial AI assistant that helps college students track and manage the monthly allowance they get from their parents, so they never have to "go ask for more" mid-month 🤡

![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20TS-FF71CE?style=flat-square)
![Backend](https://img.shields.io/badge/backend-Express%20%2B%20SQLite-B47AEA?style=flat-square)
![Vibes](https://img.shields.io/badge/vibes-immaculate-39FF14?style=flat-square)

## ✨ What is this?

BreadBuddy is a full-stack web app built for college students to:
- 💸 Log every expense in seconds (munchies, drip, commute, subs, vibes — you name it)
- 📊 See where the bread is going with pretty charts
- 🤖 Chat with **Bro**, the AI finance bestie who roasts you when you blow it on Swiggy and hypes you up when you lock in
- 🔮 Get a vibe-check on your burn rate ("bestie, you will hit ₹0 by the 23rd, lock in 🛑")

## 🛠️ Tech Stack

| Layer    | Tech                                              |
| -------- | -------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Recharts  |
| Backend  | Node.js, Express, TypeScript, better-sqlite3       |
| Auth     | JWT + bcrypt                                       |
| AI       | Rule-based intent engine w/ Gen Z personality      |

## 🚀 Quick Start

### Requirements
- **Node.js ≥ 22.5.0** (needed for the built-in `node:sqlite` module)
- npm (comes with Node)

### One-click run (Windows)
```bash
# Just double-click run.bat — it installs deps, creates .env, and starts both servers
run.bat
```

### Manual run
```bash
# 1. Install everything
npm run install:all

# 2. Run the full stack (server on :4000, client on :5173)
npm run dev

# Then open http://localhost:5173 and sign up!
```

For production:

```bash
npm run build
npm start
```

## 🗂️ Project Structure

```
breadbuddy/
├── client/   # React + Vite frontend
└── server/   # Express + SQLite backend
```

## 🤖 Meet Bro (the AI)

Bro is the chat-based assistant that reads your expense data and replies with
Gen Z energy. Examples:

- 🟢 *"You're in your savings era ✨ keep going bestie."*
- 🔴 *"BFFR 💀 you spent 38% on munchies. We need an intervention."*
- 🤖 *"At this burn rate you'll hit ₹0 by the 22nd. Lock in."*

It supports:
- 💸 Spending summaries
- 🍕 Category breakdowns (food, transport, party, …)
- 🛒 "Can I afford ₹X?" checks
- 🔮 Burn-rate predictions
- 📈 Saving tips & motivation
- 🎉 Girl-math justifications (bestie, ₹2000 dress worn 30x = ₹66/day)

## 📜 License

MIT
