# Healio

A full-stack diet & nutrition planner that helps users track daily meals, log body metrics, set health goals, discover recipes, and monitor progress.

Built with **React + Vite** (frontend) and **Express + MongoDB** (backend).

---
## Demo URL

https://healio-wpvu.onrender.com
---
## Features

- **Meal Logging** — Track breakfast, lunch, dinner, and snacks with food search powered by [Open Food Facts](https://world.openfoodfacts.org/)
- **Macro Tracking** — Visualize calories, protein, carbs, fat, and fiber with charts and progress rings
- **Health Goals** — Choose from Weight Loss, Muscle Gain, Maintenance, or Clean Eating with auto-calculated targets
- **Recipe Discovery** — Browse personalized recipe suggestions via [Edamam API](https://developer.edamam.com/)
- **Progress Charts** — Track weight trends, calorie history, and meal-logging streaks
- **Google OAuth** — Sign in with Google or use email/password authentication
- **Responsive Design** — Works on desktop and mobile with adaptive sidebar/bottom navigation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Chart.js, Recharts |
| Backend | Node.js, Express, Mongoose, JWT |
| Database | MongoDB (Atlas or local) |
| Auth | JWT + Google OAuth 2.0 |
| APIs | Open Food Facts, Edamam Recipes |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (or local MongoDB)
- [Edamam Developer](https://developer.edamam.com/) account (for recipe search)
- [Google Cloud Console](https://console.cloud.google.com/) project (for Google Sign-In)

### Installation

```bash
# Clone the repository
git clone https://github.com/apshariq1/Healio.git
cd Healio

# Install all dependencies (root package.json handles both frontend and backend)
npm install
```

### Environment Variables

Copy the example files and fill in your real values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

#### Backend `.env`

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Strong random string for JWT signing |
| `CLIENT_URL` | Frontend URL for CORS |
| `EDAMAM_APP_ID` | Edamam API app ID |
| `EDAMAM_APP_KEY` | Edamam API app key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |

#### Frontend `.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (e.g. `http://localhost:5000/api`) |
| `VITE_GOOGLE_CLIENT_ID` | Same Google OAuth client ID as backend |

### Development

Run both frontend and backend concurrently in separate terminals:

```bash
# Terminal 1 — Backend (on port 5000)
npm run dev:backend

# Terminal 2 — Frontend (on port 3000)
npm run dev:frontend
```

Or run tests:

```bash
# Backend tests (Jest + Supertest)
npm run test:backend
```

### Production Build

```bash
npm run build
```

This builds the frontend into `frontend/dist/`. The Express server is configured to serve these static files in production.

---

## Deployment on Render

### Option A: Blueprint (render.yaml)

1. Push this repo to GitHub.
2. In Render, click **New +** → **Blueprint**.
3. Connect your GitHub repo.
4. Render will read `render.yaml` and create the web service automatically.
5. Go to the service's **Environment** tab and manually add:
   - `MONGODB_URI`
   - `EDAMAM_APP_ID`
   - `EDAMAM_APP_KEY`
   - `GOOGLE_CLIENT_ID`

### Option B: Manual Web Service

1. In Render, click **New +** → **Web Service**.
2. Connect your GitHub repo.
3. Configure:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `cd backend && npm start`
   - **Publish Directory:** (leave empty — Express serves the files)
4. Add environment variables from the tables above.

---

## Project Structure

```
Healio/
├── backend/
│   ├── config/          # Database connection
│   ├── middleware/      # Auth & error handling
│   ├── models/          # Mongoose schemas (User, MealLog, etc.)
│   ├── routes/          # API endpoints
│   ├── tests/           # Jest test suites
│   ├── utils/           # Macro calculation utilities
│   ├── .env.example     # Template for backend env vars
│   ├── .gitignore
│   └── server.js        # Express entry point
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios client
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # Auth context
│   │   ├── pages/       # Route-level pages
│   │   ├── App.jsx      # Router setup
│   │   └── main.jsx     # Entry point
│   ├── .env.example     # Template for frontend env vars
│   ├── .gitignore
│   └── vite.config.js   # Vite configuration
├── .gitignore           # Root gitignore
├── package.json         # Root scripts for Render
├── render.yaml          # Render blueprint config
└── README.md            # This file
```

---

## API Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/health` | GET | No | Health check |
| `/api/auth/register` | POST | No | Register |
| `/api/auth/login` | POST | No | Login |
| `/api/auth/google` | POST | No | Google OAuth |
| `/api/auth/me` | GET | Yes | Profile |
| `/api/user/profile` | PUT | Yes | Update profile |
| `/api/user/goal` | PUT | Yes | Update goal |
| `/api/user/allergies` | PUT | Yes | Update allergies |
| `/api/meals/:date` | GET | Yes | Get meal log |
| `/api/meals/:date/add` | POST | Yes | Add food |
| `/api/meals/:date/edit/:id` | PUT | Yes | Edit food |
| `/api/meals/:date/remove/:id` | DELETE | Yes | Remove food |
| `/api/food/search` | GET | No | Search foods |
| `/api/recipes/suggest` | GET | Yes | Recipe suggestions |
| `/api/recipes/save` | POST | Yes | Save recipe |
| `/api/recipes/saved` | GET | Yes | List saved recipes |
| `/api/recipes/saved/:id` | DELETE | Yes | Remove saved recipe |
| `/api/progress/weight` | POST/GET | Yes | Weight log |
| `/api/progress/calories` | GET | Yes | Calorie history |
| `/api/progress/streak` | GET | Yes | Logging streak |

---

## Testing

Backend tests use **Jest + Supertest** with an in-memory MongoDB database.

```bash
cd backend && npm test
```

---

## License

MIT
