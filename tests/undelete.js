var uuid = require('uuid').v4;
var connect = require('./common/connect.js');
var test = require('tape')

/*
  Test basic delete and undelete of a single physical.
*/

test('undelete', function (t) {
  
  t.plan(1)

  connect(function(err, done, remote, userData, token) {
    if(err) throw err;

    remote.clearDeleted(function(err) {
      if(err) throw err;

      console.log("Cleared deleted db");

      remote.savePhysical({
        
        name: uuid()
        
      }, null, false, function(err, id) {
        if(err) throw err;
        
        console.log("Saved physical with ID:", id);

        remote.delPhysical(id, function(err) {
          if(err) throw err;
          
          console.log("Deleted physical with ID:", id);
          
          var s = remote.listDeleted();
          var latest;
          s.on('data', function(data) {
            latest = data;
          });
          
          s.on('end', function() {
            if(!latest) return console.error("Deleted physical successfully but undelete database is empty!");

            remote.undelete(latest.key, function(err) {
              if(err) throw err;
              
              console.log("Undeleted:", latest.value.data.id);
              
              remote.get(latest.value.data.id, function(err, o) {
                if(err) throw err;
                
                t.equal(o.id, latest.value.data.id, "Undeleted physical");
                
                done();

              });
            });
          });
        });
      });
    });
  });
});


/*

*/
