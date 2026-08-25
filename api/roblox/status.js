import clientPromise from "../../lib/mongodb.js";

function getSession(req) {
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

const sessionCookie =
    cookies.oxelon_session;

if (!sessionCookie) {
    return null;
}

try {
    return JSON.parse(
        Buffer.from(
            sessionCookie,
            "base64url"
        ).toString("utf8")
    );
} catch {
    return null;
}


}

export default async function handler(req, res) {
try {
if (req.method !== "GET") {
return res.status(405).json({
success: false,
error: "Method not allowed."
});
}


    const session =
        getSession(req);

    if (!session?.user?.id) {
        return res.status(401).json({
            success: false,
            error:
                "You must be logged into Discord first."
        });
    }

    const discordId =
        String(session.user.id);

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

    const existing =
        await links.findOne({
            discordId,
            verified: true
        });

    if (!existing?.robloxId) {
        return res.status(200).json({
            success: true,
            linked: false,
            robloxId: null,
            robloxUsername: null,
            robloxDisplayName: null
        });
    }

    return res.status(200).json({
        success: true,
        linked: true,
        robloxId:
            String(existing.robloxId),
        robloxUsername:
            existing.robloxUsername ||
            null,
        robloxDisplayName:
            existing.robloxDisplayName ||
            null,
        robloxProfile:
            existing.robloxProfile ||
            null,
        robloxAvatar:
            existing.robloxAvatar ||
            null
    });

} catch (error) {
    console.error(
        "[Oxelon Roblox] Status error:",
        error
    );

    return res.status(500).json({
        success: false,
        error:
            error?.message ||
            "Unable to check Roblox link status."
    });
}


}
