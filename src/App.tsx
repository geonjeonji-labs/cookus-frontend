import { useCallback, useEffect, useState, useRef } from 'react'
import './App.css'

import Fridge from './pages/Fridge'
import Calendar from './pages/Calendar'
import Dashboard from './pages/Dashboard'
import MyPage from './pages/MyPage'
import Navigation from './components/Navigation'
import LoginDialog from './components/LoginDialog'
import SignupDialog from './components/SignupDialog'
import AddIngredientModal from './components/AddIngredientModal'
import RecipeRecommendModal from './components/RecipeRecommendModal'
import RecipeDetailModal from './components/RecipeDetailModal'
import SupplementRecommenderModal from './components/SupplementRecommenderModal'
import TabBar from './components/TabBar'

import { authAPI } from './api/auth'
import CookTest from './pages/CookTest'
import Nutrition from './pages/Nutrition'
import Notifications from './components/Notifications'
import Badges from './pages/Badges'
import type { Recipe } from './api/recipe'

export type User = { user_id: string; user_name: string; displayed_badge_id?: number | null }
export type TabKey = 'fridge' | 'calendar' | 'dashboard' | 'cooktest' | 'nutrition' | 'mypage' | 'badges'

const tabFromPathname = (pathname: string): TabKey | null => {
  const normalized = pathname.replace(/\/+$/, '/')
  switch (normalized) {
    case '/calendar/':
      return 'calendar'
    case '/dashboard/':
      return 'dashboard'
    case '/cooktest/':
      return 'cooktest'
    case '/nutrition/':
      return 'nutrition'
    case '/mypage/':
      return 'mypage'
    case '/badges/':
      return 'badges'
    default:
      return null
  }
}

