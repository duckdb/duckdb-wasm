import config from '../package.json';

export const PACKAGE_NAME = config.name;
export const PACKAGE_VERSION = config.version;

const VERSION_PARTS = config.version.split('.');
export const PACKAGE_VERSION_MAJOR = VERSION_PARTS[0];
export const PACKAGE_VERSION_MINOR = VERSION_PARTS[1];
export const PACKAGE_VERSION_PATCH = VERSION_PARTS[2];
