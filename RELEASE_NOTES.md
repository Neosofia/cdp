# Release notes

## CDP UI v0.2.0

Requires **authentication v0.30.0** and **user v0.2.0**.

### Update

- CDP UI build: set `VITE_USER_API_URL` to the public User API URL (with other `VITE_*_API_URL` values).

### Test

1. Log in as WorkOS **`operator`** (role picker → **operator** if you have multiple roles).
2. **Admin → Users** — list loads (empty is OK).
3. Edit an existing user’s platform roles; save succeeds.
