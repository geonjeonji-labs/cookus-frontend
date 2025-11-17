import { useEffect, useState } from 'react'
import BadgeGallery from '../components/badges/BadgeGallery'
import BadgeDisplaySelector from '../components/badges/BadgeDisplaySelector'
import { badgesAPI, type BadgeOverview } from '../api/badges'
import './MyPage.css'

type Props = {
  isLoggedIn: boolean
  onRequireLogin: () => void
}

export default function Badges({ isLoggedIn, onRequireLogin }: Props) {
  const [badgeOverview, setBadgeOverview] = useState<BadgeOverview | null>(null)
  const [badgeLoading, setBadgeLoading] = useState(false)
  const [badgeError, setBadgeError] = useState<string | null>(null)
  const [showBadgeSelector, setShowBadgeSelector] = useState(false)
  const [displayLoading, setDisplayLoading] = useState(false)
  const [displayError, setDisplayError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn) {
      setBadgeOverview(null)
      setBadgeError(null)
      setBadgeLoading(false)
      setShowBadgeSelector(false)
      return
    }
    let alive = true
    ;(async () => {
      setBadgeError(null)
      try {
        setBadgeLoading(true)
        const overview = await badgesAPI.overview()
        if (alive) setBadgeOverview(overview)
      } catch {
        if (alive) {
          setBadgeOverview(null)
          setBadgeError('뱃지를 불러오지 못했어요.')
        }
      } finally {
        if (alive) setBadgeLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [isLoggedIn])

  const displayedBadgeId =
    badgeOverview?.earned?.find(b => b.is_displayed)?.badge_id ?? null
  const earnedBadges = badgeOverview?.earned ?? []

  const handleBadgeDisplayChange = async (badgeId: number | null) => {
    if (displayLoading) return false
    setDisplayError(null)
    try {
      setDisplayLoading(true)
      await badgesAPI.setDisplayBadge(badgeId)
      const refreshed = await badgesAPI.overview()
      setBadgeOverview(refreshed)
      return true
    } catch {
      setDisplayError('프로필에 표시할 뱃지를 바꾸지 못했어요.')
      return false
    } finally {
      setDisplayLoading(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <section className="app-tab mypage badges-tab">
        <div className="card my-card center">
          <h2 className="title">뱃지 보기</h2>
          <p className="sub">로그인이 필요해요.</p>
          <button className="btn primary" onClick={onRequireLogin}>로그인</button>
        </div>
      </section>
    )
  }

  return (
    <section className="app-tab mypage badges-tab">
      <div className="card my-card">
        <div className="my-badge-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h3 style={{ marginTop: 0 }}>나의 뱃지</h3>
          <button
            type="button"
            className="btn btn--tiny"
            onClick={() => {
              setDisplayError(null)
              setShowBadgeSelector(true)
            }}
            disabled={earnedBadges.length === 0}
          >
            프로필 표시 선택
          </button>
        </div>

        {badgeLoading && <div className="note">뱃지를 불러오는 중...</div>}
        {badgeError && <div className="error">{badgeError}</div>}
        {!badgeLoading && !badgeError && !badgeOverview && (
          <div className="note">아직 획득한 배지가 없어요.</div>
        )}
        {badgeOverview && (
          <BadgeGallery
            overview={badgeOverview}
            displayedBadgeId={displayedBadgeId}
            onDisplayChange={handleBadgeDisplayChange}
            displayLoading={displayLoading}
            displayError={displayError}
          />
        )}
      </div>
      {showBadgeSelector && badgeOverview && (
        <BadgeDisplaySelector
          earnedBadges={badgeOverview.earned}
          displayedBadgeId={displayedBadgeId}
          onSelect={handleBadgeDisplayChange}
          loading={displayLoading}
          error={displayError}
          onClose={() => setShowBadgeSelector(false)}
        />
      )}
    </section>
  )
}
