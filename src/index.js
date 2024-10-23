import path from 'path';

import fetch from "node-fetch";

import { TelegramBot } from "./telegram.js";
import { txtToArray, extractUniqueAppVersions } from "./helpers.js";
import { logger } from "./logger.js";
import { config } from "./config.js";

import 'dotenv/config';


const rqWithTimeout = async (url, timeout) => {
    return Promise.race([
        fetch(url),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), timeout)
        )
    ]);
}

const checkHealth = async (name, host, port) => {
    try {
        const url = `http://${host}:${port}/health`;
        const response = await rqWithTimeout(url, 10_000);

        if (response.status != 200) {
            throw new Error(`Unexpected status code: ${response.status}`);
        }

        const json_resp = await response.json();

        return {
            name: name,
            success: true,
            data: json_resp
        }

    } catch (e) {
        return {
            name: name,
            success: false,
            data: e.message
        }
    }
};


const runCheck = async (servers) => {
    const results = [];
    for(const server of servers) {
        const [name, host, port] = server.split('|');
        results.push(await checkHealth(name, host, port));
    }

    return results;
};

const start = async () => {
    const tgBot = process.env.TELEGRAM_API_KEY && process.env.TELEGRAM_CHAT_ID 
    ? new TelegramBot(process.env.TELEGRAM_API_KEY, process.env.TELEGRAM_CHAT_ID) 
    : undefined;

    const servers = txtToArray(path.join('servers.txt'));
    
    const results = await runCheck(servers);

    const successes = results.filter(result => result.success === true);

    const fails = results.filter(result => result.success === false);
    const failNames = fails.map(item => item.name);

    const statusOk = successes.filter(result => result.data.status === 'OK');

    const statusNotOk = successes.filter(result => result.data.status !== 'OK');
    const statusNotOkNames = statusNotOk.map(item => item.name);

    const appVersions = extractUniqueAppVersions(statusOk);
    const appVersionsString = appVersions.join('|');

    logger.info(`Successes: ${successes.length}, fails: ${fails.length}, status ok: ${statusOk.length}, status not ok: ${statusNotOk.length}, app versions: ${appVersionsString}`);
    if (failNames.length > 0) {
        logger.info(`Fail names: ${failNames.join(',')}`)
    }
    if (statusNotOkNames.length > 0) {
        logger.info(`Fail names: ${statusNotOkNames.join(',')}`)
    }

    if (tgBot) {
        let tgMessage = `⚙️ <b>Elixir nodes status report</b>\n
<b>Successfull checks:</b> ${successes.length}
<b>Failed checks:</b>  ${fails.length}
<b>Status OK:</b> ${statusOk.length}
<b>Status not OK:</b> ${statusNotOk.length}
`
        if (failNames.length > 0) {
            tgMessage += `<b>Fail names: </b> ${failNames.join(',')}\n`
        }

        if (statusNotOkNames.length > 0) {
            tgMessage += `<b>Status not ok names: </b> ${statusNotOkNames.join(',')}\n`
        }

        tgBot.sendNotification(tgMessage, false)
    }
}


start();
setInterval(start, config.delayMinutes * 60 * 1000);