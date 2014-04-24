var through = require('through');
var avgstream = require('avg-stream');

module.exports = function(onbatch,options){

  if(typeof onbatch !== 'function'){
    options = onbatch;
    // use this onbatch function to concat buffers or aggregate objects
    onbatch = function(batchArray){
      this.queue(batchArray);
    }
  }

  options = options||{};

  var wait = options.wait||1000;// any time the write rate is < a second every write will imediately be written. 
                                // if it gets faster it will buffer only if it wont go over the wait time based on the time since last write and the current average write rate.
                                // if i dont expect an event to come in time i might as well send it now.
  var size = options.size||10000;// if you have an object stream you may want to make this fewer.

  var buf = [];
  var bufLen = 0;

  var first = true;
  var lastWrite = 0;
  var lastData = Date.now();
  var avgWriteRate = avgstream(20);
  var rate = 0;
  var timer;

  avgWriteRate.on('data',function(num){
    rate = num;
  })

  var handle = function(flush){
    if(!buf.length) return;
    if(bufLen >= size) {
       flush = true;
    } 

    var t = Date.now();
    if(rate+(t-lastWrite) >= wait) {
      flush = true;
    }

    if(!flush) return;

    var b = buf;
    s.floodBuf = buf = [];
    bufLen = 0;
    clearTimeout(timer);
    timer = false;

    if(options.stats) {
      if(first) {
        b.delay = 0 ;
        first = false;
      } else b.delay = t-lastWrite;
      b.rate = rate; 
    }

    lastWrite = t;
    s.onbatch(b);
    return true;
  }

  var s = through(function(data){
    buf.push(data);
    bufLen += data.length||1;
    
    var t = Date.now();

    avgWriteRate.write(t-lastData);
    s.rate = rate;

    lastData = t;
    if(!handle()){
      var towait = wait-(t-lastWrite);
      if(towait < 0) towait = 0;
      timer = setTimeout(function(){
        handle();
      },towait)
    }
  },function(){
    handle(true);
    this.queue(null);
  });

  s.flush = function(){
    handle(true);
  };

  s.rate = 0;
  s.onbatch = onbatch;
  s.floodBuf = buf;
  
  return s;
}

