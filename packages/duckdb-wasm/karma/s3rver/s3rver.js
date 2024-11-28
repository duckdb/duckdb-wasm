const S3rver = require('s3rver');

const CORS_CONFIG = "<CORSConfiguration>\n" +
    "  <CORSRule>\n" +
    "    <AllowedOrigin>*</AllowedOrigin>\n" +
    "    <AllowedMethod>PUT</AllowedMethod>\n" +
    "    <AllowedMethod>GET</AllowedMethod>\n" +
    "    <AllowedMethod>HEAD</AllowedMethod>\n" +
    "    <AllowedHeader>*</AllowedHeader>\n" +
    "    <ExposeHeaders>Content-Range</ExposeHeaders>\n" +
    "  </CORSRule>\n" +
    "</CORSConfiguration>";

var createS3rver = function (args, config, logger) {
    const log = logger.create('S3-test-server');
    log.info('Starting S3 test server on port ' + config.s3rver.port);
    let instance = new S3rver({
        port: config.s3rver.port,
        address: 'localhost',
        silent: config.s3rver.silent,
        directory: './../../.tmp/s3rver',
        configureBuckets: [{name: 'test-bucket', configs:[CORS_CONFIG]}]
    }).run();
};

module.exports = {
    'framework:s3rver': ['factory', createS3rver]
};