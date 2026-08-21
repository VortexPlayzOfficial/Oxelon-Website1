import crypto from "crypto";

function createSessionToken() {
    return crypto.randomBytes(32).toString("hex");
}

export default async function handler(req, res) {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        const {
            DISCORD_CLIENT_ID,
            DISCORD_CLIENT_SECRET,
            DISCORD_REDIRECT_URI
        } = process.env;

        if (
            !DISCORD_CLIENT_ID ||
            !DISCORD_CLIENT_SECRET ||
            !DISCORD_REDIRECT_URI
        ) {
            return res.status(500).json({
                error: "Discord OAuth environment variables are missing."
            });
        }

        const code = req.query.code;

        if (!code) {
            return res.status(400).json({
                error: "Missing Discord OAuth code."
            });
        }

        // Exchange OAuth code for Discord access token
        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    client_id: DISCORD_CLIENT_ID,
                    client_secret: DISCORD_CLIENT_SECRET,
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: DISCORD_REDIRECT_URI
                })
            }
        );

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error(
                "Discord token error:",
                tokenData
            );

            return res.status(500).json({
                error: "Discord OAuth token exchange failed."
            });
        }

        // Get the logged-in Discord user
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
                "Discord user error:",
                user
            );

            return res.status(500).json({
                error: "Unable to retrieve Discord user."
            });
        }

        /*
         * Temporary session cookie.
         *
         * This allows the dashboard to know who logged in.
         */
        const session = {
            user,
            access_token: tokenData.access_token,
            expires_at:
                Date.now() +
                ((tokenData.expires_in || 604800) * 1000)
        };

        const encodedSession =
            Buffer.from(
                JSON.stringify(session)
            ).toString("base64url");

        res.setHeader(
            "Set-Cookie",
            `oxelon_session=${encodedSession}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${tokenData.expires_in || 604800}`
        );

        // Send the user back to dashboard
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
