// src/api/axios.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getAccessToken, setAccessToken, clearAccessToken } from './session'


// 우리 앱에서 쓰는 공용 axios 인스턴스
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // refresh 쿠키 등 포함
})

// --- 요청 인터셉터: 항상 Authorization 헤더 붙이기 ---
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const url = (config.url || '').toLowerCase()

  // 무토큰(쿠키 기반)으로 호출해야 하는 엔드포인트들
  const authFree = [
    '/auth/refresh',       // ★ 리프레시
    '/auth/login',         // 로그인
    '/auth/signup',        // 회원가입
    '/auth/find-id', '/auth/find-password',
    '/auth/verify',        // 필요 시: 코드 검증류
  ]

  // 일부 프록시 구성에서는 /api 접두사가 붙음 → 양쪽 모두 대응
  const isAuthFree = authFree.some(p =>
    url === p || url.startsWith(p) || url === `/api${p}` || url.startsWith(`/api${p}`)
  )

  if (isAuthFree) {
    // [CHANGE] 의도치 않은 주입 방지
    if (config.headers) {
      delete (config.headers as any).Authorization   // ★ 제거
    }
    return config
  }

  // 그 외에는 평소처럼 액세스 토큰 주입
  const token = getAccessToken?.()
  if (token) {
    config.headers = config.headers || {}
    ;(config.headers as any).Authorization = `Bearer ${token}`
  }
  return config
})

// --- 응답 인터셉터: 401이면 한 번만 refresh한 뒤 재시도 ---
let isRefreshing = false
let waitQueue: Array<(token: string | null) => void> = []

async function doRefresh(): Promise<string | null> {
  try {
    const resp = await api.post('/auth/refresh', null /* no body */)
    const access = resp.data?.accessToken ?? resp.data?.access_token ?? null
    if (access) setAccessToken(access)
    return access
  } catch {
    clearAccessToken()
    return null
  }
}

api.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean })

    // 401 아니면 그대로 던짐
    if (error.response?.status !== 401 || original?._retry) {
      throw error
    }

    // 중복 리프레시 방지
    original._retry = true

    if (!isRefreshing) {
      isRefreshing = true
      const newToken = await doRefresh()
      isRefreshing = false
      // 대기 중이던 요청들 재개
      waitQueue.forEach((resume) => resume(newToken))
      waitQueue = []
      if (!newToken) throw error // 리프레시 실패 → 그대로 401
      // 토큰 붙여 재시도
      original.headers = original.headers || {}
      ;(original.headers as any).Authorization = `Bearer ${newToken}`
      return api(original)
    }

    // 이미 리프레시 중이면 대기 후 재시도
    return new Promise((resolve, reject) => {
      waitQueue.push((token) => {
        if (!token) return reject(error)
        try {
          original.headers = original.headers || {}
          ;(original.headers as any).Authorization = `Bearer ${token}`
          resolve(api(original))
        } catch (e) {
          reject(e)
        }
      })
    })
  }
)

export default api
