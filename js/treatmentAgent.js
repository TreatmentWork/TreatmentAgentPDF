var express = require('express');
var bodyParser = require('body-parser');
var pdf = require('./pdfConfig.js');
var fs = require('fs');
var commonConfig = require(appRoot + '/config/commonConfig.json');
var pdfTAConfig = require(appRoot + '/config/pdfTAConfig.json');
var logger = require(appRoot + '/js/util/winstonConfig.js');
var resultCallback = require(appRoot + '/js/httpClient.js');
var pdfconversion = require('./pdfconversion.js');

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
	logger.debug('pdf conversion request received from IP:' + reqIp);
	logger.info(requestId + 'Starting conversion of single files.');
	logger.debug('requestId:' + requestId + ', vmName:' + vmName + ', configData:' + configData +', scanFile:' + scanFile);
	res.send('Treatment is being performed asynchronously. Once treatment completes result will be sent to Treatment Controller.');


	validateInput(scanFile, function (err, isValid) {
		var postData;
	// 	ITLL BE THIS PART THAT NEEDS WORK
			postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : {msg: err.message, error : err}};
			var result = pdfconversion.getlibreofficeTreatment(scanFile);

					var body = [];

						  body.push(result);
					postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : body};
					resultCallback.sendHttpRequest(postData, pdfTAConfig.endpoint, reqIp, pdfTAConfig.port);

});

app.post('/pdfconversion/multiscan', function(req, res) {
	var requestId = req.body.requestId;
	var vmName = req.body.vmName;
	var configData = req.body.configData;
	var scanFiles = req.body.scanFiles;
	var reqIp = req.ip;
	var postData;
	logger.debug('Conversion request received from IP:' + reqIp);
	logger.info(requestId + 'Starting scan of multiple files.');
	logger.debug('requestId:' + requestId + ', vmName:' + vmName + ', configData:' + configData +', scanFiles:' + scanFiles);
	res.send('Treatment is being performed asynchronously. Once treatment completes result will be sent to Treatment Controller.');
	postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : {msg: err.message, error : err}};
	var result = pdfconversion.getlibreofficeTreatment(scanFile);

			var body = [];

					body.push(result);
			postData = {"requestId" : requestId, "vmName": vmName, "configData": configData, "result" : body};
			resultCallback.sendHttpRequest(postData, pdfTAConfig.endpoint, reqIp, pdfTAConfig.port);

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
