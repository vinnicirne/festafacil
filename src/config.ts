const env = import.meta.env as Record<string, string | undefined>
const num = (val: string | undefined, fallback: number) => {
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

export const SUGGESTION_TRUNCATE_LIMIT = num(env.VITE_SUGGESTION_TRUNCATE_LIMIT, 40)
export const SUGGESTIONS_LIMIT = num(env.VITE_SUGGESTIONS_LIMIT, 20)
export const NAVBAR_SEARCH_DEBOUNCE_MS = num(env.VITE_NAVBAR_SEARCH_DEBOUNCE_MS, 350)
export const HERO_CEP_DEBOUNCE_MS = num(env.VITE_HERO_CEP_DEBOUNCE_MS, 300)
export const AUTOCOMPLETE_DEBOUNCE_MS = num(env.VITE_AUTOCOMPLETE_DEBOUNCE_MS, 200)
export const AUTOCOMPLETE_MAX_OPTIONS = num(env.VITE_AUTOCOMPLETE_MAX_OPTIONS, 8)
export const CEP_PREFIX_MIN = num(env.VITE_CEP_PREFIX_MIN, 5)
export const CEP_FULL_LENGTH = num(env.VITE_CEP_FULL_LENGTH, 8)
export const PROVIDER_CEP_DEBOUNCE_MS = num(env.VITE_PROVIDER_CEP_DEBOUNCE_MS, 300)

// Rating
export const RATING_MAX_STARS = num(env.VITE_RATING_MAX_STARS, 5)
export const RATING_STAR_COLOR = env.VITE_RATING_STAR_COLOR || '#FFB300'
export const RATING_MIN = num(env.VITE_RATING_MIN, 0)
export const RATING_MAX = num(env.VITE_RATING_MAX, 5)
export const RATING_STEP = num(env.VITE_RATING_STEP, 0.5)

// Busca / filtros
export const SEARCH_PRICE_MIN_DEFAULT = num(env.VITE_SEARCH_PRICE_MIN_DEFAULT, 0)
export const SEARCH_PRICE_MAX_DEFAULT = num(env.VITE_SEARCH_PRICE_MAX_DEFAULT, 3000)
export const MIN_RATING_DEFAULT = num(env.VITE_MIN_RATING_DEFAULT, 0)

// UI timings
export const CAROUSEL_AUTOPLAY_INTERVAL_MS = num(env.VITE_CAROUSEL_AUTOPLAY_INTERVAL_MS, 4000)
export const AUTOCOMPLETE_BLUR_CLOSE_DELAY_MS = num(env.VITE_AUTOCOMPLETE_BLUR_CLOSE_DELAY_MS, 120)
// Data/cache
export const PROVIDERS_CACHE_TTL_MS = num(env.VITE_PROVIDERS_CACHE_TTL_MS, 300000)
// Busca/paginação
export const SEARCH_PAGE_SIZE = num(env.VITE_SEARCH_PAGE_SIZE, 12)