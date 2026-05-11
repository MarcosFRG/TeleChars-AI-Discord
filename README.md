# TeleChars AI Discord Bridge

A Discord bot that connects your [TeleChars AI](https://telecharsai.x10.mx/docs) telecharbot to Discord using the [`detritus-client`](https://www.npmjs.com/package/detritus-client) library.

> **Note**  
> This project is *not* the TeleChars AI platform itself – it is a **bridge** that forwards Discord messages and interactions to the TeleChars AI API so your telecharbot can respond directly in Discord.

---

## ✨ Features

* **Message forwarding** – sends every non‑bot Discord message (including replies) to TeleChars AI.
* **Slash command sync** – automatically fetches your telecharbot’s commands from TeleChars AI and registers them as Discord slash commands. Refreshes every **24 hours**.
* **Reply context** – includes the referenced message when a user replies, so the telecharbot can understand the conversation.
* **Channel & guild name caching** – reduces API calls to Discord for better performance.
* **Multi‑bot support** – run multiple telecharbots (with different tokens) from a single process.
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
3. Edit `index.js` and replace the placeholder values in the `BOTS` array:
```
const BOTS = [
    {
        token: 'YOUR_DISCORD_BOT_TOKEN',
        username: 'your-telecharbot-username'
    }
];
```
4. Start the bot:
```
node index.js
```

---

## ⚙️ Configuration

The bot is configured entirely through the `BOTS` array at the top of `index.js`.

| Field | Description |
|---|---|
| `token` | Your Discord bot token |
| `username` | The **unique username** of your telecharbot on TeleChars AI |

You can add **multiple bots** by adding more entries to the array. Each entry will create its own shard client.

> ⚠️ **Security:** Hard‑coding tokens is not recommended for production. Consider using environment variables or a configuration file instead.

---

## 🧱 How It Works

1. **Startup & Command Sync**  
   When a client becomes ready, the bot calls `https://telecharsai.x10.mx/info/{username}` to fetch the telecharbot’s name and command list, then registers them as Discord slash commands via the REST API. This process repeats every 24 hours.

2. **Message Handling**  
   Every time a user sends a message in a channel the bot can see, the bot builds a payload that includes:
   * Author ID, username, message content
   * Channel & (optional) guild names
   * Reply reference (if any)
   * The Discord bot token for authentication

   This payload is sent to `https://api.telecharsai.workers.dev/{username}/discord`. TeleChars AI processes it and, if configured, generates a response back to Discord using the bot’s token.

3. **Interaction Handling**  
   When a user uses a slash command, the bot immediately acknowledges it (type‑5 deferred response) and sends a similar payload with the command name and interaction token.

4. **Caching**  
   Channel and guild names are fetched once and stored in a simple `Map`, keyed by client user ID and ID. This avoids repeated REST calls for the same entities.

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
* **Caché de nombres de canales y servidores** – reduce las llamadas a la API de Discord para mejorar el rendimiento.
* **Soporte multi‑bot** – ejecuta varios telecharbots (con diferentes tokens) desde un único proceso.
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
3. Edita `index.js` y reemplaza los valores de ejemplo en el arreglo `BOTS`:
```
const BOTS = [
    {
        token: 'TU_TOKEN_DE_DISCORD',
        username: 'nombre-de-usuario-de-tu-telecharbot'
    }
];
```
4. Inicia el bot:
```
node index.js
```

---

## ⚙️ Configuración

El bot se configura completamente a través del arreglo `BOTS` al inicio de `index.js`.

| Campo | Descripción |
|---|---|
| `token` | Tu token de bot de Discord |
| `username` | El **nombre de usuario único** de tu telecharbot en TeleChars AI |

Puedes añadir **varios bots** agregando más entradas al arreglo. Cada entrada crea su propio cliente shard.

> ⚠️ **Seguridad:** No se recomienda incluir los tokens directamente en el código para entornos de producción. Considera usar variables de entorno o un archivo de configuración.

---

## 🧱 Cómo funciona

1. **Inicio y sincronización de comandos**  
   Cuando un cliente está listo, el bot llama a `https://telecharsai.x10.mx/info/{username}` para obtener el nombre de la telecharbot y su lista de comandos; luego los registra como comandos slash en Discord mediante la API REST. Este proceso se repite cada 24 horas.

2. **Manejo de mensajes**  
   Cada vez que un usuario envía un mensaje en un canal donde el bot tiene visibilidad, el bot construye una carga útil que incluye:
   * ID del autor, nombre de usuario, contenido del mensaje
   * Nombres del canal y (opcional) servidor
   * Referencia de respuesta (si existe)
   * El token de Discord del bot para autenticación

   Esta carga se envía a `https://api.telecharsai.workers.dev/{username}/discord`. TeleChars AI la procesa y, si está configurado, genera una respuesta hacia Discord usando el token del bot.

3. **Manejo de interacciones**  
   Cuando un usuario usa un comando slash, el bot lo reconoce inmediatamente (respuesta diferida tipo 5) y envía una carga similar con el nombre del comando y el token de interacción.

4. **Caché**  
   Los nombres de canales y servidores se obtienen una vez y se almacenan en un `Map` simple, usando como clave el ID del usuario del cliente y el ID de la entidad. Así se evitan llamadas REST repetitivas para los mismos datos.

---

## 🧭 Enlaces útiles

* [Documentación de TeleChars AI](https://telecharsai.x10.mx/docs) – guía de usuario oficial
* [Panel de TeleChars AI](https://telecharsai.x10.mx) – gestiona tus telecharbots
* [detritus‑client](https://www.npmjs.com/package/detritus-client) – librería de Discord utilizada
* [Portal de Desarrolladores de Discord](https://discord.com/developers/applications) – obtén tu token de bot