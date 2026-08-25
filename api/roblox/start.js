const crypto = require("crypto");

function getSession(req) {
const cookieHeader = req.headers.cookie || "";
const cookies = {};


for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const separator = trimmed.indexOf("=");

    if (separator === -1) continue;

    const key = trimmed.substring(0, separator);
    const value = trimmed.substring(separator + 1);

    cookies[key] = decodeURIComponent(value);
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

function base64Url(buffer) {
return buffer
.toString("base64")
.replace(/+/g, "-")
.replace(///g, "_")
.replace(/=/g, "");
}

function createCodeVerifier() {
return base64Url(
crypto.randomBytes(48)
);
}

function createCodeChallenge(verifier) {
return base64Url(
crypto
.createHash("sha256")
.update(verifier)
.digest()
);
}

export default async function handler(req, res) {
try {
if (req.method !== "GET") {
return res.status(405).json({
success: false,
error: "Method not allowed."
});
}


    const session = getSession(req);

    if (!session?.user?.id) {
        return res.status(401).json({
            success: false,
            error: "You must be logged into Discord first."
        });
    }

    const clientId =
        process.env.ROBLOX_CLIENT_ID;

    const redirectUri =
        process.env.ROBLOX_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return res.status(500).json({
            success: false,
            error:
                "Roblox OAuth is not configured."
        });
    }

    const state = base64Url(
        crypto.randomBytes(32)
    );

    const codeVerifier =
        createCodeVerifier();

    const codeChallenge =
        createCodeChallenge(
            codeVerifier
        );

    const stateData = {
        state,
        discordId: String(session.user.id),
        expiresAt:
            Date.now() + 10 * 60 * 1000
    };

    const encodedState = base64Url(
        Buffer.from(
            JSON.stringify(stateData)
        )
    );

    const cookieParts = [
        `oxelon_roblox_state=${encodedState}`,
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Max-Age=600"
    ];

    const verifierCookie = [
        `oxelon_roblox_verifier=${codeVerifier}`,
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Max-Age=600"
    ];

    res.setHeader("Set-Cookie", [
        cookieParts.join("; "),
        verifierCookie.join("; ")
    ]);

    const params =
        new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: "openid profile",
            response_type: "code",
            state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256"
        });

    const authorizationUrl =
        `https://apis.roblox.com/oauth/v1/authorize?${params.toString()}`;

    return res.redirect(
        302,
        authorizationUrl
    );

} catch (error) {
    console.error(
        "[Oxelon Roblox] Start error:",
        error
    );

    return res.status(500).json({
        success: false,
        error:
            "Unable to start Roblox linking."
    });
}


}
