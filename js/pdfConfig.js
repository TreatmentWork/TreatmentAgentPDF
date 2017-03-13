var config = require('../config/pdfTAConfig.json');
var exports = module.exports = pdf = require('./pdfconversion.js')({
    remove_infected: config.remove_infected, // If true, removes infected files
    quarantine_infected: config.quarantine_infected, // False: Don't quarantine, Path: Moves files to this place.
    scan_log: config.pdf_log, // Path to a writeable log file to write pdf results into
    debug_mode: config.debug_mode, // Whether or not to log info/debug/error msgs to the console
    pdfscan: {
        path: config.pdfscan.path, // Path to pdfscan binary
        pdf_archives: config.pdfscan.pdf_archives // If true, scan archives (ex. zip, rar, tar, dmg, iso, etc...)
    }
});
