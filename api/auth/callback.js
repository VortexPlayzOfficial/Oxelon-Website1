import crypto from "crypto";
export default async function handler(req, res) {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        const redirectUri = process.env.DISCORD_REDIRECT_URI;
        // Check each variable separately so we know exactly what is missing.
        if (!clientId) {
            console.error("Missing DISCORD_CLIENT_ID");
            return res.status(500).json({
                error: "DISCORD_CLIENT_ID is missing from Vercel."
            });
        }
        if (!clientSecret) {
            console.error("Missing DISCORD_CLIENT_SECRET");
            return res.status(500).json({
                error: "DISCORD_CLIENT_SECRET is missing from Vercel."
            });
        }
        if (!redirectUri) {
            console.error("Missing DISCORD_REDIRECT_URI");
            return res.status(500).json({
                error: "DISCORD_REDIRECT_URI is missing from Vercel."
            });
        }
        const code = req.query.code;
        if (!code || typeof code !== "string") {
            return res.status(400).json({
                error: "Missing Discord OAuth code."
            });
        }
        // Exchange the OAuth authorization code for an access token.
        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    grant_type: "authorization_code",
                    code: code,
                    redirect_uri: redirectUri
                })
            }
        );
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            console.error(
                "Discord token exchange failed:",
                tokenData
            );
            return res.status(500).json({
                error: "Discord OAuth token exchange failed."
            });
        }
        if (!tokenData.access_token) {
            console.error(
                "Discord did not return an access token:",
                tokenData
            );
            return res.status(500).json({
                error: "Discord did not return an access token."
            });
        }
        // Get the Discord user.
        const userResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );
        const user = await userResponse.json();
        if (!userResponse.ok) {
            console.error(
                "Discord user request failed:",
                user
            );
            return res.status(500).json({
                error: "Unable to retrieve your Discord account."
            });
        }
        /*
         * Create a random session ID.
         *
         * IMPORTANT:
         * Do not put the Discord access token directly into
         * a client-readable cookie.
         *
         * This is a temporary session implementation for the
         * current dashboard setup.
         */
        const sessionId =
            crypto.randomBytes(32).toString("hex");
        /*
         * Store a minimal session object.
         *
         * For a production application, this should eventually
         * be stored in MongoDB/Redis/etc. rather than memory.
         */
        globalThis.oxelonSessions =
            globalThis.oxelonSessions || {};
        globalThis.oxelonSessions[sessionId] = {
            user: {
                id: user.id,
                username: user.username,
                global_name: user.global_name || null,
                avatar: user.avatar || null
            },
            access_token: tokenData.access_token,
            expires_at:
                Date.now() +
                ((tokenData.expires_in || 604800) * 1000)
        };
        // Secure HTTP-only session cookie.
        res.setHeader(
            "Set-Cookie",
            [
                `oxelon_session=${sessionId}`,
                "Path=/",
                "HttpOnly",
                "Secure",
                "SameSite=Lax",
                `Max-Age=${tokenData.expires_in || 604800}`
            ].join("; ")
        );
        // Send the user back to the dashboard.
        return res.redirect(
            302,
            "/dashboard.html"
        );
    } catch (error) {
        console.error(
            "Discord callback crashed:",
            error
        );
        return res.status(500).json({
            error: "Discord login failed."
        });
    }
}
