/** Shared route contract. Feature owners link through this module instead of copying paths. */
export const routes = {
  home: "/home",
  events: "/events",
  devices: "/devices",
  newDevice: "/devices/new",
  settings: "/settings",
  household: "/settings/household",
  people: "/settings/people",
  login: "/login",
  signup: "/signup",
  monitor: "/monitor",
  design: "/design",
  dev: "/dev",
  event: (id: string) => `/events/${encodeURIComponent(id)}`,
  alert: (id: string) => `/events/${encodeURIComponent(id)}/alert`,
  device: (id: string) => `/devices/${encodeURIComponent(id)}`,
  invite: (code: string) => `/invite/${encodeURIComponent(code)}`,
} as const;
