import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { PlanInput } from './pages/PlanInput';
import { TripSummary } from './pages/TripSummary';
import { TripDetail } from './pages/TripDetail';
import { useTripStore } from './stores/tripStore';
import { useTheme } from './hooks/useTheme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

function ThemeSync() {
  const { theme } = useTheme();
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);
  return null;
}

function GuardedRoute({ children }: { children: React.ReactNode }) {
  const plan = useTripStore((s) => s.plan);
  if (!plan) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeSync />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plan" element={<PlanInput />} />
          <Route
            path="/summary"
            element={(
              <GuardedRoute>
                <TripSummary />
              </GuardedRoute>
            )}
          />
          <Route
            path="/detail"
            element={(
              <GuardedRoute>
                <TripDetail />
              </GuardedRoute>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
