import { RATING_MAX_STARS, RATING_STAR_COLOR } from '@/config'
type Props = { value: number, count?: number }
export default function RatingStars({ value, count }: Props){
  const full = Math.floor(value)
  const half = value - full >= 0.5
  const stars = Array.from({length:RATING_MAX_STARS}).map((_,i)=> i < full ? '★' : (i===full && half ? '☆' : '☆'))
  const color = RATING_STAR_COLOR
  return (
    <span aria-label={`Nota ${value.toFixed(1)} de ${RATING_MAX_STARS}`} title={`${value.toFixed(1)} / ${RATING_MAX_STARS}`}>
      <span style={{color, letterSpacing:.5}}>{stars.join(' ')}</span>
      {typeof count === 'number' && <span style={{marginLeft:6, color:'var(--color-muted)'}}>({count})</span>}
    </span>
  )
}