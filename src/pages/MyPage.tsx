import { useCallback, useEffect, useState } from 'react'
import { authAPI } from '../api/auth'
import type { User } from '../api/auth'
import EditProfileDialog from '../components/EditProfileDialog'
import BadgeGallery from '../components/badges/BadgeGallery'
import BadgeDisplaySelector from '../components/badges/BadgeDisplaySelector'
import { badgesAPI, type BadgeOverview } from '../api/badges'
import { fetchFaq, fetchFaqCategories, type FaqItem } from '../api/faq'
import servingBattery from '../assets/서빙 건전지.png'
import './MyPage.css'

type Props = {
  isLoggedIn: boolean
  onRequireLogin: () => void
  user: User | null
  refreshUser: () => Promise<User>
}

export default function MyPage({ isLoggedIn, onRequireLogin, user, refreshUser }: Props) {
  const [me, setMe] = useState<User | null>(user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'badges'>('badges')
  const [badgeOverview, setBadgeOverview] = useState<BadgeOverview | null>(null)
  const [badgeLoading, setBadgeLoading] = useState(false)
  const [badgeError, setBadgeError] = useState<string | null>(null)
  const [showBadgeSelector, setShowBadgeSelector] = useState(false)
  const [displayLoading, setDisplayLoading] = useState(false)
  const [displayError, setDisplayError] = useState<string | null>(null)
  const [showAbout, setShowAbout] = useState(false)
  const [showFAQ, setShowFAQ] = useState(false)

  const fetchMe = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const profile = await refreshUser()
      setMe(profile)
    } catch {
      setError('정보를 불러오지 못했어요')
    } finally { setLoading(false) }
  }, [refreshUser])

  function FieldRow({
    label,
    value,
    chip,
    chipVariant = 'beige',
  }: {
    label: string
    value?: React.ReactNode
    chip?: string
    chipVariant?: 'beige' | 'mint'
  }) {
    return (
      <div className="field">
        <div className="field-label">{label}</div>
        <div className="field-val">
          {value && <div className="value">{value}</div>}
          {chip && (
            <span
              className={[
                'chip','chip--tiny',
                chipVariant === 'mint' ? 'ghost' : ''
              ].join(' ')}
            >
              {chip}
            </span>
          )}
        </div>
      </div>
    )
  }

  const fetchBadges = async () => {
    setBadgeError(null)
    try {
      setBadgeLoading(true)
      setBadgeOverview(await badgesAPI.overview())
    } catch {
      setBadgeOverview(null)
      setBadgeError('뱃지를 불러오지 못했어요.')
    } finally {
      setBadgeLoading(false)
    }
  }

  const displayedBadgeId =
    badgeOverview?.earned?.find(b => b.is_displayed)?.badge_id ?? null
  const earnedBadges = badgeOverview?.earned ?? []

  const handleBadgeDisplayChange = async (badgeId: number | null) => {
    if (displayLoading) return false
    setDisplayError(null)
    try {
      setDisplayLoading(true)
      await badgesAPI.setDisplayBadge(badgeId)
      await fetchBadges()
      return true
    } catch {
      setDisplayError('프로필에 표시할 뱃지를 바꾸지 못했어요.')
      return false
    } finally {
      setDisplayLoading(false)
    }
  }


  useEffect(() => {
    setMe(user)
  }, [user])

  useEffect(() => {
    if (isLoggedIn) {
      fetchMe()
      fetchBadges()
    } else {
      setMe(null)
      setBadgeOverview(null)
      setBadgeError(null)
      setBadgeLoading(false)
    }
  }, [isLoggedIn, fetchMe])

  if (!isLoggedIn) {
    return (
      <section className="app-tab mypage">
        <div className="card my-card center">
          <h2 className="title">마이페이지</h2>
          <p className="sub">로그인이 필요합니다.</p>
          <button className="btn primary" onClick={onRequireLogin}>로그인</button>
        </div>
      </section>
    )
  }

  return (
    <>
    <section className="app-tab mypage">
      <div className="subtabs">
        <button
          type="button"
          className={["subtab-btn", activeTab === 'profile' ? 'active' : ''].join(' ')}
          onClick={() => setActiveTab('profile')}
        >
          프로필
        </button>
        <button
          type="button"
          className={["subtab-btn", activeTab === 'badges' ? 'active' : ''].join(' ')}
          onClick={() => setActiveTab('badges')}
        >
          뱃지 보기
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="card my-card">
          <div className="row">
          <div className="avatar">{(me?.user_name ?? 'U').slice(0,1)}</div>
          <div className="info">
            <div className="name">{me?.user_name ?? '—'}</div>
            <div className="uid">ID: {me?.user_id ?? '—'}</div>
          </div>
        </div>

        {loading && <div className="note">불러오는 중…</div>}
        {error && <div className="error">{error}</div>}

        <div className="divider" />

        <div className="fields">
          <FieldRow
            label="이메일"
            value={<span className="value-strong">{me?.email ?? '—'}</span>}
          />
          <FieldRow
            label="성별"
            chip={me?.gender ? (me.gender === 'male' ? '남' : '여') : undefined}
            chipVariant="mint"
          />
          <FieldRow label="생년월일" value={me?.date_of_birth ?? '—'} />
          <FieldRow label="주간 목표" value={me?.goal != null ? String(me.goal) : '—'} />
          <FieldRow
            label="요리 레벨"
            chip={me?.cooking_level ?? undefined}
            chipVariant="beige"
          />
        </div>

        <div className="actions">
        <button className="editbtn" onClick={() => setShowEdit(true)}>프로필 수정</button>
      </div>
      <div style={{display:'flex', justifyContent:'flex-start', gap:12, marginTop:8, fontSize:12.5}}>
        <button
          type="button"
          onClick={() => setShowAbout(true)}
          style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', padding:0 }}
        >
          쿠커스 소개
        </button>
        <span style={{width:1, height:14, background:'#d1d5db'}} />
        <button
          type="button"
          onClick={() => setShowFAQ(true)}
          style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', padding:0 }}
        >
          FAQ
        </button>
      </div>
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:8}}>
          <a role="link" onClick={()=>setShowDelete(true)} style={{cursor:'pointer', fontSize:12, color:'#9ca3af', textDecoration:'none'}}>회원탈퇴</a>
        </div>
      </div>
      )}

      {activeTab === 'badges' && (
        <div className="card my-card">
          <div className="my-badge-header">
            <h3 style={{marginTop:0}}>나의 뱃지</h3>
            <button
              type="button"
              className="btn btn--tiny"
              onClick={() => { setDisplayError(null); setShowBadgeSelector(true) }}
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
      )}
      {showEdit && me && (
        <EditProfileDialog
          me={me}
          onClose={() => setShowEdit(false)}
          onSaved={async () => { setShowEdit(false); await fetchMe() }}
        />
      )}
      {showDelete && (
        <DeleteAccountDialog onClose={()=>setShowDelete(false)} />
      )}
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
    {showAbout && <AboutCookusModal onClose={() => setShowAbout(false)} />}
    {showFAQ && <FaqModal onClose={() => setShowFAQ(false)} />}
    </>
  )
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }){
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const submit = async () => {
    setErr(null)
    if (!pw || !pw2) { setErr('비밀번호를 입력해 주세요.'); return }
    if (pw !== pw2) { setErr('비밀번호가 일치하지 않습니다.'); return }
    // 1차 확인 모달 열기 (별도 모달)
    setConfirmOpen(true)
  }

  const doDelete = async () => {
    setErr(null)
    try{
      setBusy(true)
      await authAPI.deleteMe(pw, pw2)
      setDone(true)
      // 잠깐 감사 카드 보여준 뒤 메인으로 이동
      window.setTimeout(() => {
        window.location.href = '/'
      }, 1500)
    } catch(e:any){
      setErr(e?.response?.data?.detail ?? '탈퇴에 실패했습니다.')
    } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="inner-overlay" onClick={onClose}>
        <div className="modal card rec-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:360, textAlign:'center'}}>
          <h3 style={{margin:'10px 0'}}>그동안 이용해주셔서 감사합니다.</h3>
          <div className="muted">계정이 삭제 처리되었습니다.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="inner-overlay" onClick={onClose}>
      <div className="modal card rec-modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3 style={{marginTop:0}}>회원 탈퇴</h3>
        <p className="muted">계정 정보가 비식별화되고 로그인할 수 없게 됩니다.</p>
        <div style={{display:'grid', gap:8, marginTop:10}}>
          <input type="password" placeholder="비밀번호" value={pw} onChange={e=>setPw(e.target.value)} style={{padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:10}} />
          <input type="password" placeholder="비밀번호 확인" value={pw2} onChange={e=>setPw2(e.target.value)} style={{padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:10}} />
        </div>
        {err && <div className="error" style={{marginTop:8}}>{err}</div>}
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:12}}>
          <button className="btn" onClick={onClose} disabled={busy}>취소</button>
          <button className="btn danger" onClick={submit} disabled={busy}>탈퇴</button>
        </div>
      </div>
      {confirmOpen && (
        <div className="inner-overlay" onClick={()=>setConfirmOpen(false)}>
          <div className="modal card rec-modal" onClick={e=>e.stopPropagation()} style={{maxWidth:360}}>
            <button className="modal-close" onClick={()=>setConfirmOpen(false)}>×</button>
            <h3 style={{marginTop:0}}>정말 탈퇴하시겠습니까?</h3>
            <p className="muted">탈퇴 이후에는 되돌릴 수 없습니다.</p>
            <div style={{display:'flex', justifyContent:'flex-end', gap:8}}>
              <button className="btn" onClick={()=>setConfirmOpen(false)} disabled={busy}>취소</button>
              <button className="btn danger" onClick={doDelete} disabled={busy}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AboutCookusModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="inner-overlay" onClick={onClose}>
      <div className="modal card rec-modal modal-wide" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 style={{ marginTop:0 }}>쿠커스 소개</h2>
        <p style={{ textAlign:'left', lineHeight:1.6 }}>
          쿠커스는 냉장고 재료를 기반으로 맞춤형 레시피를 추천하고,
          한 번의 선택으로 요리 기록까지 관리할 수 있는 요리 도우미입니다.
          캘린더에 요리 기록을 남기고 통계로 나만의 요리 패턴을 확인해보세요!
        </p>
        <div style={{ display:'flex', justifyContent:'center', margin:'18px 0' }}>
          <img src={servingBattery} alt="요리사 건전지" style={{ width:180, height:'auto' }} />
        </div>
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}

function FaqModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('')
  const [items, setItems] = useState<FaqItem[]>([])
  const [cats, setCats] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const data = await fetchFaq(query, category)
        if (alive) setItems(data)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [query, category])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const cs = await fetchFaqCategories()
        if (alive) setCats(cs)
      } catch {}
    })()
    return () => { alive = false }
  }, [])

  return (
    <div className="inner-overlay" onClick={onClose}>
      <div className="modal card rec-modal modal-full" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 style={{marginTop:0, textAlign:'center'}}>무엇을 도와드릴까요?</h2>
        <div style={{display:'flex', justifyContent:'center', margin:'8px 0 12px', gap:8}}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="궁금한 내용을 검색해보세요"
            style={{width:'100%', maxWidth:520, padding:'10px 12px', borderRadius:10, border:'1px solid #e5e7eb'}}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{padding:'10px 8px', borderRadius:10, border:'1px solid #e5e7eb'}}
          >
            <option value=''>분류 전체</option>
            {cats.map((c,i)=>(<option key={i} value={c}>{c}</option>))}
          </select>
        </div>
        {loading ? (
          <div className="rec-loading"><div className="spinner" />
            <div className="rec-loading-text">검색 중...</div></div>
        ) : (
          <div style={{overflow:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:14}}>
              <thead>
                <tr style={{background:'#f9fafb'}}>
                  <th style={{textAlign:'left', padding:'8px', borderBottom:'1px solid #e5e7eb', width:'35%'}}>질문</th>
                  <th style={{textAlign:'left', padding:'8px', borderBottom:'1px solid #e5e7eb'}}>답변</th>
                  <th style={{textAlign:'left', padding:'8px', borderBottom:'1px solid #e5e7eb', width:120}}>분류</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.faq_id}>
                    <td style={{padding:'10px 8px', borderBottom:'1px solid #f1f5f9', fontWeight:700, color:'#111827'}}>{it.question}</td>
                    <td style={{padding:'10px 8px', borderBottom:'1px solid #f1f5f9', color:'#4b5563', whiteSpace:'pre-wrap'}}>{it.answer}</td>
                    <td style={{padding:'10px 8px', borderBottom:'1px solid #f1f5f9'}}>{it.category ?? '-'}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={3} style={{textAlign:'center', color:'#6b7280', padding:'16px'}}>검색 결과가 없어요</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <div style={{display:'flex', justifyContent:'flex-end', marginTop:12}}>
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
