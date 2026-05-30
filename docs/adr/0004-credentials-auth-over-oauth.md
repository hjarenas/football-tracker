# Username and password authentication instead of OAuth

Admin authentication uses NextAuth.js with the credentials provider (username + password) rather than Google OAuth or another social login. The admin group is small and known; they do not want their access tied to a third-party identity provider. OAuth would introduce a Google (or similar) dependency for a private group tool, and any admin whose Google account is suspended or changed would lose access. Simple credentials keep auth self-contained and under the group's control.

## Consequences

Admin credentials must be managed carefully — there is no "forgot password via Google" fallback. Password reset flow needs to be handled explicitly (out of scope for MVP; initial credentials set by the deploying admin).
