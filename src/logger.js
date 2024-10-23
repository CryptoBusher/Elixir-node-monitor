import path from "path";
import { fileURLToPath } from 'url';
import { format, createLogger, transports } from 'winston';


const DIRNAME = path.dirname(fileURLToPath(import.meta.url));

function buildLogger() {
    const logFormat = format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} | ${level} | ${stack || message}`;
    });

    return createLogger({
        level: 'info',
        format: format.combine(
            format.timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
            format.errors({ stack: true })
        ),
        transports: [
            new transports.Console({
                format: format.combine(
                    format.colorize(),
                    logFormat
                )
            }),
            new transports.File({
                filename: path.join(DIRNAME, 'botlog.json'),
                level: 'debug',
                format: format.combine(
                    format.timestamp(),
                    format.errors({ stack: true }),
                    format.json()
                )
            })
        ]
    });
}


export const logger = buildLogger();