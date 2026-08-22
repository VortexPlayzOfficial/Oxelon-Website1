export default async function handler(req, res) {
    try {
        // ============================================================
        // OXELON DISCORD OAUTH CALLBACK
        // ============================================================

        const { code, error } = req.query;

        if (error) {
            return res.status(400).json({
                error: `Discord OAuth error: ${error}`
            });
        }

        if (!code) {
            return res.status(400).json({
                error: "Missing Discord OAuth code."
            });
        }

        // ============================================================
        // ENVIRONMENT
        // ============================================================

        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        const redirectUri = process.env.DISCORD_REDIRECT_URI;

        if (!clientId || !clientSecret || !redirectUri) {
            console.error(
                "[Oxelon OAuth] Missing Discord OAuth environment variables."
            );

            return res.status(500).json({
                error: "Discord OAuth is not configured."
            });
        }

        // ============================================================
        // EXCHANGE CODE FOR TOKEN
        // ============================================================

        const tokenResponse = await fetch(
            "https://discord.com/api/v10/oauth2/token",
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
                    code,
                    redirect_uri: redirectUri
                })
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error(
                "[Oxelon OAuth] Token exchange failed:",
                tokenData
            );

            return res.status(401).json({
                error: "Discord rejected the OAuth request."
            });
        }

        // ============================================================
        // GET DISCORD USER
        // ============================================================

        const userResponse = await fetch(
            "https://discord.com/api/v10/users/@me",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

        const user = await userResponse.json();

        if (!userResponse.ok || !user.id) {
            console.error(
                "[Oxelon OAuth] User request failed:",
                user
            );

            return res.status(401).json({
                error: "Unable to retrieve your Discord account."
            });
        }

        // ============================================================
        // GET USER'S GUILDS
        //
        // Requires the OAuth URL to include:
        // identify + guilds
        // ============================================================

        const guildResponse = await fetch(
            "https://discord.com/api/v10/users/@me/guilds",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

        const guilds = await guildResponse.json();

        if (!guildResponse.ok) {
            console.error(
                "[Oxelon OAuth] Guild request failed:",
                guilds
            );

            return res.status(500).json({
                error: "Unable to retrieve your Discord servers."
            });
        }

        // ============================================================
        // ONLY STORE NECESSARY SESSION DATA
        // ============================================================

        const expiresIn =
            Number(tokenData.expires_in) || 604800;

        const session = {
            user: {
                id: user.id,
                username: user.username,
                global_name: user.global_name || null,
                avatar: user.avatar || null,
                discriminator: user.discriminator || "0"
            },

            guilds: Array.isArray(guilds)
                ? guilds.map(guild => ({
                    id: guild.id,
                    name: guild.name,
                    icon: guild.icon || null,
                    owner: Boolean(guild.owner),
                    permissions: guild.permissions || "0"
                }))
                : [],

            access_token: tokenData.access_token,

            expires_at:
                Date.now() +
                expiresIn * 1000
        };

        // ============================================================
        // CREATE SESSION TOKEN
        // ============================================================

        const sessionToken = Buffer
            .from(JSON.stringify(session))
            .toString("base64url");

        // ============================================================
        // SECURE COOKIE
        // ============================================================

        res.setHeader(
            "Set-Cookie",
            [
                `oxelon_session=${sessionToken}`,
                "Path=/",
                "HttpOnly",
                "Secure",
                "SameSite=Lax",
                `Max-Age=${expiresIn}`
            ].join("; ")
        );

        // ============================================================
        // REDIRECT
        // ============================================================

        return res.redirect(
            302,
            "/dashboard.html"
        );

    } catch (error) {
        console.error(
            "[Oxelon OAuth] Callback error:",
            error
        );

        return res.status(500).json({
            error: "Discord login failed."
        });
    }
}
