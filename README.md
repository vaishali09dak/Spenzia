# Spenzia

A modern expense tracker and budgeting app built with React Native and Expo, featuring real-time Firebase integration, visual spending heatmaps, monthly reports, and AI-powered spending predictions.

##  Features

- **Dashboard & Analytics**  
  - Monthly/weekly spending insights
  - Visual expense heatmaps (year/month view)
  - Category-wise breakdown with charts
  - Savings goals tracker

- **Prediction Engine**  
  - Forecast next month’s spending using historical data
  - Interactive month selection and category breakdown
  - Adjustable forecast window (3/6 months)

- **Core Expense Tracking**  
  - Add income/expenses with categories
  - Real-time transaction updates via Firestore
  - Monthly budget tracking with progress bars
  - Daily budget exceeded alerts (automatic)

- **Smart Alerts**  
  - Daily budget exceeded (Home screen)
  - Configurable safe/danger thresholds for heatmap
  - Per-category spending insights

- **UI/UX**  
  - Clean, modern design with safe-area support
  - Tab navigation + side menu
  - Light theme with subtle shadows
  - Responsive charts (Pie, Line, Heatmap)

## 🛠 Tech Stack

| Layer | Tech |
|--------|-------|
| Frontend | React Native (Expo) |
| Navigation | Expo Router |
| State | React Hooks (useState, useEffect, useCallback, useMemo) |
| Charts | react-native-chart-kit |
| Icons | @expo/vector-icons (Ionicons, Feather) |
| Backend | Firebase (Firestore, Auth) |
| Language | TypeScript |
| Safe Area | react-native-safe-area-context |
| Blur | expo-blur |
| Date Utils | date-fns |
| Storage | Firebase Firestore (real-time) |

## Dependencies

Key packages from `package.json`:

```json
{
  "expo": "~52.0.11",
  "react": "18.3.1",
  "react-native": "0.76.3",
  "expo-router": "~4.0.9",
  "firebase": "^10.12.2",
  "react-native-chart-kit": "^6.12.0",
  "date-fns": "^4.1.0",
  "react-native-safe-area-context": "^4.12.0",
  "expo-blur": "~14.0.1"
}
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Firebase project (Firestore + Auth enabled)

## Project Structure

```
Spenzia/
├─ frontend/
│  ├─ app/
│  │  ├─ (tabs)/           # Tab screens (hidden + visible)
│  │  │  ├─ index.tsx      # Home / Dashboard
│  │  │  ├─ settings.tsx   # Settings
│  │  │  ├─ Alerts.tsx
│  │  │  ├─ MonthlyReport.tsx
│  │  │  ├─ Prediction.tsx
│  │  │  ├─ FinancialHeatMapScreen.tsx
│  │  │  ├─ CategoryManager.tsx
│  │  │  └─ _layout.tsx     # Tab navigator
│  │  └─ (auth)/           # Authenticated-only screens
│  │     ├─ profile.tsx
│  │     ├─ dashboard.tsx
│  │     ├─ RecentTransaction.tsx
│  │     ├─ SpendingInsights.tsx
│  │     └─ ExpenseFabModal.tsx
│  ├─ firebase.ts           # Firebase config
│  └─ package.json
├─ app.json                 # Expo config
└─ README.md
```

## Key Screens & Features

| Screen | Purpose |
|--------|---------|
| Home (`index.tsx`) | Dashboard: balance, income/expenses, pie chart, budget progress, daily budget alerts |
| Prediction | Forecast next month spending with interactive chart and category breakdown |
| FinancialHeatMapScreen | Year/month heatmap with configurable safe/danger thresholds |
| Alerts | Centralized alerts/notifications view |
| MonthlyReport | Monthly spending summary and visual report |
| Settings | Profile + budget/income settings |
| CategoryManager | Manage expense categories and colors |
| RecentTransaction | List all recent transactions |
| SpendingInsights | Deeper analytics and trends |

## How It Works

- **Real-time**: Firestore listeners sync expenses instantly across devices.
- **Auth**: Firebase Auth protects routes; unauthenticated users are redirected.
- **Charts**: Powered by `react-native-chart-kit` (pie, line).
- **Heatmap**: Daily spending color-coded by configurable thresholds.
- **Prediction**: Simple moving average over last N months; shows forecast and top categories.
- **Budget Alerts**: Home screen calculates daily budget (`monthlyBudget / daysInMonth`) and alerts once per day when exceeded.

## Customization

- **Category Colors**: Edit in `CategoryManager.tsx` or via UI.
- **Heatmap Thresholds**: Settings screen (safe/danger limits).
- **Forecast Window**: Toggle 3/6 months in Prediction screen.
- **Theme**: Light theme with primary `#213c74ff` and cream `#FFF9F2`.

## Contributing

1. Fork the repo.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m 'Add your feature'`).
4. Push (`git push origin feature/your-feature`).
5. Open a Pull Request.

### Code Style

- Use TypeScript.
- Prefer functional components with hooks.
- Keep UI responsive and safe-area aware.
- Add comments for non-obvious logic.
- Follow existing naming conventions (camelCase for files/vars).

## License

MIT License — see `LICENSE` file for details.

## Acknowledgments

- Expo & React Native teams for the framework.
- Firebase for real-time backend.
- `react-native-chart-kit` for charts.
- `date-fns` for date utilities.
- Community contributors and testers.

---

**Built with for better financial habits.**
