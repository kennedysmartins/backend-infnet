const requestCountByIP = {};

const rateLimit = (request, response, next) => { 
    const clientIP = request.IP;

    if(requestCountByIP[clientIP]) {
        if(requestCountByIP[clientIP] > 1000) { 
            return response.status(429).json({error: 'Too many requests, limit 1000'})
        }
        requestCountByIP[clientIP]++

    } else {
        requestCountByIP[clientIP] = 1
        setTimeout(() => {
            delete requestCountByIP[clientIP]
        }, 60000)
    }
    next()


}

module.exports = rateLimit;
