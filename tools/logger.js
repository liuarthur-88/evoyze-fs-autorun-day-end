const path = require('path');
const dateFormat = require('./dateFormat')
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
require('dotenv').config({ path: path.resolve('.env') });

const logFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.align(),
    winston.format.printf(
        info => `${dateFormat(Date.now(), 'dt')} : ${info.message}`,
    ),);

const transport = new DailyRotateFile({
    filename: './/logs//NodeWinstonApp-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    prepend: true,
    level: null,
    localTime: true
});

transport.on('rotate', function (oldFilename, newFilename) {

    // call function like upload to s3 or on cloud
});

const logger = winston.createLogger({
    format: logFormat,
    transports: [
        transport,
        new winston.transports.Console({
            level: "info",
        }),

    ]
});

module.exports = logger;