/*
  TODO:

  * Implement callbacks for build and rebuild functions
  * Unit tests

  Usage:

    var rawdb = level('raw');
    var db = sublevel(rawdb, 'd');
    var idb = sublevel(rawdb, 'i');
 
    var index = indexer(db, idb);

    index.add('foo', function(key, value) {
      return 'foo'+value.toString();  
    });

    index.get('foo', 'foobar', function(err, key, value) {
      if(err) return console.error(err);
      console.log("key:", key, "value:", value);
    });

*/

var through = require('through2');
var sublevel = require('subleveldown');
var xtend = require('xtend');
var changes = require('./level_changes');

function indexer(db, idb, opts) {
  if(!(this instanceof indexer)) return new indexer(db, idb, opts);

  this.db = db;
  this.idb = sublevel(idb, 'i'); // the index db
  this.rdb = sublevel(idb, 'r'); // the reverse lookup db

  this.opts = xtend({

  }, opts || {});

  this.indexes = {};

  this.c = changes(this.db);
  this.c.on('data', function(change) {
    if(change.type === 'put') {
      this._updateIndexes(change.key, change.value);
    } else { // del
      this._deleteFromIndex(change.key);
    }
  }.bind(this));

  this._updateIndexes = function(key, value) {
    var idx;
    var k;
    for(k in this.indexes) {
      idx = this.indexes[k];
      this._updateIndex(idx, key, value);
    }
  }

  this._updateIndex = function(idx, key, value) {
    if(!idx.f) return;
    
    if(idx.async) {
        idx.f(key, value, function(err, indexKey) {
          if(err) return;
          idx.db.put(indexKey, key);
          idx.rdb.put(key, indexKey);
        })
      } else {
        var indexKey = idx.f(key, value);
        if(indexKey === undefined || indexKey === null) return;
        idx.db.put(indexKey, key);
        idx.rdb.put(key, indexKey);
      }
  }

  this._deleteFromIndex = function(key) {
    var k, idx;
    for(k in this.indexes) {
      idx = this.indexes[k];

      idx.rdb.get(key, function(err, indexKey) {
        if(err) return;
        idx.db.del(indexKey);
        idx.rdb.del(key);
      })
    }
  }

  this.add = function(name, indexFunc, opts) {
    opts = xtend({
      async: false // set to true if indexFunc uses a callback
    }, opts || {});

    if(this.indexes[name]) return new Error("Index already exists");
    this.indexes[name] = {
      f: indexFunc,
      db: sublevel(this.idb, name),
      rdb: sublevel(this.rdb, name), // reverse lookup
      async: opts.async
    };
  }.bind(this);

  this.del = function(name, cb) {
    if(!this.indexes[name]) return new Error("Index does not exist");
    this.indexes[name].f = undefined;
    this.clear(name, function(err) {
      if(err) return cb(err);
      delete this.indexes[name]
      cb();
    }.bind(this))
  }.bind(this);

  // clear an index (delete the index data from the db)
  this.clear = function(name, cb) {
    cb = cb || function(){};
    var db, rdb;
    if(this.indexes[name]) {
      db = this.indexes[name].db;
      rdb = this.indexes[name].rdb;
    } else {
      db = sublevel(this.idb, name);
      rdb = sublevel(this.rdb, name);
    }

    // delete entire index
    var s = db.createReadStream();
    s.pipe(through.obj(function(data, enc, next) {
      db.del(data.key, function() {
        next();
      });
    }, function() {
      // delete entire reverse lookup index
      var rs = db.createReadStream();
      rs.pipe(through.obj(function(data, enc, next) {
        rdb.del(data.key, function() {
          next();
        });
      }, function() {
        cb();
      }));

      rs.on('error', function(err) {
        return cb(err);
      });
    }));

    s.on('error', function(err) {
      return cb(err);
    });

  }.bind(this);

  // clear all indexes (delete the index data from the db)
  this.clearAll = function(cb) {
    cb = cb || function(){};
    // TODO
  }.bind(this);

  // build an index from scratch for existing contents of the db
  this.build = function(indexName) {

    var idx = this.indexes[indexName];
    if(!idx) throw new Error("Index does not exist");

    var s = this.db.createReadStream();
    s.on('data', function(data) {
      this._updateIndex(idx, data.key, data.value);
    }.bind(this));

    s.on('error', function(err) {
//      return cb(err);
    });

    s.on('end', function() {
//      return cb();
    });
  }.bind(this);

  // build all indexes from scratch for existing contents of the db
  this.buildAll = function(cb) {
    var idx;
    var k;
    for(k in this.indexes) {
      this.build(k);
    }
  }.bind(this);

  // clear and then build an index from scratch for existing contents of the db
  this.rebuild = function(name) {
    this.clear(name, function(err) {
      if(err) return;

      this.build(name);

    }.bind(this));
  }.bind(this);

  // clear and then build all indexes from scratch for existing contents of the db
  this.rebuildAll = function(name) {
    var idx;
    var k;
    for(k in this.indexes) {
      this.rebuild(k);
    }    
  }.bind(this);

  this.get = function(indexName, indexKey, cb) {
    var idx = this.indexes[indexName];
    if(!idx) return cb(new Error("Index does not exist"));

    idx.db.get(indexKey, function(err, key) {
      if(err) return cb(err);
      this.db.get(key, function(err, value) {
        if(err) return cb(err);
        cb(null, key, value);
      });
    }.bind(this));
  }.bind(this);

  this.createReadStream = function(indexName) {
    var idx = this.indexes[indexName];
    if(!idx) return cb(new Error("Index does not exist"));

    var out = through.obj(function(obj, enc, next) {
      idx.db.get(obj.key, function(err, value) {
        if(err) return next(err);
        this.push({key: obj.key, value: value});
        next();
      }.bind(this));
    });
    
    idx.db.createReadStream().pipe(out);
    return out;

  }.bind(this);

}

module.exports = indexer;
