module.exports = (request, response, next) => {
    console.log('redirectMiddleware')
    if(request.url === "/produtos") {
        return response.redirect(301, "/products")
    }
    next()
}