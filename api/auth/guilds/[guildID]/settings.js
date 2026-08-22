import clientPromise from "../../../../../../lib/mongodb.js";

/* ============================================================
   DEFAULT SETTINGS
============================================================ */

const DEFAULT_SETTINGS = {
    warn: true,
    mute: true,
    kick: true,
    ban: true,
    purge: true,

    antinuke: true,
    raid_protection: true,
    spam_protection: true,
    automod: true,
    security_logs: true,

    lock: true,
    unlock: true,
    slowmode: true,
    roleadd: true,

    welcome: true,
    reaction_roles: true,
    tickets: true,
    applications: true,

    erlc: true,
    erlc_moderation: true,

    bot_name: "Oxelon",
    embed_color: "#5865F2",
    footer_text: "Oxelon",
    timezone: "UTC",
    log_channel: "",
    ticket_channel: ""
};


/* ============================================================
   COOKIES
============================================================ */

function parseCookies(cookieHeader = "") {

    const cookies = {};

    cookieHeader
        .split(";")
        .forEach(part => {

            const index =
                part.indexOf("=");

            if (index === -1) {
                return;
            }

            const key =
                part.slice(0, index).trim();

            const value =
                part.slice(index + 1).trim();

            try {
                cookies[key] =
                    decodeURIComponent(value);
            } catch {
                cookies[key] = value;
            }
        });

    return cookies;
}


/* ============================================================
   SESSION
============================================================ */

function getSession(req) {

    const cookies =
        parseCookies(
            req.headers.cookie || ""
        );

    const sessionCookie =
        cookies.oxelon_session;

    if (!sessionCookie) {
        return null;
    }

    try {

        const session =
            JSON.parse(
                Buffer.from(
                    sessionCookie,
                    "base64url"
                ).toString("utf8")
            );

        if (
            !session.access_token ||
            !session.expires_at
        ) {
            return null;
        }

        if (
            Date.now() >=
            Number(session.expires_at)
        ) {
            return null;
        }

        return session;

    } catch {
        return null;
    }
}


/* ============================================================
   DISCORD GUILDS
============================================================ */

async function getDiscordGuilds(accessToken) {

    const response =
        await fetch(
            "https://discord.com/api/users/@me/guilds",
            {
                headers: {
                    Authorization:
                        `Bearer ${accessToken}`
                }
            }
        );

    const data =
        await response.json();

    if (!response.ok) {
        console.error(
            "Discord guild request failed:",
            data
        );

        return null;
    }

    return data;
}


/* ============================================================
   CHECK SERVER ACCESS
============================================================ */

async function canManageGuild(
    session,
    guildId
) {

    const guilds =
        await getDiscordGuilds(
            session.access_token
        );

    if (!guilds) {
        return false;
    }

    const guild =
        guilds.find(
            guild =>
                guild.id === guildId
        );

    if (!guild) {
        return false;
    }

    let permissions = 0n;

    try {
        permissions =
            BigInt(
                guild.permissions || "0"
            );
    } catch {
        permissions = 0n;
    }

    const ADMINISTRATOR = 8n;
    const MANAGE_GUILD = 32n;

    return (
        (permissions & ADMINISTRATOR) !== 0n ||
        (permissions & MANAGE_GUILD) !== 0n
    );
}


/* ============================================================
   CLEAN SETTINGS
============================================================ */

function cleanSettings(input) {

    const settings = {
        ...DEFAULT_SETTINGS
    };

    const booleanKeys = [
        "warn",
        "mute",
        "kick",
        "ban",
        "purge",

        "antinuke",
        "raid_protection",
        "spam_protection",
        "automod",
        "security_logs",

        "lock",
        "unlock",
        "slowmode",
        "roleadd",

        "welcome",
        "reaction_roles",
        "tickets",
        "applications",

        "erlc",
        "erlc_moderation"
    ];

    for (const key of booleanKeys) {

        if (
            typeof input[key] ===
            "boolean"
        ) {
            settings[key] =
                input[key];
        }
    }


    if (
        typeof input.bot_name ===
        "string"
    ) {
        settings.bot_name =
            input.bot_name
                .trim()
                .slice(0, 32);
    }


    if (
        typeof input.embed_color ===
        "string"
    ) {

        const colour =
            input.embed_color
                .trim()
                .toUpperCase();

        if (
            /^#[0-9A-F]{6}$/.test(
                colour
            )
        ) {
            settings.embed_color =
                colour;
        }
    }


    if (
        typeof input.footer_text ===
        "string"
    ) {
        settings.footer_text =
            input.footer_text
                .trim()
                .slice(0, 100);
    }


    const allowedTimezones = [
        "UTC",
        "Europe/London",
        "America/New_York",
        "America/Los_Angeles"
    ];

    if (
        typeof input.timezone ===
        "string" &&
        allowedTimezones.includes(
            input.timezone
        )
    ) {
        settings.timezone =
            input.timezone;
    }


    if (
        typeof input.log_channel ===
        "string"
    ) {
        settings.log_channel =
            input.log_channel
                .trim()
                .slice(0, 30);
    }


    if (
        typeof input.ticket_channel ===
        "string"
    ) {
        settings.ticket_channel =
            input.ticket_channel
                .trim()
                .slice(0, 30);
    }


    return settings;
}


/* ============================================================
   API
============================================================ */

export default async function handler(
    req,
    res
) {

    try {

        /* METHOD */

        if (
            req.method !== "GET" &&
            req.method !== "PUT"
        ) {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }


        /* GUILD ID */

        const guildId =
            String(
                req.query.guildId || ""
            );

        if (
            !/^\d+$/.test(guildId)
        ) {
            return res.status(400).json({
                error:
                    "Invalid Discord server ID."
            });
        }


        /* SESSION */

        const session =
            getSession(req);

        if (!session) {
            return res.status(401).json({
                error:
                    "Not authenticated."
            });
        }


        /* SERVER ACCESS */

        const allowed =
            await canManageGuild(
                session,
                guildId
            );

        if (!allowed) {
            return res.status(403).json({
                error:
                    "You do not have permission to manage this server."
            });
        }


        /* MONGODB */

        const client =
            await clientPromise;

        const db =
            client.db(
                process.env.MONGODB_DB ||
                "oxelon"
            );

        const collection =
            db.collection(
                "guild_settings"
            );


        /* ====================================================
           GET SETTINGS
        ==================================================== */

        if (
            req.method === "GET"
        ) {

            const document =
                await collection.findOne({
                    guild_id: guildId
                });


            const settings = {
                ...DEFAULT_SETTINGS,
                ...(document?.settings || {})
            };


            return res.status(200).json(
                settings
            );
        }


        /* ====================================================
           PUT SETTINGS
        ==================================================== */

        let body =
            req.body;

        if (
            typeof body ===
            "string"
        ) {

            try {
                body =
                    JSON.parse(body);
            } catch {
                return res.status(400).json({
                    error:
                        "Invalid JSON."
                });
            }
        }


        if (
            !body ||
            typeof body !==
            "object"
        ) {
            return res.status(400).json({
                error:
                    "Invalid settings."
            });
        }


        const settings =
            cleanSettings(body);


        await collection.updateOne(
            {
                guild_id: guildId
            },
            {
                $set: {
                    guild_id: guildId,
                    settings: settings,
                    updated_at: new Date()
                }
            },
            {
                upsert: true
            }
        );


        return res.status(200).json({

            success: true,

            guild_id:
                guildId,

            settings:
                settings

        });

    } catch (error) {

        console.error(
            "Oxelon settings API error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to process server settings."
        });
    }
}
