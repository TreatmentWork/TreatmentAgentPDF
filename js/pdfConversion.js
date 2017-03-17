/*!
 * ClamAV NodeJSScanner
 */

// Module dependencies.
var __ = require('underscore');
var fs = require('fs');
var execFile = require('child_process').execFile;
var logger = require(appRoot + '/js/util/winstonConfig.js');

// ****************************************************************************
// NodeJSScanner class definition
// -----
// @param    Object    options        Key => Value pairs to override default settings
// ****************************************************************************

function NodeJSScanner(options) {
    options = options || {};

    // Configuration Settings
    this.defaults = Object.freeze({
        remove_infected: false,
        scan_log: null,
        debug_mode: false,
        file_list: null,
        lowriter: {
            path: '/usr/bin/lowriter',
            scan_archives: true
        }
    });

    this.settings = __.extend({},this.defaults);
    //Name of scanner
    this.scanner = 'lowriter';

    // Check to make sure scanner exists and actually is a clamscan binary
    if (!this.is_clamav_binary_sync(this.scanner)) {
        throw new Error("No valid & active virus scanning binaries are  available!");
    }

    // Override defaults with user preferences
    if (options.hasOwnProperty('lowriter') && Object.keys(options.lowriter).length > 0) {
        this.settings.lowriter = __.extend({},this.settings.lowriter, options.lowriter);
        delete options.lowriter;
    }
    this.settings = __.extend({},this.settings,options);


    // Build clam flags
    this.clam_flags = build_clam_flags(this.scanner, this.settings);
}


// ****************************************************************************
// Checks to see if a particular path contains a clamav binary
// -----
// @param   String  scanner     Scanner (clamscan ) to check
// @return  Boolean             TRUE: Is binary; FALSE: Not binary
// ****************************************************************************
NodeJSScanner.prototype.is_clamav_binary_sync = function(scanner) {
    var path = this.settings[scanner].path || null;
    if (!path) {
        if (this.settings.testing_mode) {
            console.log("Nodejs-ClamAv-Scanner: Could not determine path for clamav binary.");
        }
        return false;
    }

    var version_cmds = {
        lowriter: path + ' --version'
    };

    /*
     * Saving this line for version 1.0 release--the one that requires Node 0> .12
     * if (!fs.existsSync(path) || execSync(version_cmds[scanner]).toString().match(/ClamAV/) === null) {
     */
    if (!fs.existsSync(path)) {
        if (this.settings.testing_mode) {
            console.log("Nodejs-ClamAv-Scanner: Could not verify the " + scanner + " binary.");
        }
        return false;
    }

    return true;
};

// ****************************************************************************
// Checks if a particular file is infected.
// -----
// @param    String        file        Path to the file to check
// @param    Function    callback    (optional) What to do after the scan
// ****************************************************************************
NodeJSScanner.prototype.is_infected = function(file, callback) {
    // Verify second param, if supplied, is a function
    if (callback && typeof callback !== 'function') {
        throw new Error("Invalid callback provided. Second paramter, if provided, must be a function!");
    }

    // Verify string is passed to the file parameter
    if (typeof file !== 'string' || file.trim() === '') {
        var err = new Error("Invalid or empty file name provided.");
        if (callback && typeof callback === 'function') {
            return callback(err, '', null);
        } else {
            throw err;
        }
    }

    var self = this;

    if(this.settings.debug_mode) {
        console.log("Nodejs-ClamAv-Scanner: Scanning " + file);
        console.log('Nodejs-ClamAv-Scanner: Configured clam command: ' + this.settings[this.scanner].path + ' ' + this.build_clam_args(file).join(' '));
    }
    var outputDir = '/mountshare/treatmentResult';
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir);
        logger.debug("Dir successfully created:" + outputDir);
    } else {
      logger.debug("Dir already  exists:" + outputDir);
    }
    // Execute the clam binary with the proper flags
    execFile(this.settings[this.scanner].path, this.build_clam_args(file), function(err, stdout, stderr) {

            //var result = stdout.trim();
            var leafname= file.split('\\').pop().split('/').pop();
            logger.debug('leafname: ' + leafname);

            var leafnameNoExt = leafname.split(".")[0];
            logger.debug('leafnameNoExt: ' + leafnameNoExt);

            var outPdfName = outputDir + '/' + leafnameNoExt + '.pdf';
            logger.debug('outPdfName: ' + outPdfName);

            var outCreated = fs.existsSync(outPdfName);
            logger.debug('outCreated: ' + outCreated);

            callback(null, file, outCreated);

    });
};

