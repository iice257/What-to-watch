export const reload = () => window.location.reload()
export const reloadWithoutIntro = () => {
  const cleanPath = window.location.pathname || '/'
  window.history.replaceState(null, '', cleanPath)
  window.location.reload()
}
export const isDefined = (x: unknown) => typeof x !== 'undefined' && x !== null
