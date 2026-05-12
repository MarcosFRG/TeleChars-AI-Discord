# TeleChars AI Discord Bridge

A Discord bot that connects your [TeleChars AI](https://telecharsai.x10.mx/docs) telecharbot to Discord using the [`detritus-client`](https://www.npmjs.com/package/detritus-client) library.

> **Note**  
> This project is *not* the TeleChars AI platform itself – it is a **bridge** that forwards Discord messages and interactions to the TeleChars AI API so your telecharbot can respond directly in Discord.

---

## ✨ Features

* **Message forwarding** – sends every non‑bot Discord message (including replies) to TeleChars AI.
* **Slash command sync** – automatically fetches your telecharbot’s commands from TeleChars AI and registers them as Discord slash commands. Refreshes every **24 hours**.
* **Reply context** – includes the referenced message when a user replies, so the telecharbot can understand the conversation.
* **Global name resolution** – resolves each user’s server‑independent `global_name` (or falls back to their username) for a consistent identity in TeleChars AI.
* **Channel & guild name caching** – reduces API calls to Discord for better performance.
* **Multi‑bot support** – add as many bots as you like in the configuration file.
* **Low cache footprint** – all Discord cache limits are set to `0` to minimise memory usage.

---

## 📦 Prerequisites

* **Node.js** 18 or higher
* A **Discord bot token** with the following Privileged Intents enabled in the [Developer Portal](https://discord.com/developers/applications):
  * **Message Content Intent** (to read message text)
  * **Server Members Intent** (to resolve member info)
  * **Presence Intent** (to support some guild features)
* A **TeleChars AI account** and at least one [telecharbot](https://telecharsai.x10.mx/docs) already created.

---

## 🚀 Quick Start

1. **Clone the repository** or download the files.
2. Install dependencies:
```
npm install
```
3. Configure your bot in `bots.json`. The token is read from an environment variable for security:
```
[
  { "token": "$DISCORD_TOKEN_ENV", "username": "tu_telecharbot" }
]
```
   * Set the environment variable `DISCORD_TOKEN_ENV` to your Discord bot token.
   * If you prefer a plain token (not recommended), simply write it directly in place of `$DISCORD_TOKEN_ENV`.
4. Start the bot:
```
node index.js
```

---

## ⚙️ Configuration

The bot reads its configuration entirely from `bots.json` – an array of objects with the following fields:

| Field | Description |
|---|---|
| `token` | Discord bot token. If it starts with `$`, the rest is treated as an environment variable name (e.g. `$DISCORD_TOKEN_ENV` becomes `process.env.DISCORD_TOKEN_ENV`). |
| `username` | The **unique username** of your telecharbot on TeleChars AI. |

Add multiple objects to the array to run multiple bots simultaneously; each will create its own shard client.

> ⚠️ **Security:** Never hard‑code tokens in production. Always use environment variables as shown above.

---

## 🧱 How It Works

1. **Startup & Command Sync**  
   When a client becomes ready, the bot calls `https://telecharsai.x10.mx/info/{username}` to fetch the telecharbot’s name and command list, then registers them as Discord slash commands via the REST API. This process repeats every 24 hours.

2. **Message Handling**  
   Every time a user sends a message in a channel the bot can see, the bot builds a payload that includes:
   * Author ID, global name (or username), message content
   * Channel & (optional) guild names
   * Reply reference (if any)
   * The Discord bot token for authentication

   The author’s global name is obtained from Discord’s `global_name` field (falling back to `username`), and the result is cached for performance.  
   This payload is sent to `https://api.telecharsai.workers.dev/{username}/discord`. TeleChars AI processes it and, if configured, generates a response back to Discord using the bot’s token.

3. **Interaction Handling**  
   When a user uses a slash command, the bot immediately acknowledges it (type‑5 deferred response) and sends a similar payload with the command name and interaction token.

4. **Caching**  
   Channel names, guild names, and user global names are fetched once and stored in simple `Map` caches, keyed by client user ID and the entity’s ID. This avoids repeated REST calls for the same entities.

---

## 🧭 Useful Links

* [TeleChars AI Documentation](https://telecharsai.x10.mx/docs) – official user guide
* [TeleChars AI Dashboard](https://telecharsai.x10.mx) – manage your telecharbots
* [detritus‑client](https://www.npmjs.com/package/detritus-client) – the Discord library used
* [Discord Developer Portal](https://discord.com/developers/applications) – get your bot token

---

<br>
<br>
<br>

# TeleChars AI Discord Bridge (Español)

Un bot de Discord que conecta tu telecharbot de [TeleChars AI](https://telecharsai.x10.mx/docs) a Discord usando la librería [`detritus-client`](https://www.npmjs.com/package/detritus-client).

> **Nota**  
> Este proyecto **no es** la plataforma TeleChars AI en sí – es un **puente** que reenvía los mensajes e interacciones de Discord a la API de TeleChars AI para que tu telecharbot pueda responder directamente en Discord.

---

## ✨ Características

* **Reenvío de mensajes** – envía cada mensaje no‑bot de Discord (incluyendo respuestas) a TeleChars AI.
* **Sincronización de comandos slash** – obtiene automáticamente los comandos de tu telecharbot desde TeleChars AI y los registra como comandos slash en Discord. Se actualiza cada **24 horas**.
* **Contexto de respuesta** – incluye el mensaje referenciado cuando un usuario responde, para que el telecharbot entienda la conversación.
* **Resolución de nombres globales** – obtiene para cada usuario el `global_name` (independiente del servidor) o, en su defecto, el nombre de usuario, manteniendo una identidad coherente en TeleChars AI.
* **Caché de nombres de canales y servidores** – reduce las llamadas a la API de Discord para mejorar el rendimiento.
* **Soporte multi‑bot** – añade cuantos bots necesites en el archivo de configuración.
* **Huella de caché mínima** – todos los límites de caché de Discord están en `0` para minimizar el uso de memoria.

---

## 📦 Requisitos previos

* **Node.js** 18 o superior
* Un **token de bot de Discord** con los siguientes Intents Privilegiados habilitados en el [Portal de Desarrolladores](https://discord.com/developers/applications):
  * **Intención de Contenido del Mensaje** (para leer el texto)
  * **Intención de Miembros del Servidor** (para obtener información de miembros)
  * **Intención de Presencia** (para algunas funcionalidades de servidor)
* Una **cuenta en TeleChars AI** y al menos un [telecharbot](https://telecharsai.x10.mx/docs) ya creado.

---

## 🚀 Inicio rápido

1. **Clona el repositorio** o descarga los archivos.
2. Instala las dependencias:
```
npm install
```
3. Configura tu bot en `bots.json`. El token se lee desde una variable de entorno por seguridad:
```
[
  { "token": "$DISCORD_TOKEN_ENV", "username": "tu_telecharbot" }
]
```
   * Define la variable de entorno `DISCORD_TOKEN_ENV` con el token de tu bot de Discord.
   * Si prefieres escribir el token directamente (no recomendado), reemplaza `$DISCORD_TOKEN_ENV` por el valor real.
4. Inicia el bot:
```
node index.js
```

---

## ⚙️ Configuración

El bot lee toda su configuración desde `bots.json`, un arreglo de objetos con los siguientes campos:

| Campo | Descripción |
|---|---|
| `token` | Token del bot de Discord. Si comienza con `$`, el resto se interpreta como el nombre de una variable de entorno (ej. `$DISCORD_TOKEN_ENV` se convierte en `process.env.DISCORD_TOKEN_ENV`). |
| `username` | El **nombre de usuario único** de tu telecharbot en TeleChars AI. |

Añade múltiples objetos al arreglo para ejecutar varios bots a la vez; cada uno creará su propio cliente shard.

> ⚠️ **Seguridad:** Nunca escribas tokens directamente en el código en producción. Emplea siempre variables de entorno como se muestra.

---

## 🧱 Cómo funciona

1. **Inicio y sincronización de comandos**  
   Cuando un cliente está listo, el bot llama a `https://telecharsai.x10.mx/info/{username}` para obtener el nombre de la telecharbot y su lista de comandos; luego los registra como comandos slash en Discord mediante la API REST. Este proceso se repite cada 24 horas.

2. **Manejo de mensajes**  
   Cada vez que un usuario envía un mensaje en un canal donde el bot tiene visibilidad, el bot construye una carga útil que incluye:
   * ID del autor, nombre global (o nombre de usuario), contenido del mensaje
   * Nombres del canal y (opcional) servidor
   * Referencia de respuesta (si existe)
   * El token de Discord del bot para autenticación

   El nombre global del autor se obtiene del campo `global_name` de Discord (cayendo a `username` si no existe) y se almacena en caché para mejorar el rendimiento.  
   Esta carga se envía a `https://api.telecharsai.workers.dev/{username}/discord`. TeleChars AI la procesa y, si está configurado, genera una respuesta hacia Discord usando el token del bot.

3. **Manejo de interacciones**  
   Cuando un usuario usa un comando slash, el bot lo reconoce inmediatamente (respuesta diferida tipo 5) y envía una carga similar con el nombre del comando y el token de interacción.

4. **Caché**  
   Los nombres de canales, servidores y nombres globales de usuarios se obtienen una sola vez y se guardan en cachés simples (`Map`), usando como clave el ID del cliente y el ID de la entidad. Así se evitan llamadas REST repetitivas.

---

## 🧭 Enlaces útiles

* [Documentación de TeleChars AI](https://telecharsai.x10.mx/docs) – guía de usuario oficial
* [Panel de TeleChars AI](https://telecharsai.x10.mx) – gestiona tus telecharbots
* [detritus‑client](https://www.npmjs.com/package/detritus-client) – librería de Discord utilizada
* [Portal de Desarrolladores de Discord](https://discord.com/developers/applications) – obtén tu token de bot