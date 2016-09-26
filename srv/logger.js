// ---------------------------------
// simple colors logs
// Samuel Gao @ Shanghai
// horebtech.com
// ver: 0.1
// ---------------------------------
var colors = require('colors');
var util = require('util');

// Define logger
// set theme
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

var CLG = function (){

};

CLG.prototype.log = function(format){
		var _t = '['+new Date().toLocaleString()+']';
		var _s = _t + ' <LOG> ' + format;
		for(var i=1; i<arguments.length; i++){
			_s = util.format(_s, arguments[i]);
		}
		console.log(_s);
};


CLG.prototype.debug = function(format){
  var _t = '['+new Date().toLocaleString()+']';
  var _s = _t+' '+colors.yellow('<DEBUG>')+' '+colors.data(format);
  for(var i=1; i<arguments.length; i++){
    _s = util.format(_s, arguments[i]);
  }
  console.log(_s);
};

CLG.prototype.error = function(format){
  var _t = '['+new Date().toLocaleString()+']';
  var _s = _t+colors.error(' <ERROR> '+format);
  for(var i=1; i<arguments.length; i++){
    _s = util.format(_s, arguments[i]);
  }
  console.error(_s);
};

CLG.prototype.warn = function(format){
  var _t = '['+new Date().toLocaleString()+']';
  var _s = _t+colors.warn(' <WARN> '+format);
  for(var i=1; i<arguments.length; i++){
    _s = util.format(_s, arguments[i]);
  }
  console.error(_s);
};

CLG.prototype.info = function(format){
  var _t = '['+new Date().toLocaleString()+']';
  var _s = _t+colors.info(' <INFO> '+format);
  for(var i=1; i<arguments.length; i++){
    _s = util.format(_s, arguments[i]);
  }
  console.error(_s);	
};


// // define logger
// var clg = {


// 	log:function(format){
// 		var _t = '['+new Date().toLocaleString()+']';
// 		var _s = _t + ' <LOG> ' + format;
// 		for(var i=1; i<arguments.length; i++){
// 			_s = util.format(_s, arguments[i]);
// 		}
// 		console.log(_s);
// 	},

// 	error:function(format){
// 		var _t = '['+new Date().toLocaleString()+']';
// 		var _s = _t+colors.error(' <ERROR> '+format);
// 		for(var i=1; i<arguments.length; i++){
// 			_s = util.format(_s, arguments[i]);
// 		}
// 		console.error(_s);
// 	},

// 	warn:function(format){
// 		var _t = '['+new Date().toLocaleString()+']';
// 		var _s = _t+colors.warn(' <WARN> '+format);
// 		for(var i=1; i<arguments.length; i++){
// 			_s = util.format(_s, arguments[i]);
// 		}
// 		console.error(_s);
// 	},

// 	info:function(format){
// 		var _t = '['+new Date().toLocaleString()+']';
// 		var _s = _t+colors.info(' <INFO> '+format);
// 		for(var i=1; i<arguments.length; i++){
// 			_s = util.format(_s, arguments[i]);
// 		}
// 		console.error(_s);	
// 	},
// };

module.exports = CLG;