# Match score is derived from goal events, not stored

There is no score field on the Spiel entity. The final score is always computed as the count of Tor records attributed to each team (accounting for Eigentore reversing team attribution). Storing a separate score field would introduce a redundancy that can silently drift out of sync with the underlying event data — a correctness risk in a stats-tracking app where historical accuracy matters. Admins enter goals individually, so the source of truth is always the event log.
