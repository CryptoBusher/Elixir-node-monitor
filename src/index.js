import path from 'path';

import fetch from "node-fetch";
import { Client } from 'ssh2';

import { TelegramBot } from "./telegram.js";
import { txtToArray, extractUniqueAppVersions } from "./helpers.js";
import { logger } from "./logger.js";
import { config } from "./config.js";

import 'dotenv/config';


const tgBot = process.env.TELEGRAM_API_KEY && process.env.TELEGRAM_CHAT_ID 
? new TelegramBot(process.env.TELEGRAM_API_KEY, process.env.TELEGRAM_CHAT_ID) 
: undefined;


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


const handleResults = async (results) => {
    const badNodes = [];

    try {
        const successes = results.filter(result => result.success === true);

        const fails = results.filter(result => result.success === false);
        const failNames = fails.map(item => item.name);
        badNodes.push(...failNames);
    
        const statusOk = successes.filter(result => result.data.status === 'OK');
    
        const statusNotOk = successes.filter(result => result.data.status !== 'OK');
        const statusNotOkNames = statusNotOk.map(item => item.name);
        badNodes.push(...statusNotOkNames);
    
        const [appVersions, versionsReport] = extractUniqueAppVersions(statusOk);

        if (appVersions.length > 1) {
            logger.info(versionsReport);
        }

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
<b>Versions:</b> ${appVersionsString}
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
    
            await tgBot.sendNotification(tgMessage, false)
        }
    } catch (error) {
        const message = `Failed to handle results, reason: ${error.message}`;
        logger.error(message);
        if (tgBot) {
            await tgBot.sendNotification(message, false)
        }
    }

    return [...new Set(badNodes)];
};


const runCommand = async (serverName, commandName) => {
    try {
        const commands = txtToArray('commands.txt');
        const servers = txtToArray('servers.txt');
    
        const serverCommand = commands.find(
            c => c.startsWith(`${serverName}|${commandName}|`)
        )?.split('|', 3)[2];
    
        if (!serverCommand) throw new Error(`Command is not provided`);

        const [name, host, metrics_port, port, username, password] = servers.find(
            s => s.startsWith(`${serverName}|`)
        )?.split('|', 6) || [];
    
        if (!username || !password) throw new Error(`Connection data is not provided`);
    
        let report = `🤖 <b>Command ${commandName} on server ${serverName}</b>\n\n`;
        const conn = new Client();

        await new Promise((resolve, reject) => {
            conn.on('ready', () => {
                logger.info(`${serverName} - connected via SSH`);
                conn.exec(serverCommand, (err, stream) => {
                    if (err) {
                        conn.end();
                        report += `<b>STDERR:</b> ${err.message}\n`;
                        resolve();
                        return;
                    }
                    stream.on('close', (code) => {
                        logger.info(`${serverName} - command executed with code: ${code}`);
                        report += `<b>Code:</b> ${code}`;
                        conn.end();
                        resolve();
                    }).on('data', (data) => {
                        logger.info(`${serverName} - STDOUT: ${data.toString()}`);
                        report += `<b>STDOUT:</b> ${data.toString()}`;
                    }).stderr.on('data', (data) => {
                        logger.info(`${serverName} - STDERR: ${data.toString()}`);
                        report += `<b>STDERR:</b> ${data.toString()}`;
                    });
                });
            }).on('error', (err) => {
                report += `<b>Connection Error:</b> ${err.message}`;
                resolve();
            }).connect({
                host,
                port: parseInt(port, 10),
                username,
                password
            });
        });

        if (tgBot) await tgBot.sendNotification(report, false);
    } catch (error) {
        const message = `Failed to run command ${commandName} on server ${serverName}, reason: ${error.message}`;
        logger.error(message);
        if (tgBot) await tgBot.sendNotification(message, false);
    }
};


const start = async () => {
    const servers = txtToArray('servers.txt');

    const results = await runCheck(servers);
    const badNodes = await handleResults(results);

    if (badNodes.length > 0 && config.executeCommandOnFail) {
        logger.info(`Trying to execute commands on servers with bad nodes`);
        for (const nodeName of badNodes) {
            await runCommand(nodeName, config.executeCommandOnFail);
        }
    }

    logger.info(`Finished, sleeping`);
}


start();
setInterval(start, config.delayMinutes * 60 * 1000);