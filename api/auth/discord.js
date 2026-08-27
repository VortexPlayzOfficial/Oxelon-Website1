export default function handler(req, res) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return res.status(500).json({
            error: "Discord OAuth environment variables are missing."
        });
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "identify guilds"
    });

    const discordUrl =
        `https://discord.com/oauth2/authorize?${params.toString()}`;

    res.writeHead(302, {
        Location: discordUrl
    });

    res.end();
}
