import crypto from "crypto";

function encrypt(text, secret) {
    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest();

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
        "aes-256-gcm",
        key,
        iv
    );

    const encrypted = Buffer.concat([
        cipher.update(text, "utf8"),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([
        iv,
        tag,
        encrypted
    ]).toString("base64url");
}

export default async function handler(req, res) {

    const {
        DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET,
        DISCORD_REDIRECT_URI,
        SESSION_SECRET
    } = process.env;


    if (
        !DISCORD_CLIENT_ID ||
        !DISCORD_CLIENT_SECRET ||
        !DISCORD_REDIRECT_URI ||
        !SESSION_SECRET
    ) {
        return res.status(500).json({
            error: "OAuth environment variables are missing."
        });
    }


    const code = req.query.code;


    if (!code) {

        return res.status(400).json({
            error: "Missing Discord OAuth code."
        });

    }


    try {

        /*
         * Exchange the OAuth code for an
         * access token.
         */

        const tokenResponse = await fetch(
            "https://discord.com/api/oauth2/token",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body: new URLSearchParams({
                    client_id:
                        DISCORD_CLIENT_ID,

                    client_secret:
                        DISCORD_CLIENT_SECRET,

                    grant_type:
                        "authorization_code",

                    code,

                    redirect_uri:
                        DISCORD_REDIRECT_URI
                })
            }
        );


        if (!tokenResponse.ok) {

            const error =
                await tokenResponse.text();

            console.error(
                "Discord token error:",
                error
            );

            return res.status(500).json({
                error:
                    "Failed to authenticate with Discord."
            });

        }


        const token =
            await tokenResponse.json();


        /*
         * Store the access token inside an
         * encrypted HttpOnly cookie.
         */

        const session = encrypt(
            JSON.stringify({
                access_token:
                    token.access_token
            }),
            SESSION_SECRET
        );


        res.setHeader(
            "Set-Cookie",
            [
                `oxelon_session=${session}`,
                "Path=/",
                "HttpOnly",
                "Secure",
                "SameSite=Lax",
                "Max-Age=604800"
            ].join("; ")
        );


        /*
         * Send the user back to the dashboard.
         */

        res.writeHead(302, {
            Location:
                "/dashboard.html"
        });

        res.end();

    } catch (error) {

        console.error(
            "OAuth callback error:",
            error
        );

        return res.status(500).json({
            error:
                "Discord authentication failed."
        });

    }
}
