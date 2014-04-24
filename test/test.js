var test = require('tape');
var batch = require('../')

test("can handle data",function(t){

  var len = 0;
  var batches = 0;
  var s = batch({wait:5}).on('data',function(batch){
    batches++;
    len += batch.length;

    console.log('data',batch);
  }).on('end',function(){
    
    console.log('batches:',batches);
    console.log('data:',len);

    t.equals(len,100,'should have had 100 data events in all batches');
    t.ok(batches < 50 && batches > 20,'should have an good number of batches');
    t.end();

  });

  var i = 0;
  var timer = setInterval(function(){
    s.write(++i);
    if(i == 100) {
      clearTimeout(timer);
      console.log('calling end!');
      s.end();
    }
  },1);

})

