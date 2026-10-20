export interface IptvProfileSummary {
  id: string
  name: string
  serverUrl: string
  username: string
  createdAt: string
  isActive: boolean
}

export interface CreateIptvProfileInput {
  name: string
  serverUrl: string
  username: string
  password: string
}

export interface XtreamAccountInfo {
  status: string
  isTrial: boolean
  expiresAt: string | null
  activeConnections: number | null
  maxConnections: number | null
}

export type XtreamConnectionTestResult =
  | { ok: true, message: string, account: XtreamAccountInfo }
  | { ok: false, message: string }

export interface UpdateIptvProfileInput {
  name: string
  serverUrl: string
  username: string
  /** Omitted or empty keeps the stored password. */
  password?: string
}
