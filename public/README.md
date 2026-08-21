# Oxelon Server Selector

A mobile-friendly server selection/loading screen based on the supplied reference.

## Files

- `index.html` — page structure
- `styles.css` — responsive Oxelon styling
- `app.js` — loading animation and server loading logic

## Production integration

In `app.js`, replace the demo `fetchServers()` function with your authenticated Oxelon backend endpoint.

Recommended flow:

1. User signs in with Discord OAuth2.
2. Backend obtains the user's Discord identity.
3. Backend retrieves the guilds the user can manage.
4. Backend filters to servers where Oxelon is installed / manageable.
5. `/api/discord/servers` returns the server list.
6. The page renders the real servers.
7. Clicking a server opens `/dashboard.html?server=SERVER_ID`.

Do not put a Discord bot token or client secret in frontend JavaScript.
