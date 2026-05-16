import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

import { type FilmDataSlice, createFilmDataSlice } from './film-data-slice'
import { type UiSlice, createUiSlice } from './ui-slice'
import { type VoroforceSlice, createEngineSlice } from './voroforce-slice'

export type StoreState = UiSlice & VoroforceSlice & FilmDataSlice

export const store = create(
  subscribeWithSelector<StoreState>((...a) => ({
    ...createUiSlice(...a),
    ...createEngineSlice(...a),
    ...createFilmDataSlice(...a),
  })),
)

export const useShallowState = <U>(selector: (state: StoreState) => U) =>
  store(useShallow(selector))

// Re-export slice types for convenience
export type { FilmDataSlice, VoroforceSlice, UiSlice }

// Export selectors
export * from './selectors'
