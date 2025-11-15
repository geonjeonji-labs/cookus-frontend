import { useEffect, useState } from 'react'
import type { Recipe } from '../api/recipe'
import { recipeAPI } from '../api/recipe'
import RecipeCard from './RecipeCard'
import api from '../api/axios'

type Props = {
  onClose: () => void
  onDetail: (r: Recipe) => void
  pendingRecipeIds: number[]
  confirmedRecipeIds: number[]
  onToggleRecipe: (recipeId: number) => void
  onRecipesConfirmed: (recipeIds: number[]) => void
  onRemovePending: (ids: number[]) => void
}

export default function RecipeRecommendModal({
  onClose,
  onDetail,
  pendingRecipeIds,
  confirmedRecipeIds,
  onToggleRecipe,
  onRecipesConfirmed,
  onRemovePending,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [list, setList] = useState<Recipe[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null)
  const pendingSet = new Set(pendingRecipeIds)
  const confirmedSet = new Set(confirmedRecipeIds)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await recipeAPI.recommendTop3()
        if (mounted) setList(data)
      } catch (e: any) {
        if (mounted) setError('재료가 부족합니다. 재료 추가 후 다시 시도해주세요.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="inner-overlay" onClick={onClose}>
      <div className="modal card rec-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 style={{ marginTop: 0 }}>추천 레시피</h2>

        {loading && (
          <div className="rec-loading">
            <div className="spinner" />
            <div className="rec-loading-text">추천 중...</div>
          </div>
        )}

        {!loading && error && <div className="rec-error">{error}</div>}

        {!loading && !error && (
          <div className="rec-grid">
            {list.map(r => (
              <div key={(r as any).recipe_id} className="rec-card">
                {confirmedSet.has((r as any).recipe_id) && !pendingSet.has((r as any).recipe_id) && (
                  <div className="rec-note">이미 기록됨</div>
                )}
                <RecipeCard
                  recipe={r}
                  onDetail={() => onDetail(r)}
                  onSelect={() => {
                    setNotice(null)
                    onToggleRecipe((r as any).recipe_id)
                  }}
                  selected={pendingSet.has((r as any).recipe_id)}
                />
              </div>
            ))}
          </div>
        )}

        {notice && (
          <div className={`inline-note ${notice.tone}`} style={{ marginTop: 12 }}>
            {notice.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={onClose}>
            닫기
          </button>
          <button
            className="btn primary"
            disabled={!pendingRecipeIds.length || submitting}
            onClick={async () => {
              if (!pendingRecipeIds.length) {
                setNotice({ text: '선택한 레시피가 없어요', tone: 'warn' })
                return
              }
              setSubmitting(true)
              setNotice(null)
              const uniqueIds = Array.from(new Set(pendingRecipeIds))
              const duplicateIds: number[] = []
              const freshIds: number[] = []

              for (const id of uniqueIds) {
                if (confirmedSet.has(id)) {
                  duplicateIds.push(id)
                  continue
                }
                try {
                  const { data } = await api.get('/me/selected-recipe/status', { params: { recipe_id: id } })
                  if (data?.selected) {
                    duplicateIds.push(id)
                  } else {
                    freshIds.push(id)
                  }
                } catch {
                  freshIds.push(id)
                }
              }

              if (duplicateIds.length) onRemovePending(duplicateIds)

              if (!freshIds.length) {
                setNotice({ text: '이미 캘린더에 있는 레시피만 골랐어요', tone: 'warn' })
                setSubmitting(false)
                return
              }

              const successIds: number[] = []
              const failedIds: number[] = []

              for (const id of freshIds) {
                try {
                  await api.post('/me/selected-recipe', { recipe_id: id })
                  successIds.push(id)
                } catch {
                  failedIds.push(id)
                }
              }

              if (successIds.length) {
                onRecipesConfirmed(successIds)
              }

              if (failedIds.length) {
                setNotice({ text: '일부 레시피 기록에 실패했어요. 다시 시도해주세요.', tone: 'warn' })
              } else if (duplicateIds.length) {
                setNotice({ text: '이미 캘린더에 있던 레시피는 제외했어요.', tone: 'warn' })
              } else {
                setNotice({ text: `${successIds.length}개의 레시피를 캘린더에 기록했어요.`, tone: 'ok' })
              }

              setSubmitting(false)
            }}
          >
            {submitting ? '기록 중...' : '캘린더에 기록'}
          </button>
        </div>
      </div>
    </div>
  )
}
