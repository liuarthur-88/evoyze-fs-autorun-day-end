const sql = require('mssql');
const path = require('path');
const schedule = require('node-schedule');
const formatDate = require('../tools/dateFormat')
const logger = require('../tools/logger');
const mailService = require('../tools/mailService');
const { execStoredProcedure, executeSelectStatement } = require('../tools/dbProc')

require('dotenv').config({ path: path.resolve('.env') });

var CURR_UID = 'SYSTEM'
var MY_ROLE_ID = 9901

// Default schedule
var DAYEND_SCHEDULE = '0 59 23 * * *';

var sch_job = schedule.scheduleJob(DAYEND_SCHEDULE, () => {
    runDayendClosing();
});

const hourly_schedule = schedule.scheduleJob('0 */1 * * * *', async () => {

    logger.info('====================HOURLY CRON JOB====================');

    try {
        logger.info('Start query time schedule from DB.');

        const storedProcedureName = 'pr_settings_auto_day_end_load';
        const parameters = {
            current_uid: CURR_UID,
            co_row_guid: null
        };
        const result = await execStoredProcedure(storedProcedureName, parameters);

        var day_end_sch = result.recordset[0]['schedule_time'];
        var hour = day_end_sch.split(':')[0];
        var minutes = day_end_sch.split(':')[1];

        if (DAYEND_SCHEDULE != day_end_sch) {
            logger.info(`Reschedule on: ${day_end_sch}`);

            // Change scheduled time pattern
            sch_job.reschedule(`0 ${minutes} ${hour} * * *`)

            // Save new schedule to global var.
            DAYEND_SCHEDULE = day_end_sch;
        }
        else {
            logger.info('Same schedule time.')
        }

    } catch (err) {
        logger.error('Error:', err);
    };

});

const runDayendClosing = async () => {

    const today = new Date(Date.now())

    try {
        const storedProcedureName = 'pr_settings_auto_day_end_load';
        const parameters = {
            current_uid: CURR_UID,
            co_row_guid: null
        };
        const result = await execStoredProcedure(storedProcedureName, parameters);

        var na_enable = result.recordset[0]['enable_dayend'];
        var tr_date = await executeSelectStatement('SELECT DBO.fn_pos_get_current_date()');
        
    } catch (err) {
        logger.error('Error:', err);
    };

    if (!na_enable) {
        logger.info('Autorun day end feature disable. ')
        return;
    }

    if (today < new Date(tr_date)) {
        logger.info(`System already run closing, system date: ${formatDate(new Date(tr_date), 'd')}.`)
        return;
    }
    else if (today > new Date(tr_date)) {
        logger.info(`Transaction date not equal to current date: ${formatDate(today, 'd')}.`)
        return;
    }

    try {
        const storedProcedureName = 'pr_day_end_allow_close';
        const parameters = {
            current_uid: CURR_UID,
            my_role_id: MY_ROLE_ID,
            co_id: null,
            curr_tr_dt: null,
            axn: null,
            url: null
        };
        const result = await execStoredProcedure(storedProcedureName, parameters);

        var result1 = result.recordset[0];
        var result2 = result.recordset[1];
    } catch (err) {
        logger.error('Error:', err);
    }

    if (!result1.ok_to_close || !result2.ok_to_close) {

        try {
            var result = await executeSelectStatement(`SELECT DBO.fn_notif_email(2104005), DBO.fn_get_co_code(null), DBO.fn_get_app_url('POS')`);
            
            var emails = result[0]
            var co_code = result[1]
            var app_URL = result[2]

        } catch (err) {
            logger.error('Error:', err);
        }        

        if (!emails) {
            logger.info('No emails registered in Notification.');
            return;
        }  

        let body = '<ul>'

        if (!result1.ok_to_close) {
            body += `<li>${result1.resolution}<br/>${result1.msg}</li><br/>`;
            logger.info(result1.msg);
        };

        if (!result2.ok_to_close) {
            body += `<li>${result2.msg}</li>`
            logger.info(result2.msg);
        };

        body += '</ul>'

        mailService.sendEmail({
            to: emails,
            subject: `[${co_code}] - Failed to autorun day-end closing `,
            html: `Dear sir and madam,<br/><br/>${body}<br/><br/> <a href="${app_URL}" target="_blank">Click here to FAST Shop</a>`,
        });

        logger.info('Send email based on notification registered email due to failed to run day end closing.')
        return;
    }

    logger.info('===============Start day end closing===============');

    try {
        const storedProcedureName = 'pr_day_end_exec';
        const parameters = {
            current_uid: CURR_UID,
            my_role_id: MY_ROLE_ID,
            remarks: 'Autorun day end closing.',
            co_id: null,
            axn: null,
            url: null,

            // stored procedure output
            result: { type: sql.NVarChar, output: true },
            new_tr_dt: { type: sql.DateTime, output: true },
            row_guid: { type: sql.UniqueIdentifier, output: true }
        };

        var result = await execStoredProcedure(storedProcedureName, parameters);
        var new_tr_date = formatDate(result.output.new_tr_dt, 'd')
    } catch (err) {
        logger.error('Error:', err);
    }

    logger.info(`Finished, new transaction date: ${new_tr_date}.`)
    logger.info('===================================================');

}

sql.on('error', err => {
    logger.info(err)
})