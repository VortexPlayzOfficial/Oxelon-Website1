import clientPromise from "../../lib/mongodb.js";

function getCookies(req) {
const cookieHeader =
req.headers.cookie || "";


const cookies = {};

for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();

    if (!trimmed) continue;

    const separator =
        trimmed.indexOf("=");

    if (separator === -1) continue;

    const key =
        trimmed.substring(
            0,
            separator
        );

    const value =
        trimmed.substring(
            separator + 1
        );

    cookies[key] =
        decodeURIComponent(value);
}

return cookies;


}

function decodeBase64Url(value) {
return JSON.parse(
Buffer.from(
value,
"base64url"
).toString("utf8")
);
}

function clearOAuthCookies(res) {
res.setHeader("Set-Cookie", [
"oxelon_roblox_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
"oxelon_roblox_verifier=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
]);
}

export default async function handler(req, res) {
try {
if (req.method !== "GET") {
return res.status(405).send(
"Method not allowed."
);
}


    const {
        code,
        state,
        error,
        error_description
    } = req.query;

    if (error) {
        clearOAuthCookies(res);

        return res.status(400).send(
            `Roblox authorization failed: ${
                error_description || error
            }`
        );
    }

    if (!code || !state) {
        return res.status(400).send(
            "Missing Roblox OAuth code or state."
        );
    }

    const clientId =
        process.env.ROBLOX_CLIENT_ID;

    const clientSecret =
        process.env.ROBLOX_CLIENT_SECRET;

    const redirectUri =
        process.env.ROBLOX_REDIRECT_URI;

    if (
        !clientId ||
        !clientSecret ||
        !redirectUri
    ) {
        return res.status(500).send(
            "Roblox OAuth is not configured."
        );
    }

    const cookies =
        getCookies(req);

    if (
        !cookies.oxelon_roblox_state ||
        !cookies.oxelon_roblox_verifier
    ) {
        return res.status(400).send(
            "Your Roblox OAuth session has expired. Please try again."
        );
    }

    let stateData;

    try {
        stateData =
            decodeBase64Url(
                cookies.oxelon_roblox_state
            );
    } catch {
        return res.status(400).send(
            "Invalid Roblox OAuth state."
        );
    }

    if (
        !stateData?.state ||
        stateData.state !== state ||
        !stateData.discordId
    ) {
        return res.status(400).send(
            "Invalid Roblox OAuth state."
        );
    }

    if (
        Date.now() >
        Number(stateData.expiresAt)
    ) {
        clearOAuthCookies(res);

        return res.status(400).send(
            "Your Roblox linking session expired. Please try again."
        );
    }

    const codeVerifier =
        cookies.oxelon_roblox_verifier;

    const tokenResponse =
        await fetch(
            "https://apis.roblox.com/oauth/v1/token",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },
                body:
                    new URLSearchParams({
                        client_id:
                            clientId,

                        client_secret:
                            clientSecret,

                        grant_type:
                            "authorization_code",

                        code,

                        code_verifier:
                            codeVerifier
                    })
            }
        );

    const tokenText =
        await tokenResponse.text();

    let tokenData;

    try {
        tokenData =
            JSON.parse(tokenText);
    } catch {
        console.error(
            "[Oxelon Roblox] Invalid token response:",
            tokenText
        );

        return res.status(502).send(
            "Roblox returned an invalid token response."
        );
    }

    if (
        !tokenResponse.ok ||
        !tokenData.access_token
    ) {
        console.error(
            "[Oxelon Roblox] Token exchange failed:",
            tokenData
        );

        return res.status(401).send(
            "Roblox rejected the authorization."
        );
    }

    const userResponse =
        await fetch(
            "https://apis.roblox.com/oauth/v1/userinfo",
            {
                headers: {
                    Authorization:
                        `Bearer ${tokenData.access_token}`
                }
            }
        );

    const userText =
        await userResponse.text();

    let robloxUser;

    try {
        robloxUser =
            JSON.parse(userText);
    } catch {
        console.error(
            "[Oxelon Roblox] Invalid userinfo response:",
            userText
        );

        return res.status(502).send(
            "Roblox returned an invalid user response."
        );
    }

    if (
        !userResponse.ok ||
        !robloxUser.sub
    ) {
        console.error(
            "[Oxelon Roblox] Userinfo failed:",
            robloxUser
        );

        return res.status(401).send(
            "Unable to retrieve your Roblox account."
        );
    }

    const discordId =
        String(stateData.discordId);

    const robloxId =
        String(robloxUser.sub);

    const robloxUsername =
        robloxUser.preferred_username ||
        robloxUser.name ||
        null;

    const robloxDisplayName =
        robloxUser.name ||
        robloxUser.nickname ||
        null;

    const client =
        await clientPromise;

    const db =
        client.db(
            process.env.MONGODB_DB ||
            "oxelon"
        );

    const links =
        db.collection(
            "roblox_links"
        );

    const alreadyUsed =
        await links.findOne({
            robloxId,
            discordId: {
                $ne: discordId
            },
            verified: true
        });

    if (alreadyUsed) {
        clearOAuthCookies(res);

        return res.status(409).send(
            "That Roblox account is already linked to another Oxelon account."
        );
    }

    await links.updateOne(
        { discordId },
        {
            $set: {
                discordId,
                robloxId,
                robloxUsername,
                robloxDisplayName,
                robloxProfile:
                    robloxUser.profile ||
                    `https://www.roblox.com/users/${robloxId}/profile`,
                robloxAvatar:
                    robloxUser.picture ||
                    null,
                verified: true,
                verifiedAt: new Date(),
                updatedAt: new Date()
            },

            $unset: {
                verificationCode: "",
                verificationExpiresAt: ""
            }
        },
        {
            upsert: true
        }
    );

    clearOAuthCookies(res);

    return res.redirect(
        302,
        "/linkroblox.html?linked=true"
    );

} catch (error) {
    console.error(
        "[Oxelon Roblox] Callback error:",
        error
    );

    return res.status(500).send(
        "Unable to complete Roblox linking."
    );
}


}
