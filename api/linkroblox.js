```javascript
import crypto from "crypto";
import clientPromise from "../lib/mongodb.js";

const ROBLOX_AUTHORIZE_URL =
    "https://apis.roblox.com/oauth/v1/authorize";

const ROBLOX_TOKEN_URL =
    "https://apis.roblox.com/oauth/v1/token";

const ROBLOX_USERINFO_URL =
    "https://apis.roblox.com/oauth/v1/userinfo";

const CLIENT_ID = process.env.ROBLOX_CLIENT_ID;

const REDIRECT_URI =
    process.env.ROBLOX_REDIRECT_URI ||
    "https://oxelonbot.vercel.app/linkroblox";

const CLIENT_SECRET =
    process.env.ROBLOX_CLIENT_SECRET;

function getSession(req) {
    const cookieHeader = req.headers.cookie || "";

    const cookies = {};

    for (const part of cookieHeader.split(";")) {
        const [key, ...value] = part.trim().split("=");

        if (key && value.length) {
            cookies[key] = decodeURIComponent(value.join("="));
        }
    }

    if (!cookies.oxelon_session) {
        return null;
    }

    try {
        return JSON.parse(
            Buffer.from(
                cookies.oxelon_session,
                "base64url"
            ).toString("utf8")
        );
    } catch {
        return null;
    }
}

function createState(discordId) {
    const timestamp = Date.now();

    const payload = `${discordId}:${timestamp}`;

    const secret =
        process.env.ROBLOX_OAUTH_STATE_SECRET ||
        process.env.DISCORD_CLIENT_SECRET;

    if (!secret) {
        throw new Error(
            "ROBLOX_OAUTH_STATE_SECRET is not configured."
        );
    }

    const signature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("base64url");

    return Buffer.from(
        JSON.stringify({
            discordId,
            timestamp,
            signature
        })
    ).toString("base64url");
}

function verifyState(state) {
    try {
        const decoded = JSON.parse(
            Buffer.from(state, "base64url").toString("utf8")
        );

        if (
            !decoded.discordId ||
            !decoded.timestamp ||
            !decoded.signature
        ) {
            return null;
        }

        // State expires after 10 minutes.
        if (
            Date.now() - Number(decoded.timestamp) >
            10 * 60 * 1000
        ) {
            return null;
        }

        const payload =
            `${decoded.discordId}:${decoded.timestamp}`;

        const secret =
            process.env.ROBLOX_OAUTH_STATE_SECRET ||
            process.env.DISCORD_CLIENT_SECRET;

        if (!secret) {
            return null;
        }

        const expected = crypto
            .createHmac("sha256", secret)
            .update(payload)
            .digest("base64url");

        if (
            !crypto.timingSafeEqual(
                Buffer.from(decoded.signature),
                Buffer.from(expected)
            )
        ) {
            return null;
        }

        return decoded;
    } catch {
        return null;
    }
}

export default async function handler(req, res) {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        if (!CLIENT_ID || !CLIENT_SECRET) {
            console.error(
                "[Oxelon Roblox OAuth] Missing environment variables."
            );

            return res.status(500).json({
                error: "Roblox OAuth is not configured."
            });
        }

        const { code, state, error } = req.query;

        // ============================================================
        // START OAUTH
        // ============================================================

        if (!code && !state && !error) {
            const session = getSession(req);

            if (!session?.user?.id) {
                return res.status(401).send(`
                    <html>
                        <head>
                            <title>Oxelon - Login Required</title>
                        </head>
                        <body>
                            <h1>Discord Login Required</h1>
                            <p>
                                Please log into your Oxelon account
                                before linking Roblox.
                            </p>
                        </body>
                    </html>
                `);
            }

            const oauthState =
                createState(session.user.id);

            const params = new URLSearchParams({
                client_id: CLIENT_ID,
                redirect_uri: REDIRECT_URI,
                scope: "openid profile",
                response_type: "code",
                state: oauthState
            });

            return res.redirect(
                302,
                `${ROBLOX_AUTHORIZE_URL}?${params.toString()}`
            );
        }

        // ============================================================
        // ROBLOX RETURNED AN ERROR
        // ============================================================

        if (error) {
            return res.status(400).send(`
                <html>
                    <head>
                        <title>Oxelon - Roblox Linking</title>
                    </head>
                    <body>
                        <h1>Roblox Linking Cancelled</h1>
                        <p>
                            Roblox did not authorize the connection.
                        </p>
                    </body>
                </html>
            `);
        }

        if (!code || !state) {
            return res.status(400).json({
                error: "Missing Roblox OAuth code or state."
            });
        }

        // ============================================================
        // VERIFY STATE
        // ============================================================

        const stateData = verifyState(state);

        if (!stateData) {
            return res.status(400).json({
                error:
                    "Invalid or expired Roblox OAuth state."
            });
        }

        const discordId = stateData.discordId;

        // ============================================================
        // EXCHANGE ROBLOX CODE
        // ============================================================

        const tokenResponse = await fetch(
            ROBLOX_TOKEN_URL,
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    grant_type: "authorization_code",
                    code
                })
            }
        );

        const tokenData =
            await tokenResponse.json();

        if (
            !tokenResponse.ok ||
            !tokenData.access_token
        ) {
            console.error(
                "[Oxelon Roblox OAuth] Token exchange failed:",
                tokenData
            );

            return res.status(401).json({
                error:
                    "Roblox rejected the authorization."
            });
        }

        // ============================================================
        // GET ROBLOX USER
        // ============================================================

        const userResponse = await fetch(
            ROBLOX_USERINFO_URL,
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

        const robloxUser =
            await userResponse.json();

        if (
            !userResponse.ok ||
            !robloxUser.sub
        ) {
            console.error(
                "[Oxelon Roblox OAuth] Userinfo failed:",
                robloxUser
            );

            return res.status(401).json({
                error:
                    "Unable to retrieve your Roblox account."
            });
        }

        const robloxId =
            String(robloxUser.sub);

        // ============================================================
        // SAVE LINK
        // ============================================================

        const client =
            await clientPromise;

        const db =
            client.db(
                process.env.MONGODB_DB ||
                "oxelon"
            );

        const links =
            db.collection("roblox_links");

        // Prevent the same Roblox account
        // from being linked to multiple Discord accounts.
        const existing =
            await links.findOne({
                robloxId
            });

        if (
            existing &&
            existing.discordId !== discordId
        ) {
            return res.status(409).send(`
                <html>
                    <head>
                        <title>Oxelon - Roblox Already Linked</title>
                    </head>
                    <body>
                        <h1>Roblox Account Already Linked</h1>
                        <p>
                            This Roblox account is already linked
                            to another Discord account.
                        </p>
                    </body>
                </html>
            `);
        }

        await links.updateOne(
            {
                discordId
            },
            {
                $set: {
                    discordId,
                    robloxId,
                    robloxUsername:
                        robloxUser.preferred_username ||
                        null,
                    robloxDisplayName:
                        robloxUser.name ||
                        null,
                    robloxProfile:
                        robloxUser.profile ||
                        null,
                    linkedAt:
                        new Date()
                }
            },
            {
                upsert: true
            }
        );

        // ============================================================
        // SUCCESS
        // ============================================================

        return res.status(200).send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Oxelon - Roblox Linked</title>
                    <meta
                        name="viewport"
                        content="width=device-width, initial-scale=1"
                    >
                </head>

                <body>
                    <h1>✅ Roblox Account Linked</h1>

                    <p>
                        Your Roblox account has successfully
                        been linked to your Discord account.
                    </p>

                    <p>
                        Roblox:
                        <strong>
                            ${escapeHtml(
                                robloxUser.preferred_username ||
                                robloxUser.name ||
                                robloxId
                            )}
                        </strong>
                    </p>

                    <p>
                        You can now return to Discord.
                    </p>
                </body>
            </html>
        `);

    } catch (error) {
        console.error(
            "[Oxelon Roblox OAuth] Callback error:",
            error
        );

        return res.status(500).json({
            error:
                "Roblox linking failed."
        });
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
```
