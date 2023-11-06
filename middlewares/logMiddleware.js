const fs = require('fs')
const path = require('path')

const logMiddleware = (request, response, next) => {
    const newLog = {
        timestamp: new Date(),
        method: request.method,
        url: request.url,
        params: request.params,
        ip: request.ip

    }

    const logFilePath = path.join(__dirname, '../data/logs.json');

    let existingLogs = [];

    try {
        existingLogs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'))
    } catch (e) {
        existingLogs = [];
    }

    existingLogs.push(newLog)
    fs.writeFileSync(logFilePath, JSON.stringify(existingLogs, null, 2))
    next()

}

module.exports = logMiddleware