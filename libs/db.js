
var fs = require('fs');
var path = require('path');
var level = require('level'); // leveldb database
var sublevel = require('subleveldown'); // leveldb multiplexing
var through = require('through2');
var IDGenerator = require('../libs/id_generator.js'); // atomically unique IDs
var labDeviceServer = require('../libs/lab_device_server.js');
var uuid = require('uuid').v4;

module.exports = function(settings, users, acccounts) {

  var sep = '!';

  var db = level(settings.dbPath || './db');
  var userDB = sublevel(db, 'u', {separator: sep, valueEncoding: 'json'});
  var indexDB = sublevel(db, 'i', {separator: sep});

  // TODO is miscDB and idGenerator even used?
  var miscDB = sublevel(db, 'm', {separator: sep});
  var idGenerator = new IDGenerator(miscDB);

  var bioDB = sublevel(db, 'b', {separator: sep});
  var virtualDB = sublevel(bioDB, 'v-', {separator: sep, valueEncoding: 'json'});
  var physicalDB = sublevel(bioDB, 'p-', {separator: sep, valueEncoding: 'json'});
  var cartDB = sublevel(bioDB, 'c-', {separator: sep, valueEncoding: 'json'});

  var deletedDB = sublevel(bioDB, 'd-', {separator: sep, valueEncoding: 'json'});

  // Take a key from one sublevel db and add or remove prefixes
  // to make it usable in another sublevel db that is a parent or child
  // If dbTo is not specified then the highest leveldb (no sublevels) is assumed
  function translateKey(key, dbFrom, dbTo) {
    if(!dbTo) dbTo = db;
    console.log("AAAA", dbFrom);
    console.log("BBBB", dbTo);
    if(!dbFrom.db.prefix && !dbTo.db.prefix) throw new Error("Either the database has not finished initializing or neither of the specified DBs are sublevels");

    var fromPrefix = dbFrom.db.prefix || '';
    var toPrefix = dbTo.db.prefix || '';

    // going to a deeper level
    if(toPrefix.indexOf(fromPrefix) === 0) {

      var diff;
      if(fromPrefix) {
        diff = toPrefix.slice(fromPrefix.length);
      } else {
        diff = toPrefix;
      }

      if(key.indexOf(diff) !== 0) {
        throw new Error("key is not part of destination sublevel");
      }
      
      return key.slice(diff.length);


    // going to a higher level
    } else if(!toPrefix || fromPrefix.indexOf(toPrefix) === 0) {

      var diff;
      if(toPrefix) {
        diff = fromPrefix.slice(toPrefix.length);
      } else {
        diff = fromPrefix;
      }

      return diff + key;

    // going to the same level (do nothing)
    } else if(fromPrefix === toPrefix) {

      return key;

    } else {

      throw new Error("The specified DBs have neither a descendant nor ancestor relationship");
    }
  }

  function ensureUserData(users, user, accounts, cb) {
    
    function ensureWorkbench(user, cb) {
      if(user.workbenchID) {
        process.nextTick(function() {
          cb(null, user, false);
        });
        return;
      }

      saveMaterialInDB({
        type: 'workbench',
        name: '_workbench-'+uuid(),
        hidden: true
      }, {user: user}, 'p', function(err, id) {
        if(err) return cb(err);
        
        // associate workbench with user
        user.workbenchID = id;

        cb(null, user, true);
      });
    }

    function ensureFavLocations(user, cb) {
      if(user.favLocationsID) {
        process.nextTick(function() {
          cb(null, user, false);
        });
        return;
      }

      saveMaterialInDB({
        type: 'fav_locations',
        name: '_fav_locations-'+uuid(),
        hidden: true
      }, {user: user}, 'p', function(err, id) {
        if(err) return cb(err);
        
        // associate favorite locations physical with user
        user.favLocationsID = id;

        cb(null, user, true);
      });
    }

    ensureWorkbench(user, function(err, user, changed1) {
      if(err) return cb(err);

      ensureFavLocations(user, function(err, user, changed2) {
        if(err) return cb(err);

        if(!changed1 && !changed2) {
          return cb(null, user);
        }

        accounts.update(users, user, function(err) {
          if(err) return cb(err);

          cb(null, user);
        });
      });
    })
  }

  // generate unix epoch time for n days from now
  // call with no arguments for now
  function unixEpochTime(days) {
    days = days || 0;
    return Math.floor((new Date((new Date).getTime() + days * 24 * 60 * 60 * 1000)).getTime()/1000);
  }

  labDeviceServer.start(settings, function(err) {
    if(err) return console.error(err);

    console.log("Lab device server started");
  });


  function changeInfo(userData) {
    return {
      user: userData.user.email,
      time: unixEpochTime()
    };
  }

  function saveMaterialInDB(m, userData, dbType, cb) {
    if(!m.name || !m.name.trim()) return cb("Name must be specified");

    idGenerator.getCur(function(err, curID) {
      if(err) return cb(err);

      m.id = m.id || dbType+'-'+uuid();

      var db;
      if(dbType === 'v') {
        db = virtualDB;
      } else if(dbType === 'p') {
        db = physicalDB;
      }

      var c = changeInfo(userData);
      m.created = m.created || c;
      m.updated = c;

      if(settings.debug) {
        console.log("Saving to bioDB. Key:", m.id, "Value:", m);
      }

      db.put(m.id, m, {valueEncoding: 'json'}, function(err) {
        if(err) return cb(err);

        cb(null, m.id);

      });
    })
  }

  function userCartDB(userID) {
    return sublevel(cartDB, userID, {valueEncoding: 'json'});
  }


  // TODO use indexes
  function getBy(field, value, cb) {

    var s = bioDB.createReadStream({valueEncoding: 'json'});
    var found = false;
    var out = s.pipe(through.obj(function(data, enc, next) {
      if(!data || !data.value || !data.value[field]) return next()
      if(data.value[field] == value) {
        found = true;
        cb(null, data.value);
        s.destroy();
      } else {
        next();
      }
    }));
    
    s.on('end', function() {
      if(!found) {
        found = true;
        cb(null, null);
      }
    });

    s.on('error', function(err) {
      if(!found) {
        found = true;
        cb(err);
      }
    });
  }


  function savePhysical(curUser, m, imageData, doPrint, cb, isUnique) {
    console.log("savePhysical", m, imageData, doPrint);
    if(!m.id && !isUnique) { // if no id then this is a new physical

      // check for name uniqueness
      getBy('name', m.name, function(err, value) {
        if(err) return cb(err);
        if(value) {
          return cb(new Error("Another physical is already named: " + m.name));
        } 
        savePhysical(curUser, m, imageData, doPrint, cb, true);
      });
      return;
    }

    // if a container is specified by name
    if(m.selectContainer) {
      // check for name uniqueness
      //getBy('name', m.name, function(err, value) {
      getBy('name', m.selectContainer, function(err, value) {
        if(err) return cb(err);
        if(!value) {
          if(m.parent_id) {
            savePhysical(curUser, m, imageData, doPrint, cb, true);
            return;
          }
          return cb(new Error("No valid container specified"));
        }
        if(m.id === value.id) {
          return cb(new Error("Physical cannot contain itself"));
        }
        
        delete m.selectContainer;
        m.parent_id = value.id;

        savePhysical(curUser, m, imageData, doPrint, cb, true);
      });

      return;
    }
      
    /* skipping test for container altogether
    if(!m.parent_id&&m.type!=='lab') {
      return cb(new Error("No container specified"));
    }
    */

    var mtch;
    if(imageData && (mtch = imageData.match(/^data:image\/png;base64,(.*)/))) {

      var imageBuffer = new Buffer(mtch[1], 'base64');
      // TODO size check
      var imagePath = path.join(settings.labDevice.labelImageFilePath, m.id+'.png')
      fs.writeFile(imagePath, imageBuffer, function(err) {
        if(err) return cb(err);

        m.labelImagePath = imagePath; 
        delete m.hidden; // don't allow users to create hidden physicals
        if(m.name && m.name[0] === '_') return cb(new Error("Name cannot begin with an underscore")); // if name begins with an underscore than these are hidden from the normal tree index output

        saveMaterialInDB(m, curUser, 'p', function(err, id) {
          if(err) return cb(err);
          if(!doPrint) return cb(null, id);

          var relativePath = path.relative(settings.labDevice.labelImageFilePath, imagePath);

          labDeviceServer.printLabel(relativePath);
          console.log("relative path:", relativePath);
          cb(null, id);
        });
        console.log("saved with file", imagePath);
      });
    } else {
      saveMaterialInDB(m, curUser, 'p', cb);
      console.log("saved with no file");
    }

    console.log("saving:", m);
  }

  function createInitialLab(cb) {
    cb = cb || function(){};

    var count = 0;
    var stream = physicalDB.createReadStream({limit: 1});

    stream.on('data', function(data) {
      count++;
      stream.destroy();
      cb();
    });

    stream.on('end', function() {
      if(count) return;

      var m = {
        id: 'p-' + uuid(),
        name: settings.lab,
        type: 'lab'
      };
      
      physicalDB.put(m.id, m, {valueEncoding: 'json'}, function(err) {
        if(err) return console.error("Creating initial lab failed");

        console.log("Created initial lab");
        cb();
      });
    });
  }
  

  function init(cb) {
    createInitialLab(cb);
  }

  return {
    db: db,
    user: userDB,
    index: indexDB,
    bio: bioDB,
    virtual: virtualDB,
    physical: physicalDB,
    deleted: deletedDB,

    // functions
    idGenerator: idGenerator,
    saveMaterial: saveMaterialInDB,
    savePhysical: savePhysical,
    userCart: userCartDB,
    unixEpochTime: unixEpochTime,
    ensureUserData: ensureUserData,
    getBy: getBy,
    translateKey: translateKey,
    init: init

  }

}
