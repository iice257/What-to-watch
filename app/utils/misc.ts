export const reload = () => window.location.reload()
export const reloadWithoutIntro = () => {
  const url = new URL(window.location.href)
  url.searchParams.set('shuffle', Date.now().toString())
  window.location.replace(url)
}
export const isDefined = (x: unknown) => typeof x !== 'undefined' && x !== null
