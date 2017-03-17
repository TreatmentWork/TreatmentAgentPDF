var express = require('express');
var bodyParser = require('body-parser');
var clam = require('./pdfConfig.js');
var fs = require('fs');
var commonConfig = require(appRoot + '/config/commonConfig.json');
var clamTAConfig = require(appRoot + '/config/pdfTAConfig.json');
var logger = require(appRoot + '/js/util/winstonConfig.js');
var resultCallback = require(appRoot + '/js/httpClient.js');

var app = express();
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// parse application/json
app.use(bodyParser.json());

app.set('port', process.env.PORT || commonConfig.port);
app.set('host', process.env.HOST || '127.0.0.1');

app.post('/pdfconversion/singlescan', function(req, res) {
	var requestId = req.body.requestId;
	var scanFile = req.body.scanFile;
	var vmName = req.body.vmName;
	var configData = req.body.configData;
	var reqIp = req.ip;
	logger.debug('Clam AV request received from IP:' + reqIp);
	logger.info(requestId + 'Starting scan of single files.');
	logger.debug('requestId:' + requestId + ', vmName:' + vmName + ', configData:' + configData +', scanFile:' + scanFile);
	res.send('Treament is being performed aysnchronously. Once treatment completes result will be sent to Treatment Controller.');

	validateInput(scanFile, function (err, isValid) {
		var postData;
		if (err) {
			postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : {msg: err.message, error : err}};
			resultCallback.sendHttpRequest(postData, clamTAConfig.endpoint, reqIp, clamTAConfig.port);
		} else {
			var is_infected = clam.scan_files(scanFile,  function(a, good_files, bad_files) {
					var finalBody = [];
					finalBody.push({msg: "Multiple scan files aggregated result..." });
					finalBody.push({msg: "Good files:" + good_files});
					finalBody.push({msg: "Bad files:" + bad_files});
					logger.info(requestId + 'Finished scan of multiple files.');
					postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : finalBody};
					resultCallback.sendHttpRequest(postData, clamTAConfig.endpoint, reqIp, clamTAConfig.port);
				 }, function(err, file, is_infected) {
					 	var intermediateBody = [];
						if(err) {
							intermediateBody.push({msg: err.message, error : err});
						} else {
							intermediateBody.push(is_infected);
						}
						postData = {"requestId" : requestId, "vmName": null, "configData": null, "result" : intermediateBody};
						resultCallback.sendHttpRequest(postData, clamTAConfig.endpoint, reqIp, clamTAConfig.port);

				}	);
		}
	});
});

app.post('/pdfconversion/multiscan', function(req, res) {
	var requestId = req.body.requestId;
	var vmName = req.body.vmName;
	var configData = req.body.configData;
	var scanFiles = req.body.scanFiles;
	var reqIp = req.ip;
	var postData;
	logger.debug('Clam AV request received from IP:' + reqIp);
	logger.info(requestId + 'Starting scan of multiple files.');
	logger.debug('requestId:' + requestId + ', vmName:' + vmName + ', configData:' + configData +', scanFiles:' + scanFiles);
	res.send('Treament is being performed aysnchronously. Once treatment completes result will be sent to Treatment Controller.');
	var is_infected = clam.scan_files(scanFiles,  function(a, good_files, bad_files) {
			var finalBody = [];
			finalBody.push({msg: "Multiple scan files aggregated result..." });
			finalBody.push({msg: "Good files:" + good_files});
			finalBody.push({msg: "Bad files:" + bad_files});
			logger.info(requestId + 'Finished scan of multiple files.');
			postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : finalBody};
			resultCallback.sendHttpRequest(postData, clamTAConfig.endpoint, reqIp, clamTAConfig.port);
		 }, function(err, file, is_infected) {
			 	var intermediateBody = [];
				if(err) {
					intermediateBody.push({msg: err.message, error : err});
				} else {
					intermediateBody.push(is_infected);
				}
				postData = {"requestId" : requestId, "vmName": null, "configData": null, "result" : intermediateBody};
				resultCallback.sendHttpRequest(postData, clamTAConfig.endpoint, reqIp, clamTAConfig.port);


		}	);
	});


// Checking if supplied path is directory
var isDir = function (file, callback) {
	fs.stat(file, function (err, stats){
    if (err) {
      // Directory doesn't exist or something.
      logger.error('Directory doesn\'t exist ' + file);
    } else {
    	return callback(stats.isDirectory());
		}
  });
};

// Checking if supplied file path is valid
var validateInput = function  (file, callback) {
	fs.stat(file, function (err, stats){
    if (err) {
      logger.error(err);
			return callback(err);
    } else {
    	return callback(null, true);
		}
  });
};

var server = app.listen(app.get('port'), function (req, res){
  logger.info('Treatment Agent is listening on port ' + app.get('host') + ':' + app.get('port'));
});

// Never timeout as ClamAV scan could be very  long running process
server.timeout = 0;
