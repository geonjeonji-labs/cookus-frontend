import { useState } from 'react'
import './Navigation.css'
import type { User } from '../App'
import { BadgeIcon } from './badges/BadgeSet'
import { badgeMetaById } from '../data/badges'

type Props = {
  isLoggedIn: boolean
  user: User | null
  onLoginClick: () => void
  onSignupClick?: () => void
  onLogout: () => void
  onAddClick: () => void
  onRecommendClick: () => void
  onShowAllRecipes?: () => void
  onSupplementRecommendClick?: () => void
  onShowBadges?: () => void
}

export default function Navigation({
  isLoggedIn,
  user,
  onLoginClick,
  onSignupClick,
  onLogout,
  onAddClick,
  onRecommendClick,
  onShowAllRecipes,
  onSupplementRecommendClick,
  onShowBadges,
}: Props) {
  const displayedBadgeId = user?.displayed_badge_id ?? null
  const displayedBadgeMeta = displayedBadgeId ? badgeMetaById[displayedBadgeId] : undefined
  const displayedBadgeCode = displayedBadgeMeta?.iconCode
  const [showExtraActions, setShowExtraActions] = useState(false)
  const hasExtraAction = !!onSupplementRecommendClick || !!onShowBadges

  const toggleSupplementAction = () => {
    if (!hasExtraAction) return
    setShowExtraActions(prev => !prev)
  }

  const handleSupplementClick = () => {
    if (!onSupplementRecommendClick) return
    onSupplementRecommendClick()
    setShowExtraActions(false)
  }

  const handleBadgeClick = () => {
    if (!onShowBadges) return
    onShowBadges()
    setShowExtraActions(false)
  }

  return (
    <header className="app-header">
      <div className="topbar">
        <div />
        <div className="brand-center only-text">
          <span className="brand-text">COOKUS</span>
          {displayedBadgeCode && (
            <span className="brand-badge" aria-hidden>
              <BadgeIcon code={displayedBadgeCode} earned size={28} />
            </span>
          )}
        </div>
        <div className="user-area">
          {!isLoggedIn ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn ghost" onClick={onLoginClick}>로그인</button>
              {onSignupClick && (
                <button className="btn" onClick={onSignupClick}>회원가입</button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>{user?.user_name ?? '사용자'}</span>
              <button className="btn ghost" onClick={onLogout}>로그아웃</button>
            </div>
          )}
        </div>
      </div>

      <div className="tab-sep-line" />

      <div className="header-actions">
        <div className="header-actions__main">
          {onShowAllRecipes && (
            <button className="btn ghost" onClick={onShowAllRecipes}>나의 모든 레시피</button>
          )}
          <button className="btn" onClick={onAddClick}>재료 추가</button>
          <div className="header-actions__pair">
            <button className="btn primary" onClick={onRecommendClick}>레시피 추천⭐</button>
            {hasExtraAction && (
              <button
                type="button"
                className={`btn caret-toggle ${showExtraActions ? 'is-open' : ''}`}
                aria-expanded={showExtraActions}
                aria-label={showExtraActions ? '영양제 추천 받아보기' : '영양제 추천 받아보기'}
                onClick={toggleSupplementAction}
              >
                <span aria-hidden>{showExtraActions ? '▲' : '▼'}</span>
              </button>
            )}
          </div>
        </div>
        {hasExtraAction && (
          <div
            id="supplement-actions"
            className={`header-actions-extra ${showExtraActions ? 'open' : ''}`}
            aria-hidden={!showExtraActions}
          >
            {onSupplementRecommendClick && (
              <button className="btn ghost ghost--subtle" onClick={handleSupplementClick}>
                영양제 추천 받아보기
              </button>
            )}
            {onShowBadges && (
              <button className="btn ghost ghost--subtle" onClick={handleBadgeClick} style={{backgroundColor: "#FFF3CF"}}>
                뱃지 보러가기
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
