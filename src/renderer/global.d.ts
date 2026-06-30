import type { BadgeApi } from '../shared/types'

declare global {
  interface Window {
    api: BadgeApi
  }
}

export {}