export default function App() {
  const initialTabFromPath = typeof window !== 'undefined' ? tabFromPathname(window.location.pathname) : null
  const initialTabRef = useRef<TabKey | null>(initialTabFromPath)
  const [tab, setTab] = useState<TabKey>(initialTabFromPath ?? 'fridge')
  const [user, setUser] = useState<User | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [booting, setBooting] = useState(true)
  const [showSignup, setShowSignup] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [showQuickRecommend, setShowQuickRecommend] = useState(false)
  const [showSupplementRecommend, setShowSupplementRecommend] = useState(false)
  const [quickDetail, setQuickDetail] = useState<Recipe | null>(null)
  const [pendingRecipeIds, setPendingRecipeIds] = useState<number[]>([])
  const [confirmedRecipeIds, setConfirmedRecipeIds] = useState<number[]>([])
  const [calendarFullKey, setCalendarFullKey] = useState(0)

  const refreshUser = useCallback(async () => {
    try {
      const profile = await authAPI.me()
      setUser(profile)
      return profile
    } catch (err) {
      setUser(null)
      throw err
    }
  }, [])

  useEffect(() => {
    (async () => {
      const ok = await authAPI.init()
      if (ok) {
        try {
          await refreshUser()
        } catch {
          /* ignore */
        }
      }
      setBooting(false)
    })()
  }, [refreshUser])

  const isLoggedIn = !!user
  const requireLogin = () => setShowLogin(true)

  useEffect(() => {
    setTab(() => {
      if (initialTabRef.current) {
        const nextTab = initialTabRef.current
        initialTabRef.current = null
        return nextTab
      }
      return isLoggedIn ? 'calendar' : 'fridge'
    })
    if (!isLoggedIn) {
      setShowQuickAdd(false)
    setShowQuickRecommend(false)
    setShowSupplementRecommend(false)
    setQuickDetail(null)
    setPendingRecipeIds([])
    setConfirmedRecipeIds([])
    }
  }, [isLoggedIn])

  const handleLoginSuccess = async (_u: User) => {
    try {
      await refreshUser()
    } finally {
      setShowLogin(false)
    }
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch {}
    setUser(null)
    setTab('fridge')
    setShowQuickAdd(false)
    setShowQuickRecommend(false)
    setShowSupplementRecommend(false)
    setQuickDetail(null)
    setPendingRecipeIds([])
    setConfirmedRecipeIds([])
  }

  const removePendingRecipes = (ids: number[]) =>
    setPendingRecipeIds(prev => prev.filter(id => !ids.includes(id)))

  const togglePendingRecipe = (recipeId: number) =>
    setPendingRecipeIds(prev =>
      prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId]
    )

  const markRecipesSelected = (ids: number[]) => {
    if (!ids.length) return
    setConfirmedRecipeIds(prev => Array.from(new Set([...prev, ...ids])))
    removePendingRecipes(ids)
  }

  const closeRecommendModal = () => {
    setShowQuickRecommend(false)
    setPendingRecipeIds([])
  }

  const openAddAction = () => {
    if (!isLoggedIn) {
      requireLogin()
      return
    }
    setShowQuickAdd(true)
  }

  const openBadgeGallery = () => {
    if (!isLoggedIn) {
      requireLogin()
      return
    }
    setTab('badges')
  }

  const openRecommendAction = () => {
    if (!isLoggedIn) {
      requireLogin()
      return
    }
    setShowQuickRecommend(true)
  }

  const openSupplementRecommendAction = () => {
    if (!isLoggedIn) {
      requireLogin()
      return
    }
    setShowSupplementRecommend(true)
  }

  if (booting) {
    return (
      <div className="app-shell">
        <div className="app-frame">
          <main className="app-main">로딩 중...</main>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-frame">
        <Navigation
          isLoggedIn={isLoggedIn}
          user={user}
          onLoginClick={() => setShowLogin(true)}
          onSignupClick={() => setShowSignup(true)}
          onLogout={handleLogout}
          onAddClick={openAddAction}
          onRecommendClick={openRecommendAction}
          onShowAllRecipes={() => {
            if (!isLoggedIn) {
              requireLogin()
              return
            }
            if (tab !== 'calendar') setTab('calendar')
            setCalendarFullKey(prev => prev + 1)
          }}
          onSupplementRecommendClick={openSupplementRecommendAction}
          onShowBadges={openBadgeGallery}
        />

        {isLoggedIn ? (
          <Notifications isLoggedIn={isLoggedIn} />
        ) : (
          <div className="noti noti-home">
            <button className="bell" onClick={() => setTab('fridge')} title="Ȩ���� �̵�">
              🏠
            </button>
          </div>
        )}

        <main className={`app-main ${tab === 'dashboard' ? 'app-main--dashboard' : ''}`}>
          {tab === 'fridge' && (
            <Fridge isLoggedIn={isLoggedIn} />
          )}

          {tab === 'calendar' && (
            <Calendar
              isLoggedIn={isLoggedIn}
              userName={user?.user_name}
              fullRequestKey={calendarFullKey}
            />
          )}

          {tab === 'cooktest' && (
            <CookTest isLoggedIn={isLoggedIn} onRequireLogin={requireLogin} userId={user?.user_id} />
          )}

          {tab === 'dashboard' && (
            <Dashboard isLoggedIn={isLoggedIn} onRequireLogin={requireLogin} userName={user?.user_name} />
          )}

          {tab === 'nutrition' && (
            <Nutrition isLoggedIn={isLoggedIn} onRequireLogin={requireLogin} userName={user?.user_name} />
          )}

          {tab === 'mypage' && (
            <MyPage
              isLoggedIn={isLoggedIn}
              onRequireLogin={requireLogin}
              user={user}
              refreshUser={refreshUser}
            />
          )}

          {tab === 'badges' && (
            <Badges
              isLoggedIn={isLoggedIn}
              onRequireLogin={requireLogin}
            />
          )}
        </main>

        <TabBar
          current={tab}
          onChange={setTab}
          tabs={['calendar', 'dashboard', 'cooktest', 'mypage']}
        />
      </div>

      {showLogin && <LoginDialog onClose={() => setShowLogin(false)} onSuccess={handleLoginSuccess} />}

      {showSignup && (
        <SignupDialog
          onClose={() => setShowSignup(false)}
          onSuccess={u => {
            setUser(u)
            setShowSignup(false)
          }}
        />
      )}

      {showQuickAdd && (
        <AddIngredientModal
          onClose={saved => {
            setShowQuickAdd(false)
            if (saved && !isLoggedIn) {
              // nothing extra for now
            }
          }}
        />
      )}

      {showQuickRecommend && (
        <RecipeRecommendModal
          onClose={closeRecommendModal}
          onDetail={setQuickDetail}
          pendingRecipeIds={pendingRecipeIds}
          confirmedRecipeIds={confirmedRecipeIds}
          onToggleRecipe={togglePendingRecipe}
          onRecipesConfirmed={markRecipesSelected}
          onRemovePending={removePendingRecipes}
        />
      )}

      {quickDetail && (
        <div className="inner-overlay" onClick={() => setQuickDetail(null)}>
          <div onClick={e => e.stopPropagation()}>
            <RecipeDetailModal
              recipe={quickDetail}
              onClose={() => setQuickDetail(null)}
              showTimer={false}
              onSelectedChange={(recipeId, selected) => {
                if (selected) markRecipesSelected([recipeId])
              }}
            />
          </div>
        </div>
      )}

      {showSupplementRecommend && (
        <SupplementRecommenderModal onClose={() => setShowSupplementRecommend(false)} />
      )}
    </div>
  )
}
