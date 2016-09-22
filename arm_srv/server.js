#!/usr/bin/env node
var net = require('net');
var zlib = require('zlib');
var colors = require('colors');
var util = require('util');
var CLG = require('./logger');
// var com = require('serialport');

// Debug Flag
var isDebug = process.argv[2]=='-d'?true:false;

// save pid
var fs = require('fs');
const path = '/srv/wmr/arm_srv/';

// console.log(`This process is pid ${process.pid}`);
fs.writeFile(path+'server.pid', process.pid, function(err){
  if (err) throw err;
  clg.info('server.pid saved!');
});

// Define logger
var clg = new CLG();




// 水表数据
var wmrDate = [
	// Demo 数据
	{
		eq_imei: "865067022371390",
		// "eq_type": "DATA",
		eq_modu: "WMR",
		// "is_new": 0,
		status: 1,
		// "addtime": 1468306425,
		// "equipment_id": 105,
		data: [
			7520,
			26,
			180997,
			0
		],
		updatetime: 1473848708,
		eq_remark: "",
		eq_name: "综合楼"
	}
];

// function getConnection(connName){
// 	var client = net.connect({port:8108, host:'horebtech.net'}, function(){
// 		_clg.log('%s Connected: local[%s:%s] => remote[%s:%s]', connName,this.localAddress, this.localPort, this.remoteAddress, this.remotePort);

// 		this.setTimeout(1000);

// 		this.on('data', function(data){
// 			_clg.log('%s From Server(%s):',connName,data.length);
// 			isDebug?_clg.debug('%s', data.toString('base64')):null;

// 			// zlib 解压缩
// 			zlib.inflate( data, function(err, buffer){
// 				if(!err){
// 					wmrDate = JSON.parse(buffer);
// 					_clg.log('zlib data(%s:%s):', JSON.stringify(wmrDate).length, wmrDate.length);
// 					isDebug?_clg.debug('%s', JSON.stringify(wmrDate)):null;
// 				}
// 			});

// 			this.end();
// 		});

// 		this.on('end', function(){
// 			_clg.log('%s Client disconnected', connName);
// 		});

// 		this.on('error', function(err){
// 			_clg.error('Socket Error:', JSON.stringify(err));
// 		});

// 		this.on('timeout', function(){
// 			// console.log('Socket Time Out');
// 			_clg.warn('Socket Time Out');
// 		});

// 		this.on('close', function(){
// 			// console.log('Socket Close\r\n');
// 			_clg.log('Socket Close');
// 		});
// 	});

// 	return client;
// }

// function writeData(socket, data) {
// 	var success = !socket.write(data);
// 	if (!success) {
// 		(function(socket,data){
// 			socket.once('drain', function(){
// 				writeData(socket, data);
// 			});
// 		})(socket, data);
// 	}
// }

// 建立服务器
var server = net.createServer(function(client){
  
  console.log('\r\n');
  clg.log('Client %s:%s connected.', client.remoteAddress.split(':')[3], client.remotePort);

  client.setTimeout(60000);
  
  client.on('data', function(data){

    // clg.debug('  Received: '+ data.toString());
    clg.debug('  Bytes Received: '+client.bytesRead);

    try {
      var _cmd = JSON.parse(data);
    } catch (error) {
      var _cmd = {cmd:null};
    } 

    if(_cmd.cmd == 'RDLASTALL'){

			// 将wmrData返回
			writeData(client, JSON.stringify(wmrDate));

      // // 读数据库
      // devices.find({eq_modu:'WMR'}, 
      //   {fields:{_id:0,eq_type:0,eq_modu:0,status:0, is_new:0, addtime:0, eq_name:0 ,equipment_id:0},sort:{_id:-1} }, 
      //   function(err, docs){
      //   clg.debug('>> read from mdb(%s:%s):',docs.length,JSON.stringify(docs).length, JSON.stringify(docs));

      //   // // 压缩数据
      //   // zlib.deflate(JSON.stringify(docs), function(err, buffer){
      //   //   // 发送数据
      //   //   if(!err) writeData(client, buffer);
      //   //   console.log('  Bytes Sending: '+client.bytesWritten);
      //   // });
        
      //   // 不用压缩
      //   writeData(client, JSON.stringify(docs));
      //   clg.debug('  Bytes Sending: '+client.bytesWritten);

      // });


    }
		else if(_cmd.cmd == 'SDWMRDATA'){
			clg.log('[CLIENT] Revieced data:',_cmd.data);
			wmrDate = JSON.parse(_cmd.data);
		}
		else{
      // writeData(client, data.toString());
      // clg.debug('  Bytes Sending: '+client.bytesWritten);
			clg.warn('[CLIENT] Dont know Command ...',_cmd);
    }

    

  });

  client.on('end', function(){

    clg.log('Client disconnected!');
    server.getConnections(function(err, count){
      clg.log('Remaining Connections: '+ count);
    });

  });

  client.on('error', function(err){
    clg.error('Socket Error: '+JSON.stringify(err));
  });

  client.on('timeout', function(){
    clg.warn('Socket Time Out.');
  });

});


server.listen(8107, function(){
  clg.log('Server listening: '+ JSON.stringify(server.address()));
  
  server.on('close', function(){
    clg.log('Server Terminated!');
  });

  server.on('error', function(err){
    clg.error('Server Error: '+JSON.stringify(err));
  });
});


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

