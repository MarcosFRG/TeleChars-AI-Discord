const { ShardClient } = require('detritus-client');
require('dotenv').config();
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const sharp = require('sharp');
const botsConfig = require('./bots.json');

const BOTS = botsConfig.map(bot => ({
  token: bot.token.startsWith('$') ? process.env[bot.token.slice(1)] : bot.token,
  username: bot.username,
  presence: bot.presence || null
})).filter(b => b.token);

const API_URL = 'http://92.119.165.177:6213';
const API_URL_BASE = `${API_URL}/api`;
const INFO_URL_BASE = `${API_URL}/info`;

class TTLCache {
  constructor(maxSize, ttlMs) {
    this.map = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }
  _expired(e) { return Date.now() - e.t > this.ttlMs; }
  has(k) {
    const e = this.map.get(k);
    if (!e) return false;
    if (this._expired(e)) { this.map.delete(k); return false; }
    return true;
  }
  get(k) {
    if (!this.has(k)) return undefined;
    const e = this.map.get(k);
    this.map.delete(k); this.map.set(k, e);
    return e.v;
  }
  set(k, v) {
    if (this.map.has(k)) this.map.delete(k);
    this.map.set(k, { v, t: Date.now() });
    while (this.map.size > this.maxSize) this.map.delete(this.map.keys().next().value);
  }
}

const channelNameCache = new TTLCache(5e3, 24 * 36e5);
const guildNameCache   = new TTLCache(2e3, 24 * 36e5);
const globalNameCache  = new TTLCache(8e3, 6 * 36e5);

const inFlight = new Map();

function dedup(key, fn) {
  if (inFlight.has(key)) return inFlight.get(key);
  const p = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}

let requestQueue = [];
let isProcessing = false;

function enqueueRequest(fn) {
  return new Promise((resolve, reject) => {
    requestQueue.push({ fn, resolve, reject });
    processQueue();
  });
}

function processQueue() {
  if (isProcessing) return;
  if (requestQueue.length === 0) return;
  isProcessing = true;
  const { fn, resolve, reject } = requestQueue.shift();
  fn().then(resolve).catch(reject).finally(() => {
    isProcessing = false;
    processQueue();
  });
}

async function getChannelName(client, channelId) {
  if (channelNameCache.has(channelId)) return channelNameCache.get(channelId);
  return dedup(`ch:${channelId}`, async () => {
    try {
      const ch = await client.rest.request({ method: 'GET', path: `/channels/${channelId}` });
      const name = ch.name || 'Private';
      channelNameCache.set(channelId, name);
      return name;
    } catch {
      return null;
    }
  });
}

async function getGuildName(client, guildId) {
  if (guildNameCache.has(guildId)) return guildNameCache.get(guildId);
  return dedup(`gu:${guildId}`, async () => {
    try {
      const guild = await client.rest.request({ method: 'GET', path: `/guilds/${guildId}` });
      guildNameCache.set(guildId, guild.name);
      return guild.name;
    } catch {
      return null;
    }
  });
}

async function getUserGlobalName(client, userId) {
  if (globalNameCache.has(userId)) return globalNameCache.get(userId);
  return dedup(`us:${userId}`, async () => {
    try {
      const user = await client.rest.request({ method: 'GET', path: `/users/${userId}` });
      const name = user.global_name || user.username;
      globalNameCache.set(userId, name);
      return name;
    } catch {
      return null;
    }
  });
}

