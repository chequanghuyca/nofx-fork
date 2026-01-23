import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from './lib/api'
import { TraderDashboardPage } from './pages/TraderDashboardPage'

import { AITradersPage } from './components/AITradersPage'
import { CompetitionPage } from './components/CompetitionPage'
import { LoginRequiredOverlay } from './components/LoginRequiredOverlay'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { useSystemConfig } from './hooks/useSystemConfig'
import { DebateArenaPage } from './pages/DebateArenaPage'
import { StrategyMarketPage } from './pages/StrategyMarketPage'
import { StrategyStudioPage } from './pages/StrategyStudioPage'

import { BacktestPage, ROUTES } from './routes'

import type {
  AccountInfo,
  DecisionRecord,
  Exchange,
  Position,
  Statistics,
  SystemStatus,
  TraderInfo,
} from './types'

type Page =
  | 'competition'
  | 'traders'
  | 'trader'
  | 'backtest'
  | 'strategy'
  | 'strategy-market'
  | 'data'
  | 'debate'
  | 'faq'
  | 'login'
  | 'register'

// Map route paths to page names
const pathToPage: Record<string, Page> = {
  [ROUTES.COMPETITION]: 'competition',
  [ROUTES.STRATEGY_MARKET]: 'strategy-market',
  [ROUTES.TRADERS]: 'traders',
  [ROUTES.DASHBOARD]: 'trader',
  [ROUTES.BACKTEST]: 'backtest',
  [ROUTES.STRATEGY]: 'strategy',
  [ROUTES.DEBATE]: 'debate',
  [ROUTES.FAQ]: 'faq',
  [ROUTES.LOGIN]: 'login',
  [ROUTES.REGISTER]: 'register',
}

// Map page names to route paths
const pageToPath: Record<Page, string> = {
  competition: ROUTES.COMPETITION,
  'strategy-market': ROUTES.STRATEGY_MARKET,
  traders: ROUTES.TRADERS,
  trader: ROUTES.DASHBOARD,
  backtest: ROUTES.BACKTEST,
  strategy: ROUTES.STRATEGY,
  debate: ROUTES.DEBATE,
  faq: ROUTES.FAQ,
  login: ROUTES.LOGIN,
  register: ROUTES.REGISTER,
}

function App() {
  const { language, setLanguage } = useLanguage()
  const { user, token, logout, isLoading } = useAuth()
  const { loading: configLoading } = useSystemConfig()
  const [route, setRoute] = useState(window.location.pathname)

  // Debug log
  useEffect(() => {
    console.log('[App] Mounted. Route:', window.location.pathname)
  }, [])

  // 从URL路径读取初始页面状态（支持刷新保持页面）
  const getInitialPage = (): Page => {
    const path = window.location.pathname
    const hash = window.location.hash.slice(1) // 去掉 #

    if (path === '/traders' || hash === 'traders') return 'traders'
    if (path === '/backtest' || hash === 'backtest') return 'backtest'
    if (path === '/strategy' || hash === 'strategy') return 'strategy'
    if (path === '/strategy-market' || hash === 'strategy-market')
      return 'strategy-market'
    if (path === '/debate' || hash === 'debate') return 'debate'
    if (path === '/dashboard' || hash === 'trader' || hash === 'details')
      return 'trader'
    return 'competition' // 默认为竞赛页面
  }

  // Login required overlay state
  const [loginOverlayOpen, setLoginOverlayOpen] = useState(false)
  const [loginOverlayFeature, setLoginOverlayFeature] = useState('')

  const handleLoginRequired = (featureName: string) => {
    setLoginOverlayFeature(featureName)
    setLoginOverlayOpen(true)
  }

  // Unified page navigation handler
  const navigateToPage = (page: Page) => {
    const pathMap: Record<Page, string> = {
      competition: '/competition',
      'strategy-market': '/strategy-market',
      traders: '/traders',
      trader: '/dashboard',
      backtest: '/backtest',
      strategy: '/strategy',
      debate: '/debate',
      faq: '/faq',
      login: '/login',
      register: '/register',
    }
    const path = pathMap[page]
    if (path) {
      window.history.pushState({}, '', path)
      setRoute(path)
      setCurrentPage(page)
    }
  }

  // Read trader slug from URL params
  const [selectedTraderSlug, setSelectedTraderSlug] = useState<
    string | undefined
  >(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('trader') || undefined
  })
  const [selectedTraderId, setSelectedTraderId] = useState<string | undefined>()
  const [lastUpdate, setLastUpdate] = useState<string>('--:--:--')
  const [decisionsLimit, setDecisionsLimit] = useState<number>(5)

  // Generate trader URL slug (name + first 4 chars of ID)
  const getTraderSlug = (trader: TraderInfo) => {
    const idPrefix = trader.trader_id.slice(0, 4)
    return `${trader.trader_name}-${idPrefix}`
  }

  // Find trader by slug
  const findTraderBySlug = (slug: string, traderList: TraderInfo[]) => {
    const lastDashIndex = slug.lastIndexOf('-')
    if (lastDashIndex === -1) {
      return traderList.find((t) => t.trader_name === slug)
    }
    const name = slug.slice(0, lastDashIndex)
    const idPrefix = slug.slice(lastDashIndex + 1)
    return traderList.find(
      (t) => t.trader_name === name && t.trader_id.startsWith(idPrefix)
    )
  }

  // Fetch trader list (only when logged in)
  const { data: traders, error: tradersError } = useQuery<TraderInfo[]>({
    queryKey: ['traders'],
    queryFn: api.getTraders,
    enabled: !!(user && token),
    staleTime: 30000,
    refetchInterval: 30000,
    placeholderData: keepPreviousData,
    retry: 1,
  })

  // Fetch exchange list
  const { data: exchanges } = useQuery<Exchange[]>({
    queryKey: ['exchanges'],
    queryFn: api.getExchangeConfigs,
    enabled: !!(user && token),
    staleTime: 60000,
    refetchInterval: 60000,
    placeholderData: keepPreviousData,
  })

  // Set selected trader when data is fetched
  useEffect(() => {
    if (traders && traders.length > 0 && !selectedTraderId) {
      if (selectedTraderSlug) {
        const trader = findTraderBySlug(selectedTraderSlug, traders)
        if (trader) {
          setSelectedTraderId(trader.trader_id)
        } else {
          setSelectedTraderId(traders[0].trader_id)
        }
      } else {
        setSelectedTraderId(traders[0].trader_id)
      }
    }
  }, [traders, selectedTraderId, selectedTraderSlug])

  // Update trader slug from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const traderParam = params.get('trader')
    if (traderParam && traderParam !== selectedTraderSlug) {
      setSelectedTraderSlug(traderParam)
    }
  }, [location.search, selectedTraderSlug])

  // Fetch trader data when on dashboard page
  const isOnDashboard = location.pathname === ROUTES.DASHBOARD

  const { data: status } = useQuery<SystemStatus>({
    queryKey: ['status', selectedTraderId],
    queryFn: () => api.getStatus(selectedTraderId),
    enabled: isOnDashboard && !!selectedTraderId,
    staleTime: 15000,
    refetchInterval: 30000,
    placeholderData: keepPreviousData,
  })

  const { data: account } = useQuery<AccountInfo>({
    queryKey: ['account', selectedTraderId],
    queryFn: () => api.getAccount(selectedTraderId),
    enabled: isOnDashboard && !!selectedTraderId,
    staleTime: 15000,
    refetchInterval: 30000,
    placeholderData: keepPreviousData,
  })

  const { data: positions } = useQuery<Position[]>({
    queryKey: ['positions', selectedTraderId],
    queryFn: () => api.getPositions(selectedTraderId),
    enabled: isOnDashboard && !!selectedTraderId,
    staleTime: 15000,
    refetchInterval: 30000,
    placeholderData: keepPreviousData,
  })

  const { data: decisions } = useQuery<DecisionRecord[]>({
    queryKey: ['decisions', selectedTraderId, decisionsLimit],
    queryFn: () => api.getLatestDecisions(selectedTraderId, decisionsLimit),
    enabled: isOnDashboard && !!selectedTraderId,
    staleTime: 30000,
    refetchInterval: 60000,
    placeholderData: keepPreviousData,
  })

  const { data: stats } = useQuery<Statistics>({
    queryKey: ['statistics', selectedTraderId],
    queryFn: () => api.getStatistics(selectedTraderId),
    enabled: isOnDashboard && !!selectedTraderId,
    staleTime: 30000,
    refetchInterval: 60000,
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    if (account) {
      const now = new Date().toLocaleTimeString()
      setLastUpdate(now)
    }
  }, [account])

  const selectedTrader = traders?.find((t) => t.trader_id === selectedTraderId)

  // Show loading spinner while checking auth or config
  if (isLoading || configLoading) {
    return <LoadingFallback />
  }

  // Footer component (hidden on debate page)
  //   const Footer = () =>
  //     currentPage !== 'debate' ? (
  //       <footer
  //         className="mt-16"
  //         style={{ borderTop: '1px solid #2B3139', background: '#181A20' }}
  //       >
  //         <div
  //           className="max-w-[1920px] mx-auto px-6 py-6 text-center text-sm"
  //           style={{ color: '#5E6673' }}
  //         >
  //           <p>{t('footerTitle', language)}</p>
  //           <p className="mt-1">{t('footerWarning', language)}</p>
  //           <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
  //             {/* GitHub */}
  //             <a
  //               href={OFFICIAL_LINKS.github}
  //               target="_blank"
  //               rel="noopener noreferrer"
  //               className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all hover:scale-105"
  //               style={{
  //                 background: '#1E2329',
  //                 color: '#848E9C',
  //                 border: '1px solid #2B3139',
  //               }}
  //               onMouseEnter={(e) => {
  //                 e.currentTarget.style.background = '#2B3139'
  //                 e.currentTarget.style.color = '#EAECEF'
  //                 e.currentTarget.style.borderColor = '#F0B90B'
  //               }}
  //               onMouseLeave={(e) => {
  //                 e.currentTarget.style.background = '#1E2329'
  //                 e.currentTarget.style.color = '#848E9C'
  //                 e.currentTarget.style.borderColor = '#2B3139'
  //               }}
  //             >
  //               <svg
  //                 width="18"
  //                 height="18"
  //                 viewBox="0 0 16 16"
  //                 fill="currentColor"
  //               >
  //                 <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  //               </svg>
  //               GitHub
  //             </a>
  //             {/* Twitter/X */}
  //             <a
  //               href={OFFICIAL_LINKS.twitter}
  //               target="_blank"
  //               rel="noopener noreferrer"
  //               className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all hover:scale-105"
  //               style={{
  //                 background: '#1E2329',
  //                 color: '#848E9C',
  //                 border: '1px solid #2B3139',
  //               }}
  //               onMouseEnter={(e) => {
  //                 e.currentTarget.style.background = '#2B3139'
  //                 e.currentTarget.style.color = '#EAECEF'
  //                 e.currentTarget.style.borderColor = '#1DA1F2'
  //               }}
  //               onMouseLeave={(e) => {
  //                 e.currentTarget.style.background = '#1E2329'
  //                 e.currentTarget.style.color = '#848E9C'
  //                 e.currentTarget.style.borderColor = '#2B3139'
  //               }}
  //             >
  //               <svg
  //                 width="16"
  //                 height="16"
  //                 viewBox="0 0 24 24"
  //                 fill="currentColor"
  //               >
  //                 <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  //               </svg>
  //               Twitter
  //             </a>
  //             {/* Telegram */}
  //             <a
  //               href={OFFICIAL_LINKS.telegram}
  //               target="_blank"
  //               rel="noopener noreferrer"
  //               className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all hover:scale-105"
  //               style={{
  //                 background: '#1E2329',
  //                 color: '#848E9C',
  //                 border: '1px solid #2B3139',
  //               }}
  //               onMouseEnter={(e) => {
  //                 e.currentTarget.style.background = '#2B3139'
  //                 e.currentTarget.style.color = '#EAECEF'
  //                 e.currentTarget.style.borderColor = '#0088cc'
  //               }}
  //               onMouseLeave={(e) => {
  //                 e.currentTarget.style.background = '#1E2329'
  //                 e.currentTarget.style.color = '#848E9C'
  //                 e.currentTarget.style.borderColor = '#2B3139'
  //               }}
  //             >
  //               <svg
  //                 width="16"
  //                 height="16"
  //                 viewBox="0 0 24 24"
  //                 fill="currentColor"
  //               >
  //                 <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  //               </svg>
  //               Telegram
  //             </a>
  //           </div>
  //         </div>
  //       </footer>
  //     ) : null

  // Layout wrapper for authenticated pages
  const AuthenticatedLayout = ({ children }: { children: React.ReactNode }) => (
    <div
      className="min-h-screen"
      style={{ background: '#0B0E11', color: '#EAECEF' }}
    >
      <HeaderBar
        isLoggedIn={!!user}
        currentPage={currentPage}
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={logout}
        onLoginRequired={handleLoginRequired}
        onPageChange={navigateToPage}
      />
      <main className="min-h-screen pt-16">{children}</main>
      {/* <Footer /> */}
      <LoginRequiredOverlay
        isOpen={loginOverlayOpen}
        onClose={() => setLoginOverlayOpen(false)}
        featureName={loginOverlayFeature}
      />
    </div>
  )

  // Public layout for FAQ page
  const PublicLayout = ({ children }: { children: React.ReactNode }) => (
    <div
      className="min-h-screen"
      style={{ background: '#0B0E11', color: '#EAECEF' }}
    >
      <HeaderBar
        isLoggedIn={!!user}
        currentPage="faq"
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={logout}
        onLoginRequired={handleLoginRequired}
        onPageChange={navigateToPage}
      />

      {/* Main Content with Page Transitions */}
      <main className="min-h-screen pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {currentPage === 'competition' ? (
              <CompetitionPage />
            ) : currentPage === 'strategy-market' ? (
              <StrategyMarketPage />
            ) : currentPage === 'traders' ? (
              <AITradersPage
                onTraderSelect={(traderId) => {
                  setSelectedTraderId(traderId)
                  window.history.pushState({}, '', '/dashboard')
                  setRoute('/dashboard')
                  setCurrentPage('trader')
                }}
              />
            ) : currentPage === 'backtest' ? (
              <BacktestPage />
            ) : currentPage === 'strategy' ? (
              <StrategyStudioPage />
            ) : currentPage === 'debate' ? (
              <DebateArenaPage />
            ) : (
              <TraderDashboardPage
                selectedTrader={selectedTrader}
                status={status}
                account={account}
                positions={positions}
                decisions={decisions}
                decisionsLimit={decisionsLimit}
                onDecisionsLimitChange={setDecisionsLimit}
                stats={stats}
                lastUpdate={lastUpdate}
                language={language}
                traders={traders}
                tradersError={tradersError}
                selectedTraderId={selectedTraderId}
                onTraderSelect={(traderId) => {
                  setSelectedTraderId(traderId)
                  // 更新 URL 参数（使用 slug: name-id前4位）
                  const trader = traders?.find((t) => t.trader_id === traderId)
                  if (trader) {
                    const url = new URL(window.location.href)
                    url.searchParams.set('trader', getTraderSlug(trader))
                    window.history.replaceState({}, '', url.toString())
                  }
                }}
                onNavigateToTraders={() => {
                  window.history.pushState({}, '', '/traders')
                  setRoute('/traders')
                  setCurrentPage('traders')
                }}
                exchanges={exchanges}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer - Hidden on debate page */}
      {currentPage !== 'debate' && (
        <footer
          className="mt-16"
          style={{ borderTop: '1px solid #2B3139', background: '#181A20' }}
        >
          <div
            className="max-w-[1920px] mx-auto px-6 py-6 text-center text-sm"
            style={{ color: '#5E6673' }}
          >
            <p>{t('footerTitle', language)}</p>
            <p className="mt-1">{t('footerWarning', language)}</p>
            <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
              {/* GitHub */}
              <a
                href={OFFICIAL_LINKS.github}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: '#1E2329',
                  color: '#848E9C',
                  border: '1px solid #2B3139',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2B3139'
                  e.currentTarget.style.color = '#EAECEF'
                  e.currentTarget.style.borderColor = '#F0B90B'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1E2329'
                  e.currentTarget.style.color = '#848E9C'
                  e.currentTarget.style.borderColor = '#2B3139'
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                GitHub
              </a>
              {/* Twitter/X */}
              <a
                href={OFFICIAL_LINKS.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: '#1E2329',
                  color: '#848E9C',
                  border: '1px solid #2B3139',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2B3139'
                  e.currentTarget.style.color = '#EAECEF'
                  e.currentTarget.style.borderColor = '#1DA1F2'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1E2329'
                  e.currentTarget.style.color = '#848E9C'
                  e.currentTarget.style.borderColor = '#2B3139'
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter
              </a>
              {/* Telegram */}
              <a
                href={OFFICIAL_LINKS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition-all hover:scale-105"
                style={{
                  background: '#1E2329',
                  color: '#848E9C',
                  border: '1px solid #2B3139',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#2B3139'
                  e.currentTarget.style.color = '#EAECEF'
                  e.currentTarget.style.borderColor = '#0088cc'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1E2329'
                  e.currentTarget.style.color = '#848E9C'
                  e.currentTarget.style.borderColor = '#2B3139'
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Telegram
              </a>
            </div>
          </div>
        </footer>
      )}

      {/* Login Required Overlay */}
      <LoginRequiredOverlay
        isOpen={loginOverlayOpen}
        onClose={() => setLoginOverlayOpen(false)}
        featureName={loginOverlayFeature}
      />
    </div>
  )
}

// Wrap App with providers
export default function AppWithProviders() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ConfirmDialogProvider>
          <App />
        </ConfirmDialogProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}
