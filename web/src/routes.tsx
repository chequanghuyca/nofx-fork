import { Suspense, lazy, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'

// Route paths as constants
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  RESET_PASSWORD: '/reset-password',
  FAQ: '/faq',
  COMPETITION: '/competition',
  STRATEGY_MARKET: '/strategy-market',
  TRADERS: '/traders',
  DASHBOARD: '/dashboard',
  BACKTEST: '/backtest',
  STRATEGY: '/strategy',
  DEBATE: '/debate',
} as const

// Lazy loaded components
export const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage }))
)
export const LoginPage = lazy(() =>
  import('./components/LoginPage').then((m) => ({ default: m.LoginPage }))
)
export const RegisterPage = lazy(() =>
  import('./components/RegisterPage').then((m) => ({ default: m.RegisterPage }))
)
export const ResetPasswordPage = lazy(() =>
  import('./components/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  }))
)
export const FAQPage = lazy(() =>
  import('./pages/FAQPage').then((m) => ({ default: m.FAQPage }))
)
export const CompetitionPage = lazy(() =>
  import('./components/CompetitionPage').then((m) => ({
    default: m.CompetitionPage,
  }))
)
export const StrategyMarketPage = lazy(() =>
  import('./pages/StrategyMarketPage').then((m) => ({
    default: m.StrategyMarketPage,
  }))
)
export const AITradersPage = lazy(() =>
  import('./components/AITradersPage').then((m) => ({
    default: m.AITradersPage,
  }))
)
export const BacktestPage = lazy(() =>
  import('./components/BacktestPage').then((m) => ({ default: m.BacktestPage }))
)
export const StrategyStudioPage = lazy(() =>
  import('./pages/StrategyStudioPage').then((m) => ({
    default: m.StrategyStudioPage,
  }))
)
export const DebateArenaPage = lazy(() =>
  import('./pages/DebateArenaPage').then((m) => ({
    default: m.DebateArenaPage,
  }))
)
export const TraderDashboardPage = lazy(() =>
  import('./pages/TraderDashboardPage').then((m) => ({
    default: m.TraderDashboardPage,
  }))
)

// Loading fallback component
export function LoadingFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#0B0E11' }}
    >
      <div className="text-center">
        <img
          src="/icons/nofx.svg"
          alt="NoFx Logo"
          className="w-16 h-16 mx-auto mb-4 animate-pulse"
        />
        <p style={{ color: '#EAECEF' }}>Loading...</p>
      </div>
    </div>
  )
}

// Suspense wrapper for lazy components
export function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
}

// Protected route wrapper - redirects to login if not authenticated
interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, token, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <LoadingFallback />
  }

  if (!user || !token) {
    // Save the attempted URL for redirecting after login
    sessionStorage.setItem('returnUrl', location.pathname)
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <>{children}</>
}

// Public route wrapper - redirects to dashboard if already authenticated
interface PublicRouteProps {
  children: ReactNode
  redirectTo?: string
}

export function PublicRoute({
  children,
  redirectTo = ROUTES.DASHBOARD,
}: PublicRouteProps) {
  const { user, token, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingFallback />
  }

  if (user && token) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
