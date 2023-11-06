module.exports = (request, response, next) => {
    if(request.url === "/produtos") {
        return response.redirect(301, "/products")
    }
    next()
}