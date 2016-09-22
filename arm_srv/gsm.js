// Original Author: Mike Reich (https://github.com/sensamo/sim900js)
// Tyler McDowall (Acenth)
// Now I turn it to SIM808

var sp = require('serialport');
var zlib = require('zlib');
var CLG = require('./logger');
var GPIO = require('./gpio');
var path = require('path');

var clg = new CLG();
var gpio = new GPIO();

// test gpio
// gpio.set(71, 'out');
// gpio.unset(71);
// gpio.output(71,1);
// gpio.input(71, function(data){
//   console.log(data);
// });

// Debug Flag
var isDebug = process.argv[2]=='-d'?true:false;

var GSM = function (port, baud) {
  if (!port) {
    // OLD
      // var uart = new mraa.Uart(0);
      // port = uart.getDevicePath();
      port = '/dev/cu.usbserial';
  }

  if (!baud) {
      baud = 9600;
  }

  this._port = port;
  this._baud = baud;

  this._pkey = 71;

  this._clear();

  this._tcpStatus = '';

  // this._reseted = false;

  var SerialPort = sp.SerialPort;
  this._sp = new SerialPort(port, {
    baudrate: baud,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: false,
    // Turn off the autoOpen
    // autoOpen:false  
    // parser: com.parsers.raw
    // parser: sp.parsers.readline("\r\n")
  }); 


  // // 设定io口
  // path.exists('/sys/class/gpio/gpio71', function(res){
    
  //   if(res == false){
  //     gpio.open(71, function(){
  //       gpio.set(71, 'out', function(){
  //         gpio.output(71, 1, function(stdout){
  //           clg.info('[GPIO] OPEN OK!', res, stdout);
  //         });
  //       });
  //     });
  //   }else{
  //     gpio.set(71, 'out', function(){
  //       gpio.output(71, 1, function(stdout){
  //         clg.info('[GPIO] OPEN OK!', res, stdout);
  //       });
  //     });
  //   }
    
  // });


  var that = this;
  this.resetPin();
  
};

GSM.prototype.resetPin = function(){
// 设定io口
  path.exists('/sys/class/gpio/gpio71', function(res){
    
    if(res == false){
      gpio.open(71, function(){
        gpio.set(71, 'out', function(){
          gpio.output(71, 1, function(stdout){
            clg.info('[GPIO] OPEN OK!', res, stdout);
          });
        });
      });
    }else{
      gpio.set(71, 'out', function(){
        gpio.output(71, 1, function(stdout){
          clg.info('[GPIO] OPEN OK!', res, stdout);
        });
      });
    }
    
  });
};

GSM.prototype.powerSwitch = function(){
  gpio.output(71,0);
  setTimeout(function(){
    gpio.output(71,1);
  },2000);
};

GSM.prototype.resetModule = function(cb){

  var i = 0;

  
  setTimeout(function(){
    clg.debug('[GPIO] reset:',1);
    gpio.output(71, 0);
    
    setTimeout(function(){
      clg.debug('[GPIO] reset:',2);
      gpio.output(71, 1);

      setTimeout(function(){
        clg.debug('[GPIO] reset:',3);
        gpio.output(71, 0);
        
        setTimeout(function(){
          clg.debug('[GPIO] reset:',4);
          gpio.output(71, 1);
        },2000);
        
      },500);
      
    },2000);

  },0);
  

};

GSM.prototype._handleData = function(data) {
    // clg.debug('[GSM]#> ', data);
    this._buffer = Buffer.concat([this._buffer, data]); 
};

GSM.prototype._handleError = function(error) {
    this._error = error;
};

GSM.prototype._clear = function(){
  this._buffer = new Buffer(0);
  this._error = null;
};

GSM.prototype._handleResponse = function(buf, cb) {
  // clg.debug('Res:',buf);
  // clg.debug('Buffer:', this._buffer);

  var response = null;
  var error = null;
  if(!this._buffer) return cb(error, response);
  var raw = this._buffer.toString().replace(/\r/g,'').split('\n');
  var items = [];
  var that = this;
  var command = this._parseCommand(buf);
  // var command = buf;

  // clg.debug('raw:', JSON.stringify(raw));

  raw.forEach(function(res) {
    // clg.debug('res:', res);
      res = res.trim();
      if(res === '') return;
      //console.log(res);
      if (res[0] == '+') {
          // // Some responses contain information that needs to be parsed out. These responses start with +<COMMAND>: <DATA> - Could also start with CMERROR: <DATA>
          // var details = res.split(':');
          // var resCommand = that._parseCommand(details[0]);
          // // console.log(command);
          // if (resCommand == command) {
          //     res = details[1];
          // }
          // else {
          //     return error = res.substr(1, res.length-1);
          // }
          // res = res.trim(); 
          // if (res.indexOf(',') > -1) {
          //     // Responses can contain multiple values, split them out so we can send them with other items in response
          //     var resItems = res.split(',');
          //     resItems.forEach(function(resItem){
          //         items.push(resItem); 
          //     });
          // }
          items.push(res);
      }
      else {
          items.push(res);
      }
      
      if(res == "OK" || res == ">") {
          response = error || res;
          error = null;
      }
  });

  // clg.debug('items:', items);

  cb(error, response, items, raw);
};


