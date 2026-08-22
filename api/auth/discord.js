export default function handler(req, res) {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        const clientId =
            process.env.DISCORD_CLIENT_ID;

        const redirectUri =
            process.env.DISCORD_REDIRECT_URI;

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

        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: "code",

            // identify = account information
            // guilds = user's Discord servers
            scope: "identify guilds"
        });

        const discordOAuthUrl =
            `https://discord.com/oauth2/authorize?${params.toString()}`;

        return res.redirect(
            302,
            discordOAuthUrl
        );

    } catch (error) {

        console.error(
            "Oxelon Discord OAuth error:",
            error
        );

        return res.status(500).json({
            error: "Unable to start Discord login."
        });
    }
}
