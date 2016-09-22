#!/usr/bin/env node
// ------------------------------
// - 从服务器读取wmr数据, 用串口方式;
// ------------------------------

var net = require('net');
var util = require('util');
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
fs.writeFile(path+'client2.pid', process.pid, function(err){
  if (err) throw err;
  clg.info('client2.pid saved!');
});

// 水表数据
var wmrData = [];

function getConnection(connName){
	var client = net.connect({port:8107, host:'127.0.0.1'}, function(){
		clg.log('%s Connected: local[%s:%s] => remote[%s:%s]', connName,this.localAddress, this.localPort, this.remoteAddress, this.remotePort);

		this.setTimeout(1000);

		this.on('data', function(data){
			clg.log('%s From Server(%s):',connName,data.length);
			isDebug?clg.debug('%s', data.toString('base64')):null;

			try {
				wmrData = JSON.parse(data);
			} catch (error) {
				clg.error('[CLIENT] JSON parse data Error:', error);
			}

			clg.log('[CLIENT] Data received:', JSON.stringify(wmrData));
			

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



// 工作循环体
function _process(){
	var c1 = getConnection('client_1#');

	c1.on('error', function(err){
		// console.log('Socket Error: ', JSON.stringify(err));
		clg.error('Socket Error: ', JSON.stringify(err));
	});
	
	writeData(c1, JSON.stringify(_cmd));


};


// 开始client工作
_process();
setInterval(function(){
	_process();
}, 30000);