async function getDeferredMessageId(applicationId, interactionToken) {
  const delays = [100, 200, 400, 800, 1600];
  for (const delay of delays) {
    try {
      const r = await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`);
      if (r.ok) {
        const msg = await r.json();
        if (msg && msg.id) return msg.id;
      }
    } catch {}
    await new Promise(res => setTimeout(res, delay));
  }
  return 0;
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, { headers: { 'User-Agent': 'TeleCharBots/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return downloadFile(res.headers.location).then(resolve).catch(reject);
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(3e4, () => req.destroy(new Error('download timeout')));
  });
}

function getFileUniqueId(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').substring(0, 12);
}

function isGifAttachment(filename, contentType) {
  const mime = String(contentType || '').toLowerCase();
  if (mime == 'image/gif') return true;
  return /\.gif$/i.test(String(filename || ''));
}

function isImageAttachment(filename, contentType) {
  const mime = String(contentType || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  return /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(String(filename || ''));
}

function getImageMimeType(filename, contentType) {
  const mime = String(contentType || '').toLowerCase();
  if (mime.startsWith('image/')) return mime;

  const ext = (String(filename || '').split('.').pop() || '').toLowerCase();

  if (ext == 'png') return 'image/png';
  if (ext == 'gif') return 'image/gif';
  if (ext == 'webp') return 'image/webp';
  if (ext == 'bmp') return 'image/bmp';
  if (ext == 'avif') return 'image/avif';
  if (ext == 'jpg' || ext == 'jpeg') return 'image/jpeg';

  return contentType || 'application/octet-stream';
}

async function buildAttachmentPayload(attachment) {
  if (!attachment || !attachment.url) return null;

  const url = attachment.url;
  const filename = attachment.filename || attachment.fileName || 'file';
  const rawContentType = attachment.contentType || attachment.content_type || 'application/octet-stream';
  const size = attachment.size || attachment.fileSize || 0;

  const contentType = isImageAttachment(filename, rawContentType) ? getImageMimeType(filename, rawContentType) : rawContentType;

  try {
    const fileBuffer = await downloadFile(url);
    const file_unique_id = getFileUniqueId(fileBuffer);

    const document = {file_id: url, file_unique_id, file_name: filename, mime_type: contentType, file_size: size};

    if (isGifAttachment(filename, contentType)) {
      try {
        document.thumb = (await sharp(fileBuffer, { pages: 1 }).png().toBuffer()).toString('base64');
        document.thumb_mime = 'image/png';
      } catch {}
    }

    return document;
  } catch {
    return null;
  }
}

function buildBasePayload(client, authorId, authorName, authorUsername, channelId, guildId, messageId, text) {
  const payload = {
    update_id: Date.now(),
    message: {
      message_id: messageId,
      from: { id: authorId, is_bot: false, first_name: authorName, username: authorUsername },
      chat: { id: channelId, type: guildId ? 'group' : 'private' },
      date: parseInt(Date.now() / 1e3),
      bot_uid: client.userId
    },
    token: client.token
  };

  if (text !== undefined) payload.message.text = text;

  return payload;
}

function convertFieldsToOptions(fields) {
  if (!fields) return [];

  return fields.map(f => {
    const option = {
      name: f.name,
      description: f.name,
      required: f.required || false
    };

    if (f.options && f.options.length > 0) {
      option.type = 3;
      option.choices = f.options.map(o => ({ name: o, value: o }));
    } else {
      option.type = 3;
    }

    return option;
  });
}

function extractArguments(options) {
  const args = {};

  if (!options) return args;

  if (typeof options.toArray == 'function') options = options.toArray();

  if (Array.isArray(options)) {
    for (const opt of options) {
      if (opt.type !== 11 && opt.value !== undefined && opt.value !== null) args[opt.name] = opt.value;
    }
  }

  return args;
}

async function updateCommands(client, username) {
  try {
    const response = await enqueueRequest(() => fetch(`${INFO_URL_BASE}/${username}`));
    const data = await response.json();

    const botName = data.name;

    const commands = data.commands.map(cmd => {
      const command = {name: cmd.name, description: cmd.desc.replace(/{ai}/gi, botName), type: 1, contexts: [0, 1, 2], integration_types: [0, 1]};

      const fields = convertFieldsToOptions(cmd.fields);

      if (fields.length > 0) command.options = fields;

      return command;
    });

    await client.rest.request({method: 'PUT', path: `/applications/${client.userId}/commands`, body: commands});
  } catch {}
}

function createClient(token, username, presence) {
  const client = new ShardClient(token, {
    gateway: { intents: 33280 | 4096 },
    cache: { messages: { limit: 0 }, users: { limit: 0 }, members: { limit: 0 }, guilds: { limit: 0 }, channels: { limit: 0 }, emojis: { limit: 0 }, roles: { limit: 0 }, voiceStates: { limit: 0 } }
  });

  let commandsInterval = null;

  client.on('gatewayReady', async () => {
    if (presence) {
      try {
        const presencePayload = {};
        if (presence.status) presencePayload.status = presence.status;
        if (presence.activities && Array.isArray(presence.activities)) presencePayload.activities = presence.activities;
        await client.gateway.setPresence(presencePayload);
      } catch {}
    }

    await updateCommands(client, username);

    if (commandsInterval) clearInterval(commandsInterval);
    commandsInterval = setInterval(() => updateCommands(client, username), 86400);
  });

  client.on('interactionCreate', async ({ interaction }) => {
    if (interaction.type == 2) {
      await interaction.respond({ type: 5 });

      const authorId = interaction.member ? interaction.member.id : interaction.user.id;
      const authorUsername = interaction.member ? interaction.member.username : interaction.user.username;

      const [authorName, deferredMessageId, channelName, groupName] = await Promise.all([getUserGlobalName(client, authorId), getDeferredMessageId(client.userId, interaction.token), getChannelName(client, interaction.channelId), interaction.guildId ? getGuildName(client, interaction.guildId) : Promise.resolve(null)]);

      const payload = buildBasePayload(client, authorId, authorName, authorUsername, interaction.channelId, interaction.guildId, deferredMessageId || interaction.id);

      const args = extractArguments(interaction.data.options);

      payload.command = {command: interaction.data.name.trim(), command_id: interaction.id, client_id: client.userId, arguments: args};

      payload.int_token = interaction.token;

      payload.message.chat.name = channelName;
      if (groupName) payload.message.chat.group_name = groupName;

      await fetch(`${API_URL_BASE}/${username}/discord`, {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)});
    } else if (interaction.type == 3) {
      try {
        await interaction.respond({ type: 6 });
      } catch {
        return;
      }

      const authorId = interaction.member ? interaction.member.id : interaction.user.id;
      const authorUsername = interaction.member ? interaction.member.username : interaction.user.username;
      const authorName = await getUserGlobalName(client, authorId);

      const payload = buildBasePayload(client, authorId, authorName, authorUsername, interaction.channelId, interaction.guildId, interaction.message ? interaction.message.id : 0);

      let cid = '';
      if (interaction.data && interaction.data.custom_id) cid = interaction.data.custom_id;
      else if (interaction.customId) cid = interaction.customId;
      else if (interaction.data && interaction.data.customId) cid = interaction.data.customId;

      payload.command = {command: cid || '', command_id: interaction.id, client_id: client.userId, arguments: {}};
      payload.int_token = interaction.token;
      payload.callback = {data: cid || '', message_id: interaction.message ? interaction.message.id : 0};

      const [channelName, groupName] = await Promise.all([getChannelName(client, interaction.channelId), interaction.guildId ? getGuildName(client, interaction.guildId) : null]);

      payload.message.chat.name = channelName;
      if (groupName) payload.message.chat.group_name = groupName;

      await fetch(`${API_URL_BASE}/${username}/discord`, {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)});
    }
  });

  client.on('messageCreate', async ({ message }) => {
    if (message.author.bot) return;

    const authorName = await getUserGlobalName(client, message.author.id);

    const payload = buildBasePayload(client, message.author.id, authorName, message.author.username, message.channelId, message.guildId, message.id, message.content);

    const [channelName, groupName] = await Promise.all([getChannelName(client, message.channelId), message.guildId ? getGuildName(client, message.guildId) : null]);

    payload.message.chat.name = channelName;
    if (groupName) payload.message.chat.group_name = groupName;

    let attachments = [];

    if (Array.isArray(message.attachments)) {
      attachments = message.attachments;
    } else if (message.attachments && typeof message.attachments.toArray == 'function') {
      attachments = message.attachments.toArray();
    } else if (message.attachments && typeof message.attachments.first == 'function') {
      attachments = [message.attachments.first()].filter(Boolean);
    }

    if (attachments.length > 0) {
      const attachPayload = await buildAttachmentPayload(attachments[0]);

      if (attachPayload) {
        payload.message.document = attachPayload;
        if (message.content) payload.message.caption = message.content;
      } else {
        payload.message.text = message.content || '';
      }
    } else {
      payload.message.text = message.content || '';
    }

    if (message.messageReference) {
      try {
        const refMsg = await client.rest.request({method: 'GET', path: `/channels/${message.messageReference.channelId || message.channelId}/messages/${message.messageReference.messageId}`});

        const refAuthorName = await getUserGlobalName(client, refMsg.author.id);

        payload.message.reply_to_message = {
          message_id: refMsg.id,
          from: {
            id: refMsg.author.id,
            is_bot: refMsg.author.bot || false,
            first_name: refAuthorName,
            username: refMsg.author.username
          },
          chat: {
            id: refMsg.channel_id,
            type: message.guildId ? 'group' : 'private'
          },
          date: parseInt(new Date(refMsg.timestamp) / 1e3),
          text: refMsg.content || ''
        };
      } catch {}
    }

    await fetch(`${API_URL_BASE}/${username}/discord`, {method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)});
  });

  return client;
}

BOTS.forEach(bot => createClient(bot.token, bot.username, bot.presence).run());