GSM.prototype._parseCommand = function(c) {
    // We want to compare the source command to the response command.
    c = c.replace('?', '');
    if (c[0] == '+') {
        c = 'AT' + c;
    }
    if (c.indexOf('=') > -1) {
        c = c.split('=')[0];
    }
    return c;
};


GSM.prototype._writeCommand = function(buf, timeout, cb) {
    this._clear();
    var that = this;
    var originalBuf = buf;
    if(buf && buf.length > 0 && buf[buf.length-1] != String.fromCharCode(13))
        buf = buf+String.fromCharCode(13);
    //console.log('[GSM] > ', buf.toString());
    clg.debug('[GSM] > ', buf.toString());
    this._sp.write(buf, function(err) {
        that._sp.drain(function() {
            setTimeout(function() {
                that._handleResponse(originalBuf, cb);
            }, timeout);
        });
    });
};


GSM.prototype._writeCommandSequence = function(commands, timeout, cb) {
    var that = this;
    if(typeof timeout === 'function') {
        cb = timeout;
        timeout = null;
    }
    var processCommand = function(err, resp, raw) {
        if(err) return cb(err);
        if(commands.length === 0) return cb(err, resp, raw);
        var command = commands.shift();
        if(Array.isArray(command)) {
            timeout = command[1];
            command = command[0];
        }
        that._writeCommand(command, timeout, processCommand);
    };
    processCommand();
};


GSM.prototype._connect = function(cb, retryCount) {
    var that = this;
    
    if (retryCount >= 3) {
        // console.log('[GSM] Failed to connect to GSM network after ' + retryCount + ' tries.');
        clg.info('[GSM] Failed to connect to GSM network after ' + retryCount + ' tries.');
    }
    
    this._writeCommand('AT', 500, function(err, resp, raw) {
        if (err) {
            // console.log('Error connecting to network.. retrying');
            clg.error('Error connecting to network.. retrying');
            that._connect(cb, retryCount++);
            return;
        }
        // console.log('[GSM] Connected to GSM network');
        clg.info('[GSM] Connected to GSM network');

        clg.debug('[resq]:',resp);
        clg.debug('[raw]:',raw);

        if(resp == 'OK'){
          that.getDeviceInfo(function(err, resp, raw){
              if (err) {
                  // console.log('[GSM] Failed to get device information: ' + err);
                  clg.error('[GSM] Failed to get device information: ' + err);
                  return;
              }
              cb(err);
          }); 
        }else{
          that.powerSwitch();
          // 5秒开机
          setTimeout(function(){
            that.getDeviceInfo(function(err, resp, raw){
              if (err) {
                  // console.log('[GSM] Failed to get device information: ' + err);
                  clg.error('[GSM] Failed to get device information: ' + err);
                  return;
              }
              cb(err);
            }); 
          } ,5000);

        }
     
    });
};


GSM.prototype.connect = function (cb) {
    // console.log('[GSM] Opening connection...' + this._port);
    clg.info('[GSM] Opening connection...' + this._port);
    var that = this;
    // this._sp.open(function(err) {        
    // //     that._sp.on('data', that._handleData.bind(that));    
    // //     that._sp.on('error', that._handleError.bind(that));
    //     if (err) {
    //         cb(err);
    //     }
    // //     that._connect(cb, 0);
    // });
    that._sp.on('open', function(){
      clg.info('serialport opened.');

      that._sp.on('data', that._handleData.bind(that));
      that._sp.on('error', that._handleError.bind(that));

      that._connect(cb, 0);
    });
    
};

