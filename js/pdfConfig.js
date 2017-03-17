var config = require('../config/pdfTAConfig.json');
var exports = module.exports = clam = require('./pdfConversion.js')({
    scan_log: config.scan_log, // Path to a writeable log file to write scan results into
    debug_mode: config.debug_mode, // Whether or not to log info/debug/error msgs to the console
    lowriter: {
        path: config.lowriter.path // Path to lowriter binary
    }
});
