import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { recipeAPI, type SelectedRecipesResponse } from '../api/recipe'
import type { Recipe } from '../api/recipe'
import RecipeDetailModal from '../components/RecipeDetailModal'
import AddSupplementPlanModal from '../components/AddSupplementPlanModal'
import { nutritionAPI, type DayPlan, type DayStatus, type SupplementPlan } from '../api/nutrition'
import chefBattery from '../assets/요리사 건전지.png'
import './Calendar.css'

type CalendarProps = { isLoggedIn: boolean; userName?: string; fullRequestKey?: number }
type Row = SelectedRecipesResponse['recipes'][number]

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export default function Calendar({ isLoggedIn, userName, fullRequestKey }: CalendarProps) {
  const [data, setData] = useState<SelectedRecipesResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [detail, setDetail] = useState<Recipe | null>(null)
  const [detailCooked, setDetailCooked] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [toastKind, setToastKind] = useState<'ok' | 'warn'>('ok')
  const [confirmRow, setConfirmRow] = useState<Row | null>(null)
  const [showFull, setShowFull] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const [selectedDay, setSelectedDay] = useState<string | null>(() => ymd(new Date()))
  const [dailyPlans, setDailyPlans] = useState<DayPlan[] | null>(null)
  const [dailyLoading, setDailyLoading] = useState(false)
  const [nutritionStatus, setNutritionStatus] = useState<Map<string, DayStatus>>(new Map())
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [editPlan, setEditPlan] = useState<SupplementPlan | null>(null)

  const refetch = useCallback(async () => {
    if (!isLoggedIn) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await recipeAPI.getSelected()
      setData(res)
    } catch (e) {
      console.error('[Calendar] getSelected failed:', e)
      setError('기록을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    refetch()
  }, [refetch])

  const openDetailByRecommend = async (recommendId: number, cooked?: boolean) => {
    setDetailLoading(true)
    try {
      setDetailCooked(!!cooked)
      const r = await recipeAPI.getRecommendation(recommendId)
      setDetail(r)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = async () => {
    setDetail(null)
    await refetch()
  }

  const recipeByDay = useMemo(() => {
    const map = new Map<string, Row[]>()
    for (const row of data?.recipes ?? []) {
      const d = toLocalDate(row.selected_date)
      if (!d) continue
      const key = ymd(d)
      const list = map.get(key) ?? []
      list.push(row)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.selected_id ?? 0) - (b.selected_id ?? 0))
    }
    return map
  }, [data])

  const selectedRecipes = useMemo(() => {
    if (!selectedDay) return []
    return recipeByDay.get(selectedDay) ?? []
  }, [recipeByDay, selectedDay])

  const fullHistoryGroups = useMemo(() => {
    type Group = { key: string; label: string; items: Array<{ row: Row; dateLabel: string; date: Date }> }
    const groups = new Map<string, Group>()
    for (const row of data?.recipes ?? []) {
      const d = toLocalDate(row.selected_date)
      if (!d) continue
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`
      const group = groups.get(key) ?? { key, label, items: [] }
      group.items.push({ row, dateLabel: ymd(d), date: d })
      groups.set(key, group)
    }
    const arr = Array.from(groups.values())
    arr.sort((a, b) => (a.key > b.key ? -1 : 1))
    arr.forEach(group => group.items.sort((a, b) => b.date.getTime() - a.date.getTime()))
    return arr
  }, [data])

  const now = new Date()
  const todayStr = ymd(now)
  const todayAnchor = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [todayStr])

  const rangeStart = useMemo(() => {
    const base = new Date(todayAnchor.getFullYear(), todayAnchor.getMonth(), todayAnchor.getDate())
    const weekday = (base.getDay() + 6) % 7
    base.setDate(base.getDate() - (weekday + 7))
    return base
  }, [todayAnchor])

  const rangeDays = useMemo(() => {
    const arr: Date[] = []
    for (let i = 0; i < 21; i++) {
      const d = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate() + i)
      arr.push(d)
    }
    return arr
  }, [rangeStart])

  const rangeEndMs = useMemo(() => {
    if (rangeDays.length === 0) return rangeStart.getTime()
    const end = rangeDays[rangeDays.length - 1]
    return new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime()
  }, [rangeDays, rangeStart])

  useEffect(() => {
    if (!selectedDay) return
    const d = toLocalDate(selectedDay)
    if (!d) return
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    if (target < rangeStart.getTime() || target > rangeEndMs) {
      setSelectedDay(todayStr)
    }
  }, [rangeEndMs, rangeStart, selectedDay, todayStr])

  const nutritionMonths = useMemo(() => {
    const set = new Set<string>()
    for (const d of rangeDays) set.add(ym(d))
    return Array.from(set)
  }, [rangeDays])

  const refreshNutritionStatus = useCallback(async () => {
    if (!isLoggedIn) {
      setNutritionStatus(new Map())
      return
    }
    if (nutritionMonths.length === 0) return
    try {
      const lists = await Promise.all(nutritionMonths.map(m => nutritionAPI.getMonthStatus(m)))
      const map = new Map<string, DayStatus>()
      for (const rows of lists) {
        for (const row of rows) map.set(row.date, row)
      }
      setNutritionStatus(map)
    } catch (err) {
      console.error('[Calendar] getMonthStatus failed:', err)
    }
  }, [isLoggedIn, nutritionMonths])

  const loadDaily = useCallback(async (dateStr: string) => {
    if (!isLoggedIn) {
      setDailyPlans(null)
      return
    }
    setDailyLoading(true)
    try {
      const rows = await nutritionAPI.getDaily(dateStr)
      setDailyPlans(rows)
    } catch (err) {
      console.error('[Calendar] getDaily failed:', err)
      setDailyPlans([])
    } finally {
      setDailyLoading(false)
    }
  }, [isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) {
      setNutritionStatus(new Map())
      setDailyPlans(null)
      return
    }
    refreshNutritionStatus()
  }, [isLoggedIn, refreshNutritionStatus])

  useEffect(() => {
    if (!isLoggedIn) {
      setDailyPlans(null)
      return
    }
    if (!selectedDay) return
    loadDaily(selectedDay)
  }, [isLoggedIn, loadDaily, selectedDay])

  const showToastMessage = (msg: string, kind: 'ok' | 'warn' = 'ok', ms = 1800) => {
    setToastKind(kind)
    setToast(msg)
    window.setTimeout(() => setToast(null), ms)
  }

  const checkedDaySet = useMemo(() => {
    const set = new Set<string>()
    for (const row of data?.recipes ?? []) {
      if ((row.action ?? 0) !== 1) continue
      const d = toLocalDate(row.selected_date)
      if (!d) continue
      set.add(ymd(d))
    }
    return set
  }, [data])

  const streakCount = useMemo(() => {
    if (!selectedDay) return 0
    const base = toLocalDate(selectedDay)
    if (!base) return 0
    const cursor = new Date(base.getFullYear(), base.getMonth(), base.getDate())
    let cnt = 0
    while (true) {
      const key = ymd(cursor)
      if (!checkedDaySet.has(key)) break
      cnt += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return cnt
  }, [checkedDaySet, selectedDay])

  const nickname = useMemo(() => userName?.trim() || '셰프', [userName])
  const motivation = useMemo(() => {
    if (!selectedDay) return null
    const selectedFuture = isFutureDate(selectedDay, todayAnchor)
    if (selectedFuture) {
      return { text: '앞으로도 멋진 기록 기대할게요! 예약만 해두면 OK!', tone: 'future' as const, toastKind: 'ok' as const }
    }
    const isToday = selectedDay === todayStr
    if (selectedRecipes.length === 0) {
      const emptyDayLabel = isToday ? '오늘은' : `${selectedDay}에는`
      return { text: `${emptyDayLabel} 아직 레시피가 없어요. 추천받아 살짝 채워볼까요?`, tone: 'empty' as const, toastKind: 'warn' as const }
    }
    const checkedCount = selectedRecipes.filter(row => (row.action ?? 0) === 1).length
    if (checkedCount === 0) {
      return {
        text: isToday
          ? `오늘도 멋진 ${nickname}님의 한 끼를 기록해보세요!`
          : `그날의 기록도 채워보면 어떨까요?`,
        tone: 'encourage' as const,
        toastKind: 'ok' as const,
      }
    }
    const streak = streakCount > 0 ? streakCount : 1
    const prefix = streak >= 10 ? '대단해요! ' : ''
    return { text: `${prefix}지금 ${streak}일째 레시피 기록 중! 계속 이어가요!`, tone: 'celebrate' as const, toastKind: 'ok' as const }
  }, [nickname, selectedDay, selectedRecipes, streakCount, todayAnchor, todayStr])

  const lastMotivationKey = useRef<string | null>(null)
  useEffect(() => {
    if (!motivation || !isLoggedIn || !selectedDay || loading) return
    if (selectedDay !== todayStr) return
    const key = `${selectedDay}-${motivation.text}`
    if (lastMotivationKey.current === key) return
    lastMotivationKey.current = key
    showToastMessage(motivation.text, motivation.toastKind, motivation.tone === 'celebrate' ? 2800 : 2200)
  }, [isLoggedIn, loading, motivation, selectedDay, todayStr])

  const dailySummary = useMemo(() => {
    if (!dailyPlans || dailyPlans.length === 0) {
      return { total: 0, taken: 0, missingPlans: [] as DayPlan[], missingSlots: [] as string[] }
    }
    const missingPlans = dailyPlans.filter(plan => !plan.taken)
    const missingSlots = Array.from(new Set(missingPlans.map(plan => slotLabel(plan.time_slot))))
    return {
      total: dailyPlans.length,
      taken: dailyPlans.filter(plan => plan.taken).length,
      missingPlans,
      missingSlots,
    }
  }, [dailyPlans])

  const nutritionMotivation = useMemo(() => {
    if (!selectedDay) return null
    if (isFutureDate(selectedDay, todayAnchor)) {
      return { tone: 'future' as const, text: '미리 챙기는 루틴 최고! 알림 맞춰 두셨죠?' }
    }
    if (!dailyPlans || dailyPlans.length === 0) {
      return { tone: 'empty' as const, text: '아직 영양제 계획이 없어요. 루틴을 만들어보면 어떨까요?' }
    }
    const checked = dailySummary.taken
    const total = dailySummary.total
    if (checked === 0) {
      const missingList = dailySummary.missingSlots.join(', ') || '아침'
      return { tone: 'warn' as const, text: `${missingList} 영양제를 잊지 말고 챙겨요!` }
    }
    if (checked === total) {
      return { tone: 'celebrate' as const, text: '오늘의 영양 루틴 완료! 완벽해요!' }
    }
    const missingList = dailySummary.missingSlots.join(', ')
    return { tone: 'encourage' as const, text: `${missingList}만 더 챙기면 오늘도 성공!` }
  }, [dailyPlans, dailySummary, selectedDay, todayAnchor])

  const goSelectDay = (dayStr: string) => {
    setSelectedDay(dayStr)
  }

  const deleteSelected = async (row: Row) => {
    try {
      setDeletingId(row.selected_id)
      await recipeAPI.deleteSelected(row.selected_id)
      if (detail?.recipe_id === row.recipe_id) setDetail(null)
      await refetch()
      showToastMessage('기록이 삭제되었어요.', 'ok')
    } catch (e) {
      console.error('[Calendar] deleteSelected failed:', e)
      showToastMessage('삭제에 실패했어요. 잠시 후 다시 시도해주세요.', 'warn', 2200)
    } finally {
      setDeletingId(null)
    }
  }

  const toggleAction = async (row: Row) => {
    const next = (row.action ?? 0) === 1 ? 0 : 1
    try {
      setTogglingId(row.selected_id)
      await recipeAPI.setSelectedAction(row.selected_id, next as 0 | 1)
      await refetch()
      showToastMessage(next === 1 ? '체크했어요!' : '체크를 해제했어요.', 'ok')
    } catch (e) {
      console.error('[Calendar] toggleAction failed:', e)
      showToastMessage('변경에 실패했어요.', 'warn', 2200)
    } finally {
      setTogglingId(null)
    }
  }

  const lastFullKey = useRef(fullRequestKey)
  useEffect(() => {
    if (fullRequestKey === undefined) return
    if (lastFullKey.current === fullRequestKey) return
    lastFullKey.current = fullRequestKey
    if (isLoggedIn) setShowFull(true)
  }, [fullRequestKey, isLoggedIn])

  const requestPlanModal = (plan?: SupplementPlan) => {
    if (!isLoggedIn) return
    setEditPlan(plan ?? null)
    setShowPlanModal(true)
  }

  const handlePlanSaved = async () => {
    setShowPlanModal(false)
    setEditPlan(null)
    await refreshNutritionStatus()
    if (selectedDay) await loadDaily(selectedDay)
  }

  const handlePlanModalClose = () => {
    setShowPlanModal(false)
    setEditPlan(null)
  }

  const handleDeletePlan = async (planId: number) => {
    if (!selectedDay) return
    setDailyPlans(prev => prev ? prev.filter(plan => plan.plan_id !== planId) : prev)
    try {
      await nutritionAPI.deletePlan(planId)
      await refreshNutritionStatus()
      await loadDaily(selectedDay)
      showToastMessage('영양제 계획을 삭제했어요.', 'ok')
    } catch (err) {
      console.error('[Calendar] delete plan failed:', err)
      showToastMessage('삭제하지 못했어요.', 'warn')
      await loadDaily(selectedDay)
    }
  }

  const handleTogglePlan = async (plan: DayPlan) => {
    if (!selectedDay || isFutureDate(selectedDay, todayAnchor)) return
    try {
      setDailyPlans(prev => prev ? prev.map(p => (p.plan_id === plan.plan_id ? { ...p, taken: !plan.taken } : p)) : prev)
      await nutritionAPI.setTaken(plan.plan_id, selectedDay, !plan.taken)
      await refreshNutritionStatus()
      await loadDaily(selectedDay)
    } catch (err) {
      console.error('[Calendar] setTaken failed:', err)
      showToastMessage('체크를 바꾸지 못했어요.', 'warn')
    }
  }

  return (
    <section className="app-tab cal">
      {toast && (
        <div className={`cal-toast ${toastKind}`} role="status">
          {toast}
        </div>
      )}

      <div className="cal-layout">
        <div className="cal-panel">
          <div className="card cal-card">
            <div className="cal-header">
              <h2 className="title">나의 캘린더</h2>
            </div>

            {!isLoggedIn && <div className="muted">로그인 후 레시피 및 영양 루틴을 확인할 수 있어요.</div>}
            {isLoggedIn && loading && <div className="muted">불러오는 중...</div>}
            {isLoggedIn && error && <div className="error">{error}</div>}

            {isLoggedIn && !loading && !error && (
              <>
                <div className="calendar calendar--trimmed">
                  <div className="week-head">
                    {WEEKDAY_LABELS.map(label => (
                      <div key={label} className="cell head">{label}</div>
                    ))}
                  </div>
                  <div className="weeks weeks--trimmed">
                    {rangeDays.map((day, idx) => {
                      const dayStr = ymd(day)
                      const recipes = recipeByDay.get(dayStr) ?? []
                      const hasCooked = recipes.some(row => (row.action ?? 0) === 1)
                      const stat = nutritionStatus.get(dayStr)
                      const info: string[] = []
                      if (recipes.length > 0) info.push(`레시피 ${recipes.length}개`)
                      if (stat) info.push(`영양제 ${stat.taken}/${stat.total}`)
                      const title = info.length ? info.join(' / ') : undefined
                      const isFuture = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() > todayAnchor.getTime()
                      const nutIndicator = stat ? dotColor(stat, isFuture) : null
                      const classes = [
                        'cell',
                        'day',
                        dayStr === todayStr ? 'today' : '',
                        selectedDay === dayStr ? 'sel' : '',
                        recipes.length > 0 || stat ? 'has' : '',
                      ].join(' ').trim()
                      return (
                        <button
                          key={`${dayStr}-${idx}`}
                          className={classes}
                          onClick={() => goSelectDay(dayStr)}
                          title={title}
                        >
                          <span className="dnum">{day.getDate()}</span>
                          <span className="dots">
                            {recipes.length > 0 && (
                              hasCooked ? (
                                <span className="dot dot--cooked" aria-hidden />
                              ) : (
                                <span className="dot dot--recipe" aria-hidden />
                              )
                            )}
                            {nutIndicator && (
                              <span
                                className={[
                                  'dot',
                                  'dot--nut',
                                  nutIndicator.missed ? 'dot--nut-missed' : '',
                                ].join(' ').trim()}
                                aria-hidden
                                style={
                                  !nutIndicator.missed && nutIndicator.color
                                    ? { background: nutIndicator.color }
                                    : undefined
                                }
                                title={title}
                              />
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {isLoggedIn && motivation && (
            <div className={`cal-note cal-note--${motivation.tone}`}>
              <img src={chefBattery} alt="" aria-hidden className="cal-note__avatar" />
              <div className="cal-note__bubble">
                <span className="cal-note__text">{motivation.text}</span>
              </div>
            </div>
          )}
          {isLoggedIn && selectedDay && nutritionMotivation && (
            <div className={`nut-note nut-note--${nutritionMotivation.tone}`}>
              <div className="nut-note__bubble">
                <span className="nut-note__text">{nutritionMotivation.text}</span>
              </div>
              <img src={chefBattery} alt="" aria-hidden className="nut-note__avatar" />
            </div>
          )}

          {isLoggedIn && (
            <div className="combo-card">
              <div className="combo-head">
                <span>{selectedDay || '날짜 선택'}</span>
                <div className="head-actions">
                  <button className="btn" onClick={() => requestPlanModal()} disabled={!isLoggedIn}>
                    영양제 등록
                  </button>
                </div>
              </div>

              <div className="combo-section combo-section--recipes">
                {(!selectedDay || selectedRecipes.length === 0) && (
                  <div className="muted small">해당 날짜에 기록된 레시피가 아직 없어요.</div>
                )}
                {selectedDay && selectedRecipes.length > 0 && (
                  <ul className="day-body">
                    {selectedRecipes.map(row => (
                      <li key={row.selected_id} className={`row ${row.action === 1 ? 'done' : ''}`}>
                        <button
                          className={`btn check sm ${row.action === 1 ? 'active' : ''}`}
                          onClick={() => toggleAction(row)}
                          disabled={togglingId === row.selected_id}
                          title={row.action === 1 ? '체크 해제' : '체크'}
                        >
                          {row.action === 1 ? '✓' : '□'}
                        </button>
                        <div className="title clamp-1">{row.recipe_nm_ko}</div>
                        <div className="actions" style={{ display: 'flex', gap: 12 }}>
                          <button className="btn sm" onClick={() => openDetailByRecommend(row.recommend_id, row.action === 1)}>
                            자세히 보기
                          </button>
                          <button
                            className="btn danger outline sm"
                            onClick={() => setConfirmRow(row)}
                            disabled={deletingId === row.selected_id}
                            aria-label="삭제"
                          >
                            {deletingId === row.selected_id ? '...' : '×'}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="combo-section combo-section--checks">
                {!selectedDay && <div className="muted">날짜를 선택해주세요.</div>}
                {selectedDay && (
                  <div className="check-list-wrap">
                    {dailyLoading && <div className="muted">불러오는 중...</div>}
                    {!dailyLoading && (
                      <div className="check-list">
                        {(dailyPlans ?? []).map(plan => (
                          <div
                            key={plan.plan_id}
                            className={`check-item ${plan.taken ? 'on' : ''} ${isFutureDate(selectedDay, todayAnchor) ? 'disabled' : ''}`}
                          >
                            <div className="info">
                              <div className="name">{plan.supplement_name}</div>
                              <div className="slot">{plan.time_slot}</div>
                            </div>
                            <button
                              className={`chkbox ${plan.taken ? 'on' : ''}`}
                              disabled={isFutureDate(selectedDay, todayAnchor)}
                              onClick={() => handleTogglePlan(plan)}
                              aria-pressed={plan.taken}
                            >
                              {plan.taken ? '✓' : ''}
                            </button>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                className="icon-btn small"
                                title="수정"
                                onClick={() => requestPlanModal({ plan_id: plan.plan_id, supplement_name: plan.supplement_name, time_slot: plan.time_slot })}
                              >
                                ✎
                              </button>
                              <button
                                className="icon-btn small"
                                title="삭제"
                                onClick={() => handleDeletePlan(plan.plan_id)}
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        ))}
                        {(dailyPlans === null || dailyPlans.length === 0) && !dailyLoading && (
                          <div className="muted">등록된 영양제가 없어요.</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {confirmRow && (
        <div className="cal-overlay" role="dialog" aria-modal="true">
          <div className="cal-confirm">
            <h3 className="cal-confirm-title">정말 삭제할까요?</h3>
            <div className="cal-confirm-meta">{confirmRow.recipe_nm_ko}</div>
            <div className="cal-confirm-actions">
              <button className="btn ghost" onClick={() => setConfirmRow(null)}>취소</button>
              <button
                className="btn danger"
                onClick={async () => {
                  const row = confirmRow
                  setConfirmRow(null)
                  await deleteSelected(row!)
                }}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {detailLoading && <div className="muted">자세한 정보를 불러오고 있어요...</div>}
      {detail && (
        <RecipeDetailModal
          recipe={detail}
          onClose={closeDetail}
          showSelect={false}
          cooked={detailCooked}
        />
      )}

      {showFull && typeof document !== 'undefined' && document.querySelector('.app-tab') && (
        createPortal(
          <div className="cal-full-overlay" onClick={() => setShowFull(false)}>
            <div className="cal-full" onClick={e => e.stopPropagation()}>
              <button className="cal-x" onClick={() => setShowFull(false)}>×</button>
              <h3 className="title">전체 레시피 기록</h3>
              <div className="cal-full-body">
                {fullHistoryGroups.length === 0 ? (
                  <div className="muted full-empty">아직 기록이 없어요.</div>
                ) : (
                  fullHistoryGroups.map(group => (
                    <div key={group.key} className="cal-full-month">
                      <div className="cal-full-month-head">{group.label}</div>
                      <ul className="list">
                        {group.items.map(({ row, dateLabel }) => (
                          <li key={`full-${row.selected_id}`} className={`row ${row.action === 1 ? 'done' : ''}`}>
                            <span className="full-date">{dateLabel}</span>
                            <button
                              className={`btn check sm ${row.action === 1 ? 'active' : ''}`}
                              onClick={() => toggleAction(row)}
                              disabled={togglingId === row.selected_id}
                              title={row.action === 1 ? '체크 해제' : '체크'}
                            >
                              {row.action === 1 ? '✓' : '□'}
                            </button>
                            <div className="title clamp-1">{row.recipe_nm_ko}</div>
                            <div className="actions" style={{ display: 'flex', gap: 12 }}>
                              <button className="btn sm" onClick={() => openDetailByRecommend(row.recommend_id, row.action === 1)}>
                                자세히 보기
                              </button>
                              <button
                                className="btn danger outline sm"
                                onClick={() => setConfirmRow(row)}
                                disabled={deletingId === row.selected_id}
                                aria-label="삭제"
                              >
                                {deletingId === row.selected_id ? '...' : '×'}
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn" onClick={() => setShowFull(false)}>닫기</button>
              </div>
            </div>
          </div>,
          document.querySelector('.app-tab') as Element
        )
      )}

      {showPlanModal && isLoggedIn && (
        <AddSupplementPlanModal
          plan={editPlan || undefined}
          onClose={handlePlanModalClose}
          onAdded={handlePlanSaved}
        />
      )}
    </section>
  )
}

function ymd(d: Date) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function toLocalDate(value?: string | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const t = String(value).trim().slice(0, 10).replace(/[./]/g, '-')
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function isFutureDate(dateStr: string, anchor: Date) {
  const d = toLocalDate(dateStr)
  if (!d) return false
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const base = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()).getTime()
  return target > base
}

function slotLabel(slot: string): string {
  const cleaned = slot.replace(/\s+/g, '')
  if (/아침|모닝|morning|오전/i.test(cleaned)) return '아침'
  if (/점심|런치|lunch|오후/i.test(cleaned)) return '점심'
  if (/저녁|dinner|evening|취침전/i.test(cleaned)) return '저녁'
  if (/간식|snack|공복/i.test(cleaned)) return '간식'
  return '기타'
}

type NutIndicator = { color?: string; missed?: boolean }

function dotColor(stat: DayStatus, isFuture: boolean): NutIndicator | null {
  if (isFuture) return null
  const taken = Math.max(0, stat.taken ?? 0)
  const total = Math.max(0, stat.total ?? 0)
  if (taken === 0) {
    return total === 0 ? null : { missed: true }
  }
  if (total === 0) return { color: '#16a34a' }
  if (taken >= total) return { color: '#16a34a' }
  return { color: '#f59e0b' }
}
