const fs = require('fs');
const path = require('path');
const base = require('./karma.base.cjs');

function findByPath(files, path) {
    return Array.from(files).find(file => file.path === path);
}

function composeUrl(url, basePath, urlRoot) {
    return url
        .replace(urlRoot, '/')
        .replace(/\?.*$/, '')
        .replace(/^\/absolute/, '')
        .replace(/^\/base/, basePath);
}

function HeadersMiddlewareFactory(filesPromise, basePath, urlRoot) {
    return function (request, response, next) {
        const requestedFilePath = composeUrl(request.url, basePath, urlRoot);
        return filesPromise.then(function (files) {
            const file = findByPath(files.served, requestedFilePath);
            if (file) {
                response.setHeader('Accept-Ranges', 'bytes');
                response.setHeader('Content-Length', file.content.length);
            }
            return next();
        });
    };
}
HeadersMiddlewareFactory.$inject = ['filesPromise', 'config.basePath', 'config.urlRoot'];

module.exports = function (config) {
    const mixin = base(config);
    config.set({
        ...mixin,
        plugins: [...config.plugins, { 'middleware:headers': ['factory', HeadersMiddlewareFactory] }],
        beforeMiddleware: ['headers'],
        browsers: ['ChromeHeadlessNoSandbox'],
        reporters: ['spec'],
    });
};
