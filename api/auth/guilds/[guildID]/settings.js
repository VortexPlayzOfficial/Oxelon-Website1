// api/guilds/[guildId]/settings.js

const DEFAULT_SETTINGS = {
    warn: true,
    mute: true,
    kick: true,
    ban: true,
    purge: true,

    lock: true,
    unlock: true,
    slowmode: true,
    roleadd: true,
    nick: true,

    antinuke: true,
    raid_protection: true,
    spam_protection: true,
    automod: true,
    security_logs: true,

    verification: true,
    verification_role: true,

    tickets: true,
    ticket_transcripts: true,

    applications: true,
    application_logs: true,

    welcome: true,
    giveaways: true,
    engagement: true,
    reaction_roles: true,

    owner_protection: true,
    staff_management: true,

    erlc: true,
    erlc_moderation: true,

    bot_name: "Oxelon",
    embed_color: "#5865F2",
    footer_text: "Oxelon",
    timezone: "UTC",

    log_channel: "",
    transcript_channel: ""
};


// ------------------------------------------------------------
// TEMPORARY STORAGE
// ------------------------------------------------------------
//
// This works while the serverless instance is alive.
// It WILL NOT permanently save data on Vercel.
//
// Replace this with MongoDB later.
//

const settingsStore = globalThis.oxelonSettingsStore ||
    (globalThis.oxelonSettingsStore = new Map());


// ------------------------------------------------------------
// ALLOWED SETTINGS
// ------------------------------------------------------------

const BOOLEAN_SETTINGS = [
    "warn",
    "mute",
    "kick",
    "ban",
    "purge",

    "lock",
    "unlock",
    "slowmode",
    "roleadd",
    "nick",

    "antinuke",
    "raid_protection",
    "spam_protection",
    "automod",
    "security_logs",

    "verification",
    "verification_role",

    "tickets",
    "ticket_transcripts",

    "applications",
    "application_logs",

    "welcome",
    "giveaways",
    "engagement",
    "reaction_roles",

    "owner_protection",
    "staff_management",

    "erlc",
    "erlc_moderation"
];


// ------------------------------------------------------------
// VALIDATE SETTINGS
// ------------------------------------------------------------

function validateSettings(body) {

    const clean = {};

    // Boolean settings
    for (const key of BOOLEAN_SETTINGS) {

        if (Object.prototype.hasOwnProperty.call(body, key)) {

            clean[key] = Boolean(body[key]);

        }

    }


    // Bot name
    if (body.bot_name !== undefined) {

        if (
            typeof body.bot_name !== "string" ||
            body.bot_name.length > 32
        ) {
            return {
                error: "Bot name must be 32 characters or fewer."
            };
        }

        clean.bot_name = body.bot_name.trim();

    }


    // Embed colour
    if (body.embed_color !== undefined) {

        if (
            typeof body.embed_color !== "string" ||
            !/^#[0-9A-Fa-f]{6}$/.test(body.embed_color)
        ) {
            return {
                error: "Embed colour must use the format #RRGGBB."
            };
        }

        clean.embed_color =
            body.embed_color.toUpperCase();

    }


    // Footer
    if (body.footer_text !== undefined) {

        if (
            typeof body.footer_text !== "string" ||
            body.footer_text.length > 100
        ) {
            return {
                error: "Footer text must be 100 characters or fewer."
            };
        }

        clean.footer_text =
            body.footer_text.trim();

    }


    // Timezone
    if (body.timezone !== undefined) {

        const allowedTimezones = [
            "UTC",
            "Europe/London",
            "America/New_York",
            "America/Los_Angeles",
            "Europe/Berlin"
        ];

        if (
            typeof body.timezone !== "string" ||
            !allowedTimezones.includes(body.timezone)
        ) {
            return {
                error: "Invalid timezone."
            };
        }

        clean.timezone =
            body.timezone;

    }


    // Log channel
    if (body.log_channel !== undefined) {

        if (
            body.log_channel !== "" &&
            !/^\d{15,25}$/.test(body.log_channel)
        ) {
            return {
                error: "Invalid log channel ID."
            };
        }

        clean.log_channel =
            body.log_channel.trim();

    }


    // Transcript channel
    if (body.transcript_channel !== undefined) {

        if (
            body.transcript_channel !== "" &&
            !/^\d{15,25}$/.test(body.transcript_channel)
        ) {
            return {
                error: "Invalid transcript channel ID."
            };
        }

        clean.transcript_channel =
            body.transcript_channel.trim();

    }


    return {
        settings: clean
    };

}


// ------------------------------------------------------------
// GET /api/guilds/:guildId/settings
// ------------------------------------------------------------

export default async function handler(req, res) {

    const guildId =
        req.query.guildId;


    if (!guildId) {

        return res.status(400).json({
            error: "Missing guild ID."
        });

    }


    // --------------------------------------------------------
    // METHOD CHECK
    // --------------------------------------------------------

    if (
        req.method !== "GET" &&
        req.method !== "PUT"
    ) {

        res.setHeader(
            "Allow",
            "GET, PUT"
        );

        return res.status(405).json({
            error: "Method not allowed."
        });

    }


    // --------------------------------------------------------
    // GET SETTINGS
    // --------------------------------------------------------

    if (req.method === "GET") {

        const saved =
            settingsStore.get(guildId);


        const settings = {
            ...DEFAULT_SETTINGS,
            ...(saved || {})
        };


        return res.status(200).json(
            settings
        );

    }


    // --------------------------------------------------------
    // PUT SETTINGS
    // --------------------------------------------------------

    if (req.method === "PUT") {

        let body = req.body;


        // Vercel normally parses JSON automatically,
        // but this protects against a string body.
        if (typeof body === "string") {

            try {

                body = JSON.parse(body);

            } catch {

                return res.status(400).json({
                    error: "Invalid JSON."
                });

            }

        }


        if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body)
        ) {

            return res.status(400).json({
                error: "Invalid settings object."
            });

        }


        const result =
            validateSettings(body);


        if (result.error) {

            return res.status(400).json({
                error: result.error
            });

        }


        const existing =
            settingsStore.get(guildId) ||
            DEFAULT_SETTINGS;


        const updated = {
            ...DEFAULT_SETTINGS,
            ...existing,
            ...result.settings
        };


        settingsStore.set(
            guildId,
            updated
        );


        return res.status(200).json({
            success: true,
            guild_id: guildId,
            settings: updated
        });

    }

}
