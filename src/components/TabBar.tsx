import type { TabKey } from '../App'
import './Navigation.css'

type Props = {
  current: TabKey
  onChange: (tab: TabKey) => void
  tabs: TabKey[]
}

export default function TabBar({ current, onChange, tabs }: Props) {
  const label = (key: TabKey) => {
    switch (key) {
      case 'calendar':
        return '캘린더'
      case 'dashboard':
        return '리포트'
      case 'cooktest':
        return '쿡테스트'
      case 'nutrition':
        return '영양관리'
      case 'mypage':
        return '마이페이지'
      case 'fridge':
        return '냉장고'
      default:
        return key
    }
  }

  const renderIcon = (key: TabKey) => {
    if (key === 'calendar') {
      return (
        <>
          <span className="tab-icon tab-icon--calendar" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="17" rx="3" />
              <line x1="8" y1="2.5" x2="8" y2="6" />
              <line x1="16" y1="2.5" x2="16" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <circle cx="8.5" cy="14.5" r="1" />
              <circle cx="12" cy="14.5" r="1" />
              <circle cx="15.5" cy="14.5" r="1" />
            </svg>
          </span>
          <span className="sr-only">{label(key)}</span>
        </>
      )
    }

    if (key === 'dashboard') {
      return (
        <>
          <span className="tab-icon tab-icon--dashboard" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="11" width="3.2" height="9" rx="1" />
              <rect x="10.4" y="6" width="3.2" height="14" rx="1" />
              <rect x="15.8" y="14" width="3.2" height="6" rx="1" />
              <path d="M4 20h16" />
            </svg>
          </span>
          <span className="sr-only">{label(key)}</span>
        </>
      )
    }

    if (key === 'cooktest') {
      return (
        <>
          <span className="tab-icon tab-icon--cooktest" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 5V3h8v2" />
              <path d="M6 5h12v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V5Z" />
              <path d="M6 5H4v2a3 3 0 0 0 3 3" />
              <path d="M18 5h2v2a3 3 0 0 1-3 3" />
              <path d="M9 15h6v2a3 3 0 0 1-3 3 3 3 0 0 1-3-3v-2Z" />
            </svg>
          </span>
          <span className="sr-only">{label(key)}</span>
        </>
      )
    }

    if (key === 'nutrition') {
      return (
        <>
          <span className="tab-icon tab-icon--nutrition" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3.5c-2.9 0-5 2.1-5 5v7c0 2.9 2.1 5 5 5s5-2.1 5-5v-7c0-2.9-2.1-5-5-5Z" />
              <path d="M7 12h10" />
              <path d="M9 6.5h6" />
            </svg>
          </span>
          <span className="sr-only">{label(key)}</span>
        </>
      )
    }

    if (key === 'mypage') {
      return (
        <>
          <span className="tab-icon" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span className="sr-only">{label(key)}</span>
        </>
      )
    }

    return label(key)
  }

  return (
    <nav className="tabbar bottom-tabbar">
      {tabs.map(tab => (
        <button key={tab} className={`tab ${current === tab ? 'active' : ''}`} onClick={() => onChange(tab)}>
          {renderIcon(tab)}
        </button>
      ))}
    </nav>
  )
}
