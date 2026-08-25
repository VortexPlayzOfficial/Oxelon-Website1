import clientPromise from "../../lib/mongodb.js";

function getSession(req) {
const cookieHeader = req.headers.cookie || "";
const cookies = {};

```
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
```

}

export default async function handler(req, res) {
try {
if (req.method !== "GET") {
return res.status(405).json({
error: "Method not allowed"
});
}

```
    const session = getSession(req);

    if (!session?.user?.id) {
        return res.status(401).json({
            error: "You must be logged into Discord first."
        });
    }

    const discordId = String(session.user.id);

    const client = await clientPromise;

    const db = client.db(
        process.env.MONGODB_DB || "oxelon"
    );

    const links = db.collection("roblox_links");

    const existing = await links.findOne({
        discordId
    });

    if (!existing) {
        return res.status(200).json({
            success: true,
            linked: false
        });
    }

    if (
        existing.verified === true &&
        existing.robloxId
    ) {
        return res.status(200).json({
            success: true,
            linked: true,
            robloxId: String(existing.robloxId),
            robloxUsername:
                existing.robloxUsername || null
        });
    }

    return res.status(200).json({
        success: true,
        linked: false
    });

} catch (error) {
    console.error(
        "[Oxelon Roblox] Status error:",
        error
    );

    return res.status(500).json({
        error: "Unable to check your Roblox link status."
    });
}
```

}
