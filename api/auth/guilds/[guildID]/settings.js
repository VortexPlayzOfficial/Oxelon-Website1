import fs from "fs";
import path from "path";

const CONFIG_FILE = path.join(
    process.cwd(),
    "guild_configs.json"
);

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
   JSON HELPERS
============================================================ */

function loadConfigs() {

    try {

        if (!fs.existsSync(CONFIG_FILE)) {
            return {};
        }

        const data =
            fs.readFileSync(
                CONFIG_FILE,
                "utf8"
            );

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "Failed to load guild configs:",
            error
        );

        return {};
    }
}


function saveConfigs(configs) {

    try {

        fs.writeFileSync(
            CONFIG_FILE,
            JSON.stringify(
                configs,
                null,
                4
            )
        );

        return true;

    } catch (error) {

        console.error(
            "Failed to save guild configs:",
            error
        );

        return false;
    }
}


/* ============================================================
   COOKIES
============================================================ */

function parseCookies(
    cookieHeader = ""
) {

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
                part
                    .slice(0, index)
                    .trim();

            const value =
                part
                    .slice(index + 1)
                    .trim();

            try {

                cookies[key] =
                    decodeURIComponent(value);

            } catch {

                cookies[key] =
                    value;
            }

        });

    return cookies;
}


/* ============================================================
   GET SESSION
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
   GET DISCORD USER GUILDS
============================================================ */

async function getDiscordGuilds(
    accessToken
) {

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
            item =>
                item.id === guildId
        );

    if (!guild) {
        return false;
    }

    /*
     * Discord permission bits:
     *
     * ADMINISTRATOR = 8
     * MANAGE_GUILD  = 32
     */

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
   VALIDATE SETTINGS
============================================================ */

function cleanSettings(input) {

    const settings = {
        ...DEFAULT_SETTINGS
    };


    /* Boolean settings */

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


    for (
        const key of booleanKeys
    ) {

        if (
            typeof input[key] ===
            "boolean"
        ) {

            settings[key] =
                input[key];

        }
    }


    /* Bot name */

    if (
        typeof input.bot_name ===
        "string"
    ) {

        settings.bot_name =
            input.bot_name
                .trim()
                .slice(0, 32);

    }


    /* Embed colour */

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


    /* Footer */

    if (
        typeof input.footer_text ===
        "string"
    ) {

        settings.footer_text =
            input.footer_text
                .trim()
                .slice(0, 100);

    }


    /* Timezone */

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


    /* Channel IDs */

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
   API HANDLER
============================================================ */

export default async function handler(
    req,
    res
) {

    try {

        /* ----------------------------------------------------
           METHOD
        ---------------------------------------------------- */

        if (
            req.method !== "GET" &&
            req.method !== "PUT"
        ) {

            return res.status(405).json({
                error:
                    "Method not allowed"
            });
        }


        /* ----------------------------------------------------
           GUILD ID
        ---------------------------------------------------- */

        const {
            guildId
        } = req.query;


        if (
            !guildId ||
            !/^\d+$/.test(
                String(guildId)
            )
        ) {

            return res.status(400).json({
                error:
                    "Invalid Discord server ID."
            });
        }


        /* ----------------------------------------------------
           SESSION
        ---------------------------------------------------- */

        const session =
            getSession(req);


        if (!session) {

            return res.status(401).json({
                error:
                    "Not authenticated."
            });
        }


        /* ----------------------------------------------------
           SERVER PERMISSION
        ---------------------------------------------------- */

        const allowed =
            await canManageGuild(
                session,
                String(guildId)
            );


        if (!allowed) {

            return res.status(403).json({
                error:
                    "You do not have permission to manage this server."
            });
        }


        /* ----------------------------------------------------
           LOAD CONFIG
        ---------------------------------------------------- */

        const configs =
            loadConfigs();

        const existing =
            configs[String(guildId)] || {};


        /* ----------------------------------------------------
           GET
        ---------------------------------------------------- */

        if (
            req.method === "GET"
        ) {

            return res.status(200).json({

                ...DEFAULT_SETTINGS,
                ...existing

            });
        }


        /* ----------------------------------------------------
           PUT
        ---------------------------------------------------- */

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


        const cleaned =
            cleanSettings(
                body
            );


        /*
         * Keep the server's configuration
         * completely separate from every
         * other Discord server.
         */

        configs[String(guildId)] = {
            ...cleaned
        };


        const saved =
            saveConfigs(
                configs
            );


        if (!saved) {

            return res.status(500).json({
                error:
                    "Failed to save server settings."
            });
        }


        /* ----------------------------------------------------
           RESPONSE
        ---------------------------------------------------- */

        return res.status(200).json({

            success: true,

            guild_id:
                String(guildId),

            settings:
                cleaned

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
