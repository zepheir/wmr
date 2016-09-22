#!/usr/bin/env node
// ------------------------------
// - 从服务器读取wmr数据, 用串口方式;
// ------------------------------

var net = require('net');
var zlib = require('zlib');
var colors = require('colors');
var util = require('util');
var com = require('serialport');
var GSM = require('./gsm');
// var GSM = require('./gsm900');
var CLG = require('./logger');

// Debug Flag
var isDebug = process.argv[2]=='-d'?true:false;

// log
var clg = new CLG();

// save pid
var fs = require('fs');
// const path = '/srv/wmr/arm_srv/';
const path = './';

// console.log(`This process is pid ${process.pid}`);
fs.writeFile(path+'client.pid', process.pid, function(err){
  if (err) throw err;
  clg.info('client.pid saved!');
});

// SIM808 port name
var portName = '/dev/ttySAC3';
// var portName = '/dev/ttyUSB0';
// var portName = '/dev/cu.usbserial';

// gsm
var gsm = new GSM(portName);



gsm.connect(function(err) {

	if(err) return clg.error('Error connecting to GSM', err);
	clg.info('GSM connected');

		
	gsm.initialize(function(err, resp, raw){           
		// Do things here
		clg.info('[GSM] Status:', gsm.getTcpStatus());

		gsm.getSignalStrength(function(err, resp, raw){
			clg.info('[GSM] Signal strength: %s', raw[1]);
		});

	});

});


// receive Buffer
var buffers = [];

// 水表数据
var wmrData = [];

function getConnection(connName){
	var client = net.connect({port:8107, host:'127.0.0.1'}, function(){
		clg.log('%s Connected: local[%s:%s] => remote[%s:%s]', connName,this.localAddress, this.localPort, this.remoteAddress, this.remotePort);

		this.setTimeout(1000);

		this.on('data', function(data){
			clg.log('%s From Server(%s):',connName,data.length);
			clg.debug('%s', data.toString());

			// try {
			// 	wmrData = JSON.parse(data);
			// } catch (error) {
			// 	clg.error('[CLIENT] JSON parse data Error:', error);
			// }

			// clg.log('[CLIENT] Data received:', wmrData);
			

			// // zlib 解压缩
			// zlib.inflate( data, function(err, buffer){
			// 	if(!err){
			// 		wmrDate = JSON.parse(buffer);
			// 		clg.log('zlib data(%s:%s):', JSON.stringify(wmrDate).length, wmrDate.length);
			// 		isDebug?clg.debug('%s', JSON.stringify(wmrDate)):null;
			// 	}
			// });

			this.end();
		});

		this.on('end', function(){
			clg.log('%s Client disconnected', connName);
		});

		this.on('error', function(err){
			clg.error('Socket Error:', JSON.stringify(err));
		});

		this.on('timeout', function(){
			// console.log('Socket Time Out');
			clg.warn('Socket Time Out');
		});

		this.on('close', function(){
			// console.log('Socket Close\r\n');
			clg.log('Socket Close');
		});
	});

	return client;
}

function writeData(socket, data) {
	var success = !socket.write(data);
	if (!success) {
		(function(socket,data){
			socket.once('drain', function(){
				writeData(socket, data);
			});
		})(socket, data);
	}
}

const _cmd = {
	cmd:'RDLASTALL'
};


var c1 = getConnection('client_1#');

c1.on('error', function(err){
	// console.log('Socket Error: ', JSON.stringify(err));
	clg.error('Socket Error: ', JSON.stringify(err));
});


// 工作循环体
function _process(){
	// writeData(c1, JSON.stringify(_cmd));


	gsm.getData(JSON.stringify(_cmd), function(data){
		var _cmd2 = {
			cmd:'SDWMRDATA',
			data: JSON.stringify(data)
		};

		// write socket data
		writeData(c1, JSON.stringify(_cmd2));		

		clg.log('[GSM] Read & Send data:', JSON.stringify(_cmd2));
		console.log('\n');


		gsm.powerSwitch();

		setTimeout(process.exit(), 10000);
		

	});


};


// 开始client工作, 每60秒钟读取一次
setTimeout(function(){
	_process();
}, 30000);


