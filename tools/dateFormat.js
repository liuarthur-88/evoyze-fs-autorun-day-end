padTo2Digits = (num) => {
    return num.toString().padStart(2, '0');
}

const formatDate = (date, format) => {

    var d = new Date(date),
        month = '' + d.getMonth(),
        no_month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear(),
        hour = padTo2Digits(d.getHours()),
        minutes = padTo2Digits(d.getMinutes()),
        second = padTo2Digits(d.getSeconds());

    var month_list = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

    if (day.length < 2)
        day = '0' + day;

    if (format == 'd') {
        return [day, no_month, year].join('-');
    }
    else if (format == 'dm') {
        return [day, month_list[month]].join(' ');
    }
    else if (format == 't') {
        return [hour, minutes, second].join(':');
    }
    else if (format == 'hhmm') {
        return [hour, minutes].join(':');
    }
    else if (format == 'dt') {
        return (
            [day, month_list[month], year].join('-') +
            ' @ ' +
            [hour, minutes, second].join(':')
        );
    }

    console.log(month)
    console.log(month_list[month])
}

module.exports = formatDate;