// Checking if supplied path is directory
var isDir = function (file, callback) {
	fs.stat(file, function (err, stats){
    if (err) {
      // Directory doesn't exist or something.
      console.log('Directory doesn\'t exist ' + file);
    } else {
    	return callback(stats.isDirectory());
		}
  });
};
// ****************************************************************************
// Scans an array of files or paths. You must provide the full paths of the
// files and/or paths.
// -----
// @param    Array        files        A list of files or paths (full paths) to be scanned.
// @param    Function    end_cb        What to do after the scan
// @param    Function    file_cb        What to do after each file has been scanned
// ****************************************************************************
NodeJSScanner.prototype.scan_files = function(files, end_cb, file_cb) {
    files = files || [];
    end_cb = end_cb || null;
    file_cb = file_cb || null;

    var bad_files = [];
    var good_files = [];
    var completed_files = 0;
    var self = this;
    var file, file_list;

    // Verify second param, if supplied, is a function
    if (end_cb && typeof end_cb !== 'function') {
        throw new Error("Invalid end-scan callback provided. Second paramter, if provided, must be a function!");
    }

    // Verify second param, if supplied, is a function
    if (file_cb && typeof file_cb !== 'function') {
        throw new Error("Invalid per-file callback provided. Third paramter, if provided, must be a function!");
    }

    // The function that actually scans the files
    var do_scan = function(files) {
        var num_files = files.length;

        if (self.settings.debug_mode === true) {
            console.log("Nodejs-ClamAv-Scanner: Scanning a list of " + num_files + " passed files.");
        }

        if (typeof file_cb === 'function') {
            (function scan_file() {
                file = files.shift();
                self.is_infected(file, function(err, file, infected) {
                    completed_files++;

                    if (self.settings.debug_mode)
                        console.log("Nodejs-ClamAv-Scanner: " + completed_files + "/" + num_files + " have been scanned!");

                      if(infected || err) {
                        good_files.push(file);
                    } else if(!infected ) {
                        bad_files.push(file);
                    }

                    if(__.isFunction(file_cb)) file_cb(err, file, infected);

                    if(completed_files >= num_files) {
                        if(self.settings.debug_mode) {
                            console.log('Nodejs-ClamAv-Scanner: Scan Complete!');
                            console.log("Nodejs-ClamAv-Scanner: Bad Files: " + bad_files);
                            console.log("Nodejs-ClamAv-Scanner: Good Files: " + good_files);
                        }
                        if(__.isFunction(end_cb)) end_cb(null, good_files, bad_files);
                    }
                    // All files have not been scanned yet, scan next item.
                    else {
                        setTimeout(scan_file, 0);
                    }
                });
            })();
        }
    };

    // If string is provided in files param create an array
    if (typeof files === 'string' && files.trim().length > 0) {
        files = files.trim().split(',').map(function(v) { return v.trim(); });
    }

    // Do some parameter validation
    if (!__.isArray(files) || files.length <= 0) {
        if (__.isEmpty(this.settings.file_list)) {
            var err = new Error("No files provided to scan and no file list provided!");
            return end_cb(err, [], []);
        }

        fs.exists(this.settings.file_list, function(exists) {
            if (exists === false) {
                var err = new Error("No files provided and file list provided ("+this.settings.file_list+") could not be found!");
                return end_cb(err, [], []);
            }

            fs.readFile(self.settings.file_list, function(err, data) {
                if (err) {
                    return end_cb(err, [], []);
                }
                data = data.toString().split(os.EOL);
                return do_scan(data);
            });
        });
    } else {
        return do_scan(files);
    }
};



// *****************************************************************************
// Builds out the args to pass to execFile
// -----
// @param    String|Array    item        The file(s) / directory(ies) to append to the args
// @api        Private
// *****************************************************************************
NodeJSScanner.prototype.build_clam_args = function (item) {
    var args = this.clam_flags.slice();

    if (typeof item === 'string') {
        args.push(item);
    }

    if ((item instanceof Array) === true) {
        args = args.concat(item);
    }

    return args;
};

module.exports = function(options) {
    return new NodeJSScanner(options);
};

// *****************************************************************************
// Builds out the flags based on the configuration the user provided
// -----
// @param    String    scanner        The scanner to use (clamscan)
// @param    Object    settings    The settings used to build the flags
// @return    String                The concatenated clamav flags
// @api        Private
// *****************************************************************************
function build_clam_flags(scanner, settings) {
    var flags_array = [];

    flags_array.push('--headless');
    flags_array.push('--convert-to');
    flags_array.push('pdf');
    flags_array.push('--outdir');
    flags_array.push('/mountshare/treatmentResult/');

    // Build the String
    return flags_array;
}
