import type { StateCreator } from 'zustand'
import type { Film, FilmBatch, FilmData } from '../vf'

export interface FilmDataSlice {
  film?: Film
  setFilm: (film?: Film) => void
  filmBatches: Map<number, FilmData[]>
}

export const createFilmDataSlice: StateCreator<
  FilmDataSlice,
  [],
  [],
  FilmDataSlice
> = (set) => ({
  setFilm: (film?: Film) => set({ film }),
  filmBatches: new Map<number, FilmBatch>(),
})
