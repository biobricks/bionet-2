var Readable = require('stream').Readable;

var uuid = require('uuid').v4;
var async = require('async');
var through = require('through2');
var rpc = require('rpc-multistream'); // rpc and stream multiplexing

function del(curUser, db, dbName, key, cb) {
  if(!dbName || dbName === 'user' || dbName === 'index') return cb(new Error("not allowed"));
  if(!db[dbName]) return cb(new Error("database '"+dbname+"' does not exit"));
  if(!key) return cb(new Error("Missing key"));
  
  key = db.translateKey(key, db[dbName]);
    
  db.db.get(key, function(err, o) {
    if(err) return cb(err);
    console.log("GOT HERE!");
    var now = (new Date).getTime();
    var dKey = (Number.MAX_SAFE_INTEGER - now).toString() + uuid();
        console.log("GOT HERE! 2");
    db.deleted.put(dKey, {
      db: dbName,
      key: key,
      deletedAt: now,
      deletedBy: curUser.user.email,
      data: JSON.parse(o)
    }, function(err) {
    console.log("GOT HERE! 3");
      if(err) return cb(err);
      
      db.db.del(key, cb);
      
    });
  });
}

module.exports = function(settings, users, accounts, db, index, mailer, p2p) { 

  return {
    secret: function(curUser, cb) {
      cb(null, "Sneeple are real!");
    },

    // TODO remove this when implementing private data
    testStream: rpc.syncReadStream(function() {

      return db.physical.createReadStream();
    }),

    // get user's workbench physical
    getWorkbench: function(curUser, cb) {
      if(!curUser.user.workbenchID) return cb(new Error("User workbench missing"));

      db.physical.get(curUser.user.workbenchID, cb);
    },

    workbenchTree: function(curUser, cb) {
      if(!curUser.user.workbenchID) return cb(new Error("User workbench missing"));

      index.inventoryTree.childrenFromKey(curUser.user.workbenchID, cb);
    },

    // get user's workbench physical
    getFavLocations: function(curUser, cb) {
      if(!curUser.user.favLocationsID) return cb(new Error("User favorite locations missing"));

      db.physical.get(curUser.user.favLocationsID, cb);
    },

    favLocationsTree: function(curUser, cb) {
      if(!curUser.user.favLocationsID) return cb(new Error("User favorite locations missing"));

      index.inventoryTree.childrenFromKey(curUser.user.favLocationsID, function(err, children) {
        if(err) return cb(err);

        var out = [];

        async.eachSeries(children, function(child, cb) {
          if(!child.value.material_id) return cb();

          db.physical.get(child.value.material_id, function(err, m) {
            if(err) { // if the physical no longer exists, remove the favorite
              return db.physical.del(child.value.material_id, function(err) {
                cb();
              })
            }
            out.push({
              favorite: child.value,
              material: m
            });
            cb();
          });
        }, function(err) {
          if(err) return cb(err);
          cb(null, out);
        })
      });
    },

    saveFavLocation: function(curUser, m, imageData, doPrint, cb) {
      if(!curUser.user.favLocationsID) return cb(new Error("User favorite locations missing"));
      
      m.parent_id = curUser.user.favLocationsID;
      
      db.saveMaterial({
        type: '_ref',
        name: '_ref_' + uuid(),
        parent_id: curUser.user.favLocationsID,
        material_id: m.id
      }, curUser, 'p', cb);
    },

    
    getChildren: function(curUser, id, cb) {
      index.inventoryTree.childrenFromKey(id, cb);
    },
    
    saveInWorkbench: function(curUser, m, imageData, doPrint, cb) {
      if(!curUser.user.workbenchID) return cb(new Error("User workbench missing"));
      
      if (Array.isArray(m)) {
        for (var i = 0; i < m.length; i++) {
          m[i].parent_id = curUser.user.workbenchID;
          db.savePhysical(curUser, m[i], imageData, doPrint, cb);
        }
      } else {
        m.parent_id = curUser.user.workbenchID;
        db.savePhysical(curUser, m, imageData, doPrint, cb);
      }
    },

    getID: function(curUser, cb) {
      db.idGenerator.next(cb);
    },

    listDeleted: rpc.syncReadStream(function(curUser) {
      return db.deleted.createReadStream();
    }),

    // really delete all the deleted stuff
    clearDeleted: function(curUser, cb) {
      var s = db.deleted.createKeyStream();

      var d = through.obj(function(key, enc, next) {
        db.deleted.del(key, next);
        console.log("AAAAA");
      })
      s.pipe(d);

      d.on('data', function(data) {
        console.log("DAAAAAAAATAAAAAA");
      });

      d.on('end', cb);
      d.on('error', cb);
    },
    
    undelete: function(curUser, key, cb) {

      db.deleted.get(key, function(err, o) {
        if(err) return cb(err);
        if(!o.key) return cb(new Error("Unable to undelete: Original key missing."))
        // TODO check if a physical already exists with this name
        console.log("UNDELETING:", o);
        db.db.put(o.key, JSON.stringify(o.data), function(err) {
          if(err) return cb(err);
          
          db.deleted.del(key, cb);
        });
      });
    },

    delPhysical: function(curUser, id, cb) {
      console.log('delPhysical:',id);
      del(curUser, db, 'physical', id, cb);
    },

    physicalAutocomplete: function(curUser, query, cb) {

      query = query.trim().toLowerCase();
      var a = [];

      // TODO this is a super inefficient way of autocompleting
      var s = db.physical.createReadStream();
      
      s.on('data', function(data) {
        if(!data.value.name.toLowerCase().match(query)) return;
        if(data.value.hidden) return; // skip hidden physicals

        a.push(data.value);
      });

      s.on('error', function(err) {
        return cb(err);
      });

      s.on('end', function() {
        return cb(null, a);
      });

    },

    // add a physical to user's cart
    addToCart: function(curUser, physical_id, name, cb) {
      
      var o = {
        user: curUser.user.email,
        physical_id: physical_id,
        created: db.unixEpochTime()
      }
      
      var ucDB = db.userCart(o.user);
      
      // TODO is it too dangerous to use the physical's name as a key here?
      // they should be unique, but are we really ensuring that?
      ucDB.put(name, o, cb);
    },
    
    // stream a user's cart
    cartStream: rpc.syncReadStream(function(curUser, cb) {
      
      const cartStream = Readable({ objectMode: true });
      cartStream._read = function() {}

      var ucDB = db.userCart(curUser.user.email);
      var s = ucDB.createReadStream();

      // TODO 
      // It would be much more efficient if we simply cached the
      // path info and the whole physical object in the cart db
      // but then it might become out of sync with the real location.
      // Probably better to play it safe for now and optimize later.

      var out = s.pipe(through.obj(function(data, enc, next) {
        if(!data || !data.value || !data.value.physical_id) return next();
        
        db.physical.get(data.value.physical_id, function(err, o) {
          if(err) {
            if(err.notFound) return next();
            return cb(err);
          }
            cartStream.push({
              physical: o,
              path: {}
            })
            next();
        });
      }));

      s.on('close', function() {
        cb();
      });

      out.on('error', function(err) {
        cb(err);
        console.error("cart stream error:", err);
      });
      
      return cartStream;
    }),

    delFromCart: function(curUser, physical_id, cb) {
      var ucDB = db.userCart(curUser.user.email);

      db.physical.get(physical_id, function(err, o) {
        if(err) return cb(err);

        ucDB.del(o.name, cb)
      });
    },

    emptyCart: function(curUser, cb) {
      var ucDB = db.userCart(curUser.user.email);
      var s = ucDB.createKeyStream();

      var out = s.pipe(through.obj(function(key, enc, next) {
        
        ucDB.del(key, function(err) {
          if(err) return cb(err);
          next();
        })

      }));
      
      s.on('close', function() {
        cb();
      });
      
      out.on('error', function(err) {
        cb(err);
      });
    },
    
    getType: function(curUser, name, cb) {
      name = name.toLowerCase().trim().replace(/\s+/g, ' ')
      process.nextTick(function() {
        var i;
        for(i=0; i < settings.dataTypes.length; i++) {
          if(settings.dataTypes[i].name === name) {
            cb(null, settings.dataTypes[i]);
            return;
          }
        }
        var err = new Error("No type with the specified name exists");
        err.notFound = true;
        cb(err);
      })
    },

    createAutocomplete: function(curUser, type, q, cb) {
      var results = {
        types: [],
        virtuals: []
      };
      if(!q) return cb(null, results);
      q = q.toLowerCase().trim()

      if(!q.length) return cb(null, results);

      q = q.replace(/\s+/g, '.*')
      q = new RegExp(q);

      // type not already specified so return type hits
      if(!type) {
        var i;
        for(i=0; i < settings.dataTypes.length; i++) {
          if(settings.dataTypes[i].name.match(q)) {
            results.types.push(settings.dataTypes[i]);
          }
        }
      } else {
        type = type.name.toLowerCase().trim()
      }
      
      var s = db.virtual.createReadStream({valueEncoding: 'json'});
      
      var out = s.pipe(through.obj(function(data, enc, cb) {

        if((data.value.name && data.value.name.toLowerCase().match(q))) {
          if(!type || (type && data.value.type === type)) {
            if(results.virtuals.length <= 10) {
              results.virtuals.push(data.value) 
              if(results.virtuals.length >= 10) {
                s.destroy();
                return;
              }
            }
          }
        }
        cb()
      }));

      s.on('close', function() {
        cb(null, results);
      });

      out.on('end', function() {
      });
      
      out.on('error', function(err) {
        cb(err); // TODO handle better
        console.error("search stream error:", err);
      });
    },

    saveVirtual: function(curUser, m, cb) {
      console.log('saveVirtual, m=',JSON.stringify(m))
      db.saveMaterial(m, curUser, 'v', function(err, id) {
        if(err) return cb(err);
        
        return cb(null, id);
      });
    },

    savePhysical: function(curUser, m, imageData, doPrint, cb) {
      db.savePhysical(curUser, m, imageData, doPrint, cb);
    },

    elasticSearch: function(curUser, query, cb) {

      index.elastic.search('name', {
        query: {
          "match_phrase_prefix": {
            "name": {
              "query": query
            }
          }
        }}, function(err, result) {

          if(err) return cb(err);

          cb(null, result.hits.hits);
        });
      
    },

    // get the entire physical inventory tree
    // TODO implement a server side filter for the physicals tree
    inventoryTree: function(curUser, cb) {
      index.inventoryTree.children(null, {
        ignore: function(obj) {
          // ignore paths with parts beginning with _
          var pathParts = obj.path.split('.');
          var i;
          for(i=0; i < pathParts.length; i++) {
            if(pathParts[i].match(/^_/)) {
              return true;
            }
          }
          return false;
        }
      }, cb);
    },

    // get all physical instances of a virtual
    // TODO create an index for this
    instancesOfVirtual: function(curUser, virtual_id, cb) {
      var results=[];
      var s = db.physical.createReadStream({
        valueEncoding: 'json'
      });
      var out = s.pipe(through.obj(function(data, enc, next) {
        if(!data || !data.value || !data.value.virtual_id) return next()

        if(data.value.virtual_id === virtual_id) {
          results.push(data.value);
        }
        next();
      }));
      
      s.on('close', function() {
        cb(null,results);
      });
      
      out.on('error', function(err) {
        cb(err);
        console.error("instancesofvirtual error:", err);
      });
      
      return out;
    },

    getLocationPath: function (curUser, id, cb) {
      
      if (id[0] !== 'p') {
        cb(new Error("getLocationPath only works for physicals"));
      }
      
      var curdb = db.physical;
      var results = [];

      // TODO this should be done with the level-tree-index API
      var getParentLocation = function (id) {
        curdb.get(id, {
          valueEncoding: 'json'
        }, function (err, p1) {
          if (err) {
            return cb(err, null);
          }
          results.push(p1);
          if (p1.parent_id) {
            getParentLocation(p1.parent_id);
          } else {
            return cb(null, results);
          }
        });
      }
      getParentLocation(id);
    },
    
    get: function(curUser, id, cb) {
      var first = id[0];
      var curdb;
      if(first === 'p') {
        curdb = db.physical;
      } else if(first === 'v') {
        curdb = db.virtual;
      } else {
        return cb(new Error("Unknown material class"));
      }
      curdb.get(id, {valueEncoding: 'json'}, function(err, p) {
        if(err) return cb(err);
        cb(null, p);
      });
    },

    // TODO use indexes for this!
    getByHumanID: function(curUser, humanID, cb) {

      var s = db.bio.createReadStream({valueEncoding: 'json'});
      var found = false;
      var out = s.pipe(through.obj(function(data, enc, next) {
        if(!data || !data.value || !data.value.label) return next()

        if(data.value.label.humanID == humanID) {
          found = true;
          cb(null, data.value);
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
    },
    
    // TODO use indexes for this
    getVirtualBy: function(curUser, field, value, cb) {

      var s = db.virtual.createReadStream({valueEncoding: 'json'});
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
    },

    // TODO use indexes for this!
    getBy: function(curUser, field, value, cb) {
      return db.getBy(field, value, cb);
    },

    // TODO doesn't work
    recentChanges: rpc.syncReadStream(function() {
      var s = recentDB.createReadStream({valueEncoding: 'utf8'});

      var count = 0;
      var out = s.pipe(through(function(data, enc, cb) {

        db.bio.get(data.value, function(err, p) {
          if(!err && p) {
            this.push(JSON.stringify(p));
            count++;
          }
          if(count < 50) {
            cb();
          }
        }.bind(this));
      }));
      
      out.on('error', function(err) {
        // TODO handle
        console.error("recent changes stream error:", err);
      });
      return out;
    }),

    search: function(curUser, q, cb) {
      console.log("CALLED SEARCH:", q);
      var s = db.bio.createReadStream({valueEncoding: 'json'});

      var ret = [];

      var out = s.pipe(through.obj(function(data, enc, next) {
        if((data.value.name && data.value.name.toLowerCase().match(q.toLowerCase())) || (data.value.description && data.value.description.toLowerCase().match(q.toLowerCase()))) {
          // skip stuff beginning with underscore
          if(data.value.name && data.value.name[0] === '_') {
            return;
          }
          // this.push(data.value);
          ret.push(data.value);
        }
        
        next();
      }));
      
      s.on('error', function(err) {
        cb(err);
      });
      s.on('end', function() {
        console.log("SENDING:", ret);
        cb(null, ret);
      });
    },

    // get a list of connected peers
    getPeers: function(curUser, cb) {
      if(!p2p) return cb(new Error("p2p not supported by this node"));

      process.nextTick(function() {
        cb(null, p2p.connector.peers);
      });
    },

    // TODO switch to using a stream as output rather than a callback
    peerSearch: function(curUser, query, cb) {
      if(!p2p) return cb(new Error("p2p not supported by this node"));

      function onError(err) {
        // do we really care about remote errors? probably not
      }

      // for each connected peer
      p2p.connector.peerDo(function(peer, next) {

        // run a streaming blast query
        var s = peer.remote.searchAvailable(query);

        s.on('error', onError);

        s.on('data', function(data) {
          cb(null, {
            id: peer.id,
            name: peer.name,
            position: peer.position,
            distance: peer.distance
          }, data);
        });

        // TODO time out the search after a while

        next();

      }, function(err) {
        if(err) return cb(err);
      });
    },

    // TODO switch to using a stream as output rather than a callback
    peerBlast: function(curUser, query, cb) {
      var streams = [];

      function onError(err) {
        // do we really care about remote errors? probably not
      }

      function onResult(peerInfo, result) {
        cb(peerInfo, result);
      }

      if(index.blast) {
        streams.push({
          stream: index.blast.query(query)
        });
      }

      // for each connected peer
      peerConnector.peerDo(function(peer, next) {

        // run a streaming blast query
        var s = peer.remote.blast(query)

        s.on('error', onError);

        s.on('data', function(data) {
          cb(null, peer.info, data);
        });
        streams.push(s);

        next();

      }, function(err) {
        if(err) return cb(err);
      });
    },

    requestMaterial: function(curUser, peerID, id, cb) {
      if(!p2p) return cb(new Error("Node does not support p2p"));
      var peer = p2p.connector.peers[peerID];
      if(!peer || !peer.remote) return cb(new Error("No such peer: "+peerID));

      peer.remote.requestMaterialRemote(id, curUser.user.email, settings.physicalAddress, cb);
    }

  };
}
