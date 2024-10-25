import fetch from "node-fetch";

import { sleep } from './helpers.js'
import { logger } from './logger.js';


export class TelegramException extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
};


export class TelegramBot {
	constructor(botToken, chatId) {
		this.botToken = botToken;
		this.chatId = chatId.split('/');  // split chat id and thread id
	}

	async sendNotification(message, notification=false) {
		const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`

        const headers = {
            'Content-Type': 'application/json'
        };

        const body = {
            chat_id: this.chatId[0],
            text: message,
            parse_mode: 'HTML',
            disable_notification: notification ? false : true,
            disable_web_page_preview: true
        };

		if (this.chatId.length > 1) {
			body.message_thread_id = this.chatId[1];
		};

		const settings = {
			method: 'POST',
			timeout: 10000,
			headers: headers,
			body: JSON.stringify(body)
		};

		const response = await fetch(url, settings);

		if (response.status !== 200) {
			logger.debug(`Failed to post TG message, reason: ${JSON.stringify(await response.json())}`);
			// throw new TelegramException(`Failed to post TG message, reason: ${JSON.stringify(await response.json())})`);
		}

		await sleep(1);
	}
}