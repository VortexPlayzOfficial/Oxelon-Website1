export default async function handler(req, res) {
    try {
        // ============================================================
        // OXELON DISCORD LOGIN
        // ============================================================

        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        // ============================================================
        // ENVIRONMENT
        // ============================================================

        const clientId = process.env.DISCORD_CLIENT_ID;
        const redirectUri = process.env.DISCORD_REDIRECT_URI;

        if (!clientId) {
            return res.status(500).json({
                error: "DISCORD_CLIENT_ID is not configured."
            });
        }

        if (!redirectUri) {
            return res.status(500).json({
                error: "DISCORD_REDIRECT_URI is not configured."
            });
        }

        // ============================================================
        // DISCORD OAUTH
        //
        // identify = Discord account
        // guilds   = servers the user belongs to
        // ============================================================

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",
            scope: "identify guilds"
        });

        const oauthUrl =
            `https://discord.com/oauth2/authorize?${params.toString()}`;

        // ============================================================
        // REDIRECT
        // ============================================================

        return res.redirect(
            302,
            oauthUrl
        );

    } catch (error) {
        console.error(
            "[Oxelon Discord] OAuth start error:",
            error
        );

        return res.status(500).json({
            error: "Unable to start Discord login."
        });
    }
}
