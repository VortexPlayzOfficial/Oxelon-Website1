import clientPromise from "../../lib/mongodb.js";

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

const sessionCookie = cookies.oxelon_session;

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
} catch (error) {
    console.error(
        "[Oxelon Roblox] Invalid session cookie:",
        error
    );

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


    const session = getSession(req);

    if (!session || !session.user || !session.user.id) {
        return res.status(401).json({
            success: false,
            error: "You must be logged into Discord first."
        });
    }

    const discordId = String(session.user.id);

    console.log(
        "[Oxelon Roblox] Checking status for Discord:",
        discordId
    );

    if (!process.env.MONGODB_URI) {
        console.error(
            "[Oxelon Roblox] MONGODB_URI is missing."
        );

        return res.status(500).json({
            success: false,
            error: "MongoDB is not configured on the server."
        });
    }

    const client = await clientPromise;

    const db = client.db(
        process.env.MONGODB_DB || "oxelon"
    );

    const collection =
        db.collection("roblox_links");

    const existing =
        await collection.findOne({
            discordId
        });

    if (!existing) {
        return res.status(200).json({
            success: true,
            linked: false,
            robloxId: null,
            robloxUsername: null
        });
    }

    if (
        existing.verified === true &&
        existing.robloxId
    ) {
        return res.status(200).json({
            success: true,
            linked: true,
            robloxId:
                String(existing.robloxId),
            robloxUsername:
                existing.robloxUsername || null
        });
    }

    return res.status(200).json({
        success: true,
        linked: false,
        robloxId: null,
        robloxUsername: null
    });

} catch (error) {
    console.error(
        "[Oxelon Roblox] STATUS FUNCTION ERROR"
    );

    console.error(error);

    return res.status(500).json({
        success: false,
        error:
            error?.message ||
            "Unable to check Roblox link status."
    });
}


}
