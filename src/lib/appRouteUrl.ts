export function appRouteUrl(route: string, base = import.meta.env.BASE_URL): string {
  const path = `/${route.replace(/^\/+/, '')}`
  return base === '/' ? path : `${base}#${path}`
}
