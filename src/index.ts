import dotenv from 'dotenv';
import { Client } from 'discord.js';
import { OpenAI } from 'openai';

dotenv.config();

const client = new Client({
    intents: ['Guilds', 'GuildMembers', 'GuildMessages', 'MessageContent']
})


client.on('ready', () => {
    console.log('Bot is ready');
})

// ignore prefix
const IGNORE_PREFIX = '!';
// selected channel
const CHANNEL_ID = ["1256124767409541233"];

// OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});


client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith(IGNORE_PREFIX)) return;
    if (!CHANNEL_ID.includes(message.channelId) && !message.mentions.users.has(client?.user?.id ?? '')) return;

    // typing
    await message.channel.sendTyping();

    // 5 seconds delay
    const sendTyping = setInterval(() => {
        message.channel.sendTyping();
    }, 5000);

    // conversations
    type ConversationRole = 'user' | 'assistant' | 'system';
    interface ConversationMessage {
        role: ConversationRole;
        content: string;
        name?: string;
    }

    let conversation: ConversationMessage[] = [];
    conversation.push({
        role: 'system',
        content: 'Chat with a bot'
    });

    // previous messages
    let previousMessages = await message.channel.messages.fetch({ limit: 10 });

    previousMessages.reverse();
    previousMessages.forEach((msg) => {
        if (msg.author.bot && msg.author.id !== client.user?.id) return;
        if (msg.content.startsWith(IGNORE_PREFIX)) return;

        const username = msg.author.username.replace(/\s+/g, '_').replace(/[^\w\s]/gi, '');

        if (msg.author.id === client.user?.id) {
            conversation.push({
                role: 'assistant',
                content: msg.content,
                name: username
            });
            return;
        }
        conversation.push({
            role: 'user',
            content: msg.content,
            name: username
        });

    });

    // OpenAI
    const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: conversation,
    }).catch((error) => {
        console.error('OpenAI Error:\n', error);
    });
    const responseMessage = response?.choices[0].message.content ?? 'I am having some trouble with OpenAI. Please try again later.';
    //  message.reply(response?.choices[0].message.content ?? 'I am having some trouble with OpenAI. Please try again later.');

    const chunksSizeLimit = 2000;

    for (let i = 0; i < responseMessage.length; i += chunksSizeLimit) {
        const chunk = responseMessage.substring(i, i + chunksSizeLimit);
        await message.channel.send(chunk);
    }
    // clear interval
    clearInterval(sendTyping);


})

client.login(process.env.DISCORD_TOKEN);