#!/usr/bin/env node
var exec = require('child_process').exec

var args = process.argv.splice(2);


var GPIO = function(){};

// direction: 'in' or 'out
// port: int, eg. 71
GPIO.prototype.set = function(port,direction, cb) {
  var _cmd = 'echo '+direction+' > /sys/class/gpio/gpio'+port+'/direction';
  // console.log(_cmd);
  _ex(_cmd, cb);

};

GPIO.prototype.open = function(port, cb){
  var _cmd = 'echo '+ port+' > /sys/class/gpio/export';
  _ex(_cmd, cb);
};

GPIO.prototype.close = function(port, cb){
  var _cmd = 'echo '+ port+' > /sys/class/gpio/unexport';
  // console.log(_cmd);
  _ex(_cmd, cb);
};

GPIO.prototype.output = function(port, data, cb){
  var _cmd = 'echo '+data+' > /sys/class/gpio/gpio'+port+'/value';
  // console.log(_cmd);
  _ex(_cmd, cb);
};

GPIO.prototype.input = function(port, cb){
  var _cmd = 'cat /sys/class/gpio/gpio'+port+'/value';
  // console.log(_cmd);
  _ex(_cmd, cb);
};

function _ex(_cmd, cb){
  // var _value;
  exec(_cmd,function(error, stdout, stderr){
    if (error) {
      console.error('exec error:',stderr);
      return;
    }
    // console.log('stderr:',stderr);
    if(typeof cb === 'function'){
      cb(stdout);
    }
  });
};

module.exports = GPIO;

var gpio = new GPIO();

if(args[0] == 'set'){
  if(args[1]){
    if(!args[2]){args[2]='in';}

    gpio.open([args[1]], function(){
      gpio.set(args[1],args[2], function(stdout){
        console.log(stdout);
      });
    });

  }else{
    console.log('Error: Need port number!');
  }
}

if(args[0] == 'unset'){
  if(args[1]){
    // var cmd = 'echo '+args[1]+' > /sys/class/gpio/unexport';
    // console.log(cmd);
    // exec(cmd,function(error, stdout, stderr){
    //   if (error) {
    //     console.error('exec error:',error);
    //     return;
    //   }
    //   // console.log('stderr:',stderr);
    // });

    gpio.close(args[1], function(stdout){
      console.log(stdout);
    });

  }else{
    console.log('Error: Need port number!');
  }
}

if(args[0] == 'out'){
  if(args[1]){
    if(!args[2]){args[2]=0;}
    // var cmd = 'echo '+args[2]+' > /sys/class/gpio/gpio'+args[1]+'/value';
    // console.log(cmd);
    // exec(cmd,function(error, stdout, stderr){
    //   if (error) {
    //     console.error('exec error:',error);
    //     return;
    //   }
    //   // console.log('stderr:',stderr);
    // });

    gpio.output(args[1], args[2], function(stdout){
      console.log(stdout);
    });

  }else{
    console.log('Error: Need port number!');
  }
}

if(args[0] == 'in'){
  if(args[1]){

    // var cmd = 'cat /sys/class/gpio/gpio'+args[1]+'/value';
    // console.log(cmd);
    // exec(cmd,function(error, stdout, stderr){
    //   if (error) {
    //     console.error('exec error:',error);
    //     return;
    //   }
    //   console.log('stdout:',stdout);
    // });

    gpio.input(args[1], function(data){
      console.log(data);
    });

  }else{
    console.log('Error: Need port number!');
  }
}

