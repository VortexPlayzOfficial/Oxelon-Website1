export default async function handler(req, res) {
    try {
        // =========================================================
        // 1. Get OAuth code
        // =========================================================

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

        // =========================================================
        // 2. Environment variables
        // =========================================================

        const clientId =
            process.env.DISCORD_CLIENT_ID;

        const clientSecret =
            process.env.DISCORD_CLIENT_SECRET;

        const redirectUri =
            process.env.DISCORD_REDIRECT_URI;

        if (
            !clientId ||
            !clientSecret ||
            !redirectUri
        ) {
            return res.status(500).json({
                error: "Discord OAuth is not configured on the server."
            });
        }

        // =========================================================
        // 3. Exchange Discord OAuth code
        // =========================================================

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

        const tokenData =
            await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error(
                "Discord OAuth token error:",
                tokenData
            );

            return res.status(500).json({
                error: "Discord rejected the OAuth callback."
            });
        }

        // =========================================================
        // 4. Get Discord user
        // =========================================================

        const userResponse = await fetch(
            "https://discord.com/api/users/@me",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

        const user =
            await userResponse.json();

        if (!userResponse.ok) {
            console.error(
                "Discord user error:",
                user
            );

            return res.status(500).json({
                error: "Unable to retrieve your Discord account."
            });
        }

        // =========================================================
        // 5. Create session
        // =========================================================

        const expiresIn =
            tokenData.expires_in || 604800;

        const session = {
            user: user,
            access_token:
                tokenData.access_token,
            expires_at:
                Date.now() +
                expiresIn * 1000
        };

        const sessionToken =
            Buffer.from(
                JSON.stringify(session)
            ).toString("base64url");

        // =========================================================
        // 6. Store session in secure cookie
        // =========================================================

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

        // =========================================================
        // 7. Send user to dashboard
        // =========================================================

        return res.redirect(
            302,
            "/dashboard.html"
        );

    } catch (error) {

        console.error(
            "Oxelon OAuth callback error:",
            error
        );

        return res.status(500).json({
            error: "Discord login failed."
        });
    }
}