// 初始化
GSM.prototype.initialize = function(cb) {
    var that = this;
    clg.info('[GSM] Initializing TCP/IP Socket ...');

    var commands = [];

    // AT+CIPSHUT
    this._writeCommand('AT+CIPSHUT', 5000, function(err, resp, raw){
      if (err) {
          clg.info('[GSM] Error AT+CIPSHUT ...' + err);
          cb(err, resp);
          return;
      }
      // AT+CIPMUX=0
      commands.push('AT+CIPMUX=0');

      // AT+CIPRXGET=1
      commands.push('AT+CIPRXGET=1');

      // // AT+CIPSTART="TCP","horebtech.net",8108
      // commands.push('AT+CIPSTART="TCP","horebtech.net",8108');

      // // AT+CIPSTATUS
      // commands.push('AT+CIPSTATUS');


      that._writeCommandSequence(commands, 1000, function(err, resp, raw){
        
        // // AT+CIPSTART="TCP","horebtech.net",8108
        // var _tcpCmd = 'AT+CIPSTART="TCP","horebtech.net",8108';
        // that._writeCommand(_tcpCmd, 3000, function(err, resp, raw){
        //   if(err){
        //     clg.error('[GSM] Connect TCP Server ...', err);
        //     cb(err, resp);
        //     return;
        //   }

        //   that._writeCommand('AT+CIPSTATUS',500,function(err, resp, raw){
        //     clg.info('[GSM] TCP/IP Setting ...', raw);

        //     that._tcpStatus = raw[2].replace('STATE: ', '');

        //     cb(err, resp, raw);
        //   });

        // });

        // 读取TCP状态
        if(err){
          clg.error('[GSM] Connect TCP Server ...', err);
          cb(err, resp);
          return;
        }

        that._writeCommand('AT+CIPSTATUS',1000,function(err, resp, raw){
          if(err){
            clg.error('[GSM] Connect TCP Server ...', err);
            cb(err, resp);
            return;
          }
          clg.info('[GSM] TCP/IP Setting ...', raw);

          // that._tcpStatus = raw[2].replace('STATE: ', '');

          cb(err, resp, raw);
        });

      });

    });

};

// 读取数据
GSM.prototype.getData = function(cmd, cb){

  var that = this;
  var wmrDate = [];

  // cb([cmd,cmd.length]);
  clg.info('[GSM] Get Data from Server ... ');

  // 连接服务器
  this._writeCommand('AT+CIPSTART="TCP","horebtech.net",8108', 5000, function(err, resp, raw){


    var _sendCmd = 'AT+CIPSEND='+cmd.length;
    that._writeCommand(_sendCmd, 1000, function(err, resp, raw){
      if(err){
        clg.error('[GSM] %s Error:',_sendCmd,err);
        cb(err, resp);
        return;
      }

      if(raw[1]=='>'){
        that._writeCommand('{"cmd":"RDLASTALL"}', 8000, function(err, resp, raw){
          clg.info('[GSM] Data:',JSON.stringify(raw));
          if(raw[2]=='+CIPRXGET: 1'){
            that._writeCommand('AT+CIPRXGET=2,1024', 3000, function(err, resp,items, raw){

              var _data = '';

              for(i=2;i<raw.length-2;i++){
                _data+=raw[i];
              }

              var _bufflen = 0;
              var _buffleft = 0;
              
              var _d = raw[1].replace('+CIPRXGET: ','').split(',');
              _bufflen = parseInt(_d[1]);
              _buffleft = parseInt(_d[2]);

              if(_buffleft>0){
                that._writeCommand('AT+CIPRXGET=2,1024', 3000, function(err, resp, items, raw){
                  for(i=2;i<raw.length-2;i++){
                    _data+=raw[i];
                  }
                  var _d = raw[1].replace('+CIPRXGET: ','').split(',');
                  _bufflen += parseInt(_d[1]);
                  _buffleft = parseInt(_d[2]);     


                  // clg.debug('[GSM] Data (%d:%d:%d):',_bufflen,_buffleft, _data.length,_data.toString());
                  clg.info('[GSM] Read Data OK ...');
                  cb(JSON.parse(_data));

                  // that._writeCommand('AT+CIPSHUT',500,function(err, resp, raw){
                  //   clg.info('[GSM] SHUT DOWN:',raw);
                  // });

                });
              }else{
                // clg.debug('[GSM] Data (%d:%d:%d):',
                //         _bufflen, _buffleft, _data.length, _data.toString());
                clg.info('[GSM] Read Data OK ...');
                cb(JSON.parse(_data));
              }
              

              

              // // zlib 解压缩
              // zlib.inflate( _data, function(err, buffer){
              //   if(!err){
              //     wmrDate = JSON.parse(buffer);
              //     clg.log('zlib data(%s:%s):', JSON.stringify(wmrDate).length, wmrDate.length);
              //     clg.debug('%s', JSON.stringify(wmrDate));
              //   }
              // });

            });
          }
        });
      }
  

      // that._writeCommand('AT+CIPSHUT',2000, function(err, resq, raw){
      //   // that._tcpStatus = 'CONNECT FAIL';
      //   cb(err, resq, raw);
      // });

    });

  });


  // var _sendCmd = 'AT+CIPSEND='+cmd.length;
  // this._writeCommand(_sendCmd, 500, function(err, resp, raw){
  //   if(err){
  //     clg.error('[GSM] %s Error:',_sendCmd,err);
  //     cb(err, resp);
  //     return;
  //   }

  //   if(raw[1]=='>'){
  //     that._writeCommand('{"cmd":"RDLASTALL"}', 8000, function(err, resp, raw){
  //       clg.info('[GSM] Data:',JSON.stringify(raw));
  //       if(raw[2]=='+CIPRXGET: 1'){
  //         that._writeCommand('AT+CIPRXGET=2,1024', 3000, function(err, resp,items, raw){

  //           var _data = '';

  //           for(i=2;i<raw.length-2;i++){
  //             _data+=raw[i];
  //           }

  //           var _bufflen = 0;
  //           var _buffleft = 0;
            
  //           var _d = raw[1].replace('+CIPRXGET: ','').split(',');
  //           _bufflen = parseInt(_d[1]);
  //           _buffleft = parseInt(_d[2]);

  //           if(_buffleft>0){
  //             that._writeCommand('AT+CIPRXGET=2,1024', 3000, function(err, resp, items, raw){
  //               for(i=2;i<raw.length-2;i++){
  //                 _data+=raw[i];
  //               }
  //               var _d = raw[1].replace('+CIPRXGET: ','').split(',');
  //               _bufflen += parseInt(_d[1]);
  //               _buffleft = parseInt(_d[2]);     


  //               isDebug? clg.debug('[GSM] zip Data (%d:%d:%d):',_bufflen,_buffleft, _data.length,_data.toString()):null;

  //               cb(JSON.parse(_data));

  //               // that._writeCommand('AT+CIPSHUT',500,function(err, resp, raw){
  //               //   clg.info('[GSM] SHUT DOWN:',raw);
  //               // });

  //             });
  //           }else{
  //             isDebug? clg.debug('[GSM] zip Data (%d:%d:%d):',
  //                     _bufflen, _buffleft, _data.length, _data.toString()):null;
  //             cb(JSON.parse(_data));
  //           }
            

            

  //           // // zlib 解压缩
  //           // zlib.inflate( _data, function(err, buffer){
  //           //   if(!err){
  //           //     wmrDate = JSON.parse(buffer);
  //           //     clg.log('zlib data(%s:%s):', JSON.stringify(wmrDate).length, wmrDate.length);
  //           //     clg.debug('%s', JSON.stringify(wmrDate));
  //           //   }
  //           // });

  //         });
  //       }
  //     });
  //   }

  // });
  

};

