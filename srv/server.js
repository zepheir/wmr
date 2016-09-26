#!/usr/bin/env node

var net = require('net');
var zlib = require('zlib');
var CLG = require('./logger');

var clg = new CLG();

var fs = require('fs');
const path = '/mnt/data0/app/wmr/srv/';

// console.log(`This process is pid ${process.pid}`);
fs.writeFile(path+'server.pid', process.pid, function(err){
  if (err) throw err;
  clg.info('It\'s saved!');
});

var d = [{
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
},{
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
}];

// MongoDB
var db = require('monk')('127.0.0.1:27017/gcc2db');
db.then(function() {
  clg.info('Connected correctly to server')
});
var devices = db.get('equipment');
var wmrs = new Object;
devices.find({eq_modu:'WMR'}, {fields:{_id:0, eq_type:0, is_new:0, addtime:0, equipment_id:0},sort:{_id:-1} }, function(err, docs){
  clg.debug('>> read from mdb(%s:%s):',docs.length,JSON.stringify(docs).length, JSON.stringify(docs));
});



var server = net.createServer(function(client){
  
  console.log('\r\n');
  clg.info('Client %s:%s connected.', client.remoteAddress.split(':')[3], client.remotePort);

  client.setTimeout(500);
  
  client.on('data', function(data){

    clg.debug('  Received: '+ data.toString());
    clg.debug('  Bytes Received: '+client.bytesRead);

    try {
      var _cmd = JSON.parse(data);
    } catch (error) {
      var _cmd = {cmd:null};
    } 

    if(_cmd.cmd == 'RDLASTALL'){

      // 读数据库
      devices.find({eq_modu:'WMR'}, 
        {fields:{_id:0,eq_type:0,eq_modu:0,status:0, is_new:0, addtime:0, eq_name:0 ,equipment_id:0},sort:{_id:-1} }, 
        function(err, docs){
        clg.debug('>> read from mdb(%s:%s):',docs.length,JSON.stringify(docs).length, JSON.stringify(docs));

        // // 压缩数据
        // zlib.deflate(JSON.stringify(docs), function(err, buffer){
        //   // 发送数据
        //   if(!err) writeData(client, buffer);
        //   console.log('  Bytes Sending: '+client.bytesWritten);
        // });
        
        // 不用压缩
        writeData(client, JSON.stringify(docs));
        clg.debug('  Bytes Sending: '+client.bytesWritten);

      });


    }else{
      writeData(client, data.toString());
      clg.debug('  Bytes Sending: '+client.bytesWritten);
    }

    

  });

  client.on('end', function(){

    clg.info('Client disconnected!');
    server.getConnections(function(err, count){
      clg.info('Remaining Connections: '+ count);
    });

  });

  client.on('error', function(err){
    clg.error('Socket Error: '+JSON.stringify(err));
  });

  client.on('timeout', function(){
    clg.warn('Socket Time Out.');
  });

});


server.listen(8108, function(){
  clg.info('Server listening: '+ JSON.stringify(server.address()));
  
  server.on('close', function(){
    clg.info('Server Terminated!');
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
