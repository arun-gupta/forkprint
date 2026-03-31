/**
 * Contract: Component Props
 * P1-F02 — GitHub PAT Authentication
 *
 * Defines the prop interfaces for new and modified components.
 */

/** Props for the TokenInput display component */
export interface TokenInputProps {
  /** Initial value read from localStorage (may be empty string) */
  initialValue: string
  /** Called when the user changes the token field value */
  onChange: (value: string) => void
}

/** Updated props for RepoInputClient — now accepts server token flag */
export interface RepoInputClientProps {
  /**
   * True when the server has GITHUB_TOKEN configured.
   * When true, the token input is hidden and no client token is required.
   */
  hasServerToken: boolean
}

/** Updated onSubmit signature — token added for P1-F04 consumption */
export type OnSubmitHandler = (repos: string[], token: string | null) => void
