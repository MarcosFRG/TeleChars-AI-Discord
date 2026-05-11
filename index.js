const { ShardClient } = require('detritus-client');

const BOTS = [
    {
        token: 'Tu_token',
        username: 'El_username_de_tu_telecharbot_en_TeleChars_AI'
    }
];

const API_URL_BASE = 'https://api.telecharsai.workers.dev';
const INFO_URL_BASE = 'https://telecharsai.x10.mx/info';

const channelNameCache = new Map();
const guildNameCache = new Map();

async function getChannelName(client, channelId) {
    const key = `${client.userId}:${channelId}`;
    if (channelNameCache.has(key)) return channelNameCache.get(key);
    try {
        const ch = await client.rest.request({ method: 'GET', path: `/channels/${channelId}` });
        const name = ch.name || 'Private';
        channelNameCache.set(key, name);
        return name;
    } catch (e) {
        return null;
    }
}

async function getGuildName(client, guildId) {
    const key = `${client.userId}:${guildId}`;
    if (guildNameCache.has(key)) return guildNameCache.get(key);
    try {
        const guild = await client.rest.request({ method: 'GET', path: `/guilds/${guildId}` });
        guildNameCache.set(key, guild.name);
        return guild.name;
    } catch (e) {
        return null;
    }
}

function buildBasePayload(client, authorId, authorUsername, channelId, guildId, messageId, text) {
    return {
        update_id: Date.now(),
        message: {
            message_id: messageId,
            from: {
                id: authorId,
                is_bot: false,
                first_name: authorUsername
            },
            chat: {
                id: channelId,
                type: guildId ? 'group' : 'private'
            },
            date: Math.floor(Date.now() / 1000),
            text: text,
            bot_uid: client.userId
        },
        token: BOTS.find(b => b.token === client.token).token
    };
}

async function updateCommands(client, username) {
    try {
        const response = await fetch(`${INFO_URL_BASE}/${username}`);
        const data = await response.json();
        const botName = data.name;
        const commands = data.commands.map(cmd => ({
            name: cmd.name,
            description: cmd.desc.replace(/\{ai\}/gi, botName),
            dm_permission: true
        }));
        await client.rest.request({
            method: 'PUT',
            path: `/applications/${client.userId}/commands`,
            body: commands
        });
    } catch (error) {}
}

function createClient(token, username) {
    const client = new ShardClient(token, {
        gateway: { intents: 33280 | 4096 },
        cache: {
            messages: { limit: 0 },
            users: { limit: 0 },
            members: { limit: 0 },
            guilds: { limit: 0 },
            channels: { limit: 0 },
            emojis: { limit: 0 },
            roles: { limit: 0 },
            voiceStates: { limit: 0 }
        }
    });

    client.on('gatewayReady', async () => {
        await updateCommands(client, username);
        setInterval(() => updateCommands(client, username), 24 * 60 * 60 * 1000);
    });

    client.on('interactionCreate', async ({ interaction }) => {
        if (interaction.type === 2) {
            await interaction.respond({ type: 5 });

            const authorId = interaction.member ? interaction.member.id : interaction.user.id;
            const authorUsername = interaction.member ? interaction.member.username : interaction.user.username;

            const payload = buildBasePayload(client, authorId, authorUsername, interaction.channelId, interaction.guildId, interaction.id, '');
            payload.command = {
                command: interaction.data.name.trim(),
                command_id: interaction.id,
                client_id: client.userId
            };
            payload.int_token = interaction.token;

            const [channelName, groupName] = await Promise.all([
                getChannelName(client, interaction.channelId),
                interaction.guildId ? getGuildName(client, interaction.guildId) : null
            ]);
            payload.message.chat.name = channelName;
            if (groupName) payload.message.chat.group_name = groupName;

            await fetch(`${API_URL_BASE}/${username}/discord`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        }
    });

    client.on('messageCreate', async ({ message }) => {
        if (message.author.bot) return;

        const payload = buildBasePayload(client, message.author.id, message.author.username, message.channelId, message.guildId, message.id, message.content);

        const [channelName, groupName] = await Promise.all([
            getChannelName(client, message.channelId),
            message.guildId ? getGuildName(client, message.guildId) : null
        ]);
        payload.message.chat.name = channelName;
        if (groupName) payload.message.chat.group_name = groupName;

        if (message.messageReference) {
            try {
                const refMsg = await client.rest.request({
                    method: 'GET',
                    path: `/channels/${message.messageReference.channelId || message.channelId}/messages/${message.messageReference.messageId}`
                });
                payload.message.reply_to_message = {
                    message_id: refMsg.id,
                    from: {
                        id: refMsg.author.id,
                        is_bot: refMsg.author.bot || false,
                        first_name: refMsg.author.username
                    },
                    chat: {
                        id: refMsg.channel_id,
                        type: message.guildId ? 'group' : 'private'
                    },
                    date: Math.floor(new Date(refMsg.timestamp) / 1000),
                    text: refMsg.content || ''
                };
            } catch (e) {}
        }

        await fetch(`${API_URL_BASE}/${username}/discord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    });

    return client;
}

BOTS.forEach(bot => {
    createClient(bot.token, bot.username).run();
});