// GSM.prototype._initTCP = function(cb){
//   this._writeCommand('AT+CGCLASS="B"', 500, cb);
// };

GSM.prototype._initGPRS = function(cb) {
    this._writeCommand('AT+SAPBR=1,1', 500, cb);  
};

GSM.prototype.getSignalStrength = function(cb) {
    this._writeCommand('AT+CSQ', 1000, cb);
};

GSM.prototype.close = function(cb) {
    this._sp.close();
};

GSM.prototype.getTcpStatus = function(){
  return this._tcpStatus;
};

GSM.prototype.getDeviceInfo = function(cb) {
    // console.log('[GSM] Getting device information...');
    clg.info('[GSM] Getting device information...');
    var that = this;
    // this.getICCID(function(err, resp, raw) {
    //     if (err) {
    //         cb(err, resp);
    //         return;
    //     }
    //     that.getIMSI(function(err, resp, raw) {
    //         if (err) {
    //             cb(err, resp);
    //             return;
    //         }
    //         cb(err, resp);
    //     });
    // });
    this.getIMEI(function(err, resp, raw){
      if(err){
        cb(err, resp);
        return;
      }
      cb(err,resp);
    });
};


GSM.prototype.getICCID = function(cb) {
    var that = this;
    this._writeCommand('AT+CCID', 1000, function(err, resp, raw) {
        if (err) {
            clg.error('[GSM] Error getting ICCID...' + err);
            cb(err, resp);
            return;
        }
        that._iccid = raw[1];
        clg.info('[GSM] ICCID: ' + raw[1]);
        cb(err, resp, raw[1]);
    });
};

GSM.prototype.getIMSI = function(cb) {
    var that = this;
    this._writeCommand('AT+CIMI', 1000, function(err, resp, raw) {
        if (err) {
            clg.error('[GSM] Error getting IMSI...' + err);
            cb(err, resp);
            return;
        }
        that._imsi = raw[1];
        clg.info('[GSM] IMSI: ' + raw[1]);
        cb(err, resp, raw[1]);
    });
};

GSM.prototype.getIMEI = function(cb) {
    var that = this;
    this._writeCommand('AT+GSN', 1000, function(err, resp, raw) {
        if (err) {
            clg.error('[GSM] Error getting IMSI...' + err);
            cb(err, resp);
            return;
        }
        that._imei = raw[1];
        clg.info('[GSM] IMEI: ' + raw[1]);
        cb(err, resp, raw[1]);
    });
};

GSM.prototype.status = function(cb) {
    this._writeCommand('AT+CREG?', 500, cb);
};



module.exports = GSM;