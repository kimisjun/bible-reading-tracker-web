import { useEffect, useState } from 'react'

const DAY_IN_MS = 24 * 60 * 60 * 1_000
const KOREA_OFFSET_IN_MS = 9 * 60 * 60 * 1_000

function millisecondsUntilNextKoreaDay(now: Date) {
  const nowTime = now.getTime()
  const nextKoreaMidnight = (
    Math.floor((nowTime + KOREA_OFFSET_IN_MS) / DAY_IN_MS) + 1
  ) * DAY_IN_MS - KOREA_OFFSET_IN_MS
  return Math.max(1, nextKoreaMidnight - nowTime)
}

export function useKoreaClock(providedNow?: Date) {
  const [dayTick, setDayTick] = useState(0)

  useEffect(() => {
    if (providedNow !== undefined) return undefined
    const currentNow = new Date()
    const timer = window.setTimeout(
      () => setDayTick((tick) => tick + 1),
      millisecondsUntilNextKoreaDay(currentNow),
    )
    return () => window.clearTimeout(timer)
  }, [dayTick, providedNow])

  return providedNow ?? new Date()
}
