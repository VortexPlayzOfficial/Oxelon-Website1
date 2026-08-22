if (!clientId) {
    return res.status(500).json({
        error: "DISCORD_CLIENT_ID is missing from Vercel."
    });
}

if (!clientSecret) {
    return res.status(500).json({
        error: "DISCORD_CLIENT_SECRET is missing from Vercel."
    });
}

if (!redirectUri) {
    return res.status(500).json({
        error: "DISCORD_REDIRECT_URI is missing from Vercel."
    });
}
