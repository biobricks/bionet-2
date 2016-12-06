
/* 
  A tree structure index for leveldb

  If you reference every value in your leveldb to its parent, e.g. by setting value.parentKey to the key of the parent, then level-tree-index will keep track of the full path for each value and allow you to look up parents and children and stream the entire tree or a part thereof.

  This is useful for implementing e.g. nested comments.

  level-tree-index works for all keyEncodings and works automatically for the json valueEncoding and for other valueEncodings if you provide custom functions for the opts.pathProp and opts.parentProp options. level-tree-index works equally well with string and buffer paths.

  Note that level-tree-index has no way to delay operations on your database, so when you run e.g. a .put on your database then you cannot expect the tree index to immediately be up to date. It wouldn't be too difficult to add .put, .del and .batch functions to level-tree-index that pass through to the underlying database but wait for the indexing to complete before calling the callback.

*/

var through = require('through2');
var sublevel = require('subleveldown');
var xtend = require('xtend');
var bufferReplace = require('buffer-replace');
var bufferSplit = require('buffer-split');
var changes = require('./level_changes');


function concat(a, b) {
  if(typeof a === 'string') {
    if(typeof b !== 'string') b = b.toString();
    return a + b;
  }
  if(Buffer.isBuffer(a)) {
    if(!Buffer.isBuffer(b)) b = new Buffer(b);
    return Buffer.concat([a, b])
  }
  throw new Error("concat() called for something that's neither string nor buffer");
}

// Join an array of either buffers or strings with the optional seperator
// Seperator can be a string or a buffer
function join(a, sep) {
  if(a.length <= 0) throw new Error("cannot reliably join a zero length array since it's impossible to determine whether output should be buffer or string");

  if(typeof a[0] === 'string') {
    if(Buffer.isBuffer(sep)) sep = sep.toString();
    return a.join(sep);
  }
  if(!Buffer.isBuffer(sep)) sep = new Buffer(sep);

  var b = [];
  var i;
  for(i=0; i < a.length; i++) {
    b.push(a[i]);
    if(i >= a.length - 1) continue;
    if(!sep || sep.length <= 0) continue;
    b.push(sep);
  }

  return Buffer.concat(b);
}

function split(a, sep) {

  if(typeof a === 'string') {

    if(typeof sep !== 'string') sep = sep.toString();
    return a.split(sep);
  } else if(Buffer.isBuffer(a)) {

    if(!Buffer.isBuffer(sep)) sep = new Buffer(sep);
    returnbufferSplit(a, sep);
  }

  throw new Error("I can only split strings and buffers");
}

function replace(a, b, c) {
  if(typeof key === 'string') return a.replace(b, c);
  if(Buffer.isBuffer(a)) return bufferReplace(a, b, c);
  throw new Error("concat() called for something that's neither string nor buffer");
}

// resolve a path like ['foo', 'bar', 'baz']
// to return the value of obj.foo.bar.baz
// or undefined if tha path does not exist
function resolvePropPath(obj, path) {

  if(path.length > 1) {
    if(!obj[path[0]]) return undefined;

    return resolvePropPath(obj[path[0]], path.slice(1, path.length));
  }

  if(path.length === 1) {
    return obj[path[0]];
  }

  return undefined;
}


function treeIndexer(db, idb, opts) {
  if(!(this instanceof treeIndexer)) return new treeIndexer(db, idb, opts);

  this.db = db;
  this.idb = sublevel(idb, 'i'); // the index db
  this.rdb = sublevel(idb, 'r'); // the reverse lookup db

  this.opts = xtend({
    pathProp: 'name', // property used to construct the path
    parentProp: 'parentKey', // property that references key of parent
    sep: '.' // path separator
  }, opts || {});

  if(opts.sep.length < 1) throw new Error("Seperator cannot be zero length");

  this.indexes = {};

  this.c = changes(this.db);
  this.c.on('data', function(change) {
    if(change.type === 'put') {
      this._onPut(change.key, change.value);
    } else { // del
      this._onDel(change.key);
    }
  }.bind(this));

  this._resolvePropPath = function(value, pathOrFunc) {
    if(typeof pathOrFunc === 'function') return pathOrFunc(value);

    if(typeof pathOrFunc === 'string') {
      return resolvePropPath(value, pathOrFunc.split('.'));
    }
    
    if(pathOrFunc instanceof Array) {
      return resolvePropPath(value, pathOrFunc);
    }

    throw new Error("Value must be string, array or function");
  };
  
  this._getParentKey = function(val) {
    return this._resolvePropPath(val, this.opts.parentProp);
  };

  this._getPathPart = function(val) {
    return this._resolvePropPath(val, this.opts.pathProp);
  };

  this._onPut = function(key, value, cb) {
    cb = cb || function(){};
    
    var self = this;
    
    this._buildPath(value, function(err, path) {
      if(err) return cb(err);
      
      // was this a move? (does it already exist in index?
      self.rdb.get(key, function(err, data) {
        if(err && !err.notFound) return cb(err)
        
        self.idb.put(path, key);
        self.rdb.put(key, path);
        
        // if there was no reverse lookup entry then this was a new put
        // so we are done
        if(err && err.notFound) return cb(err);
        
        // this was a move so we need to delete the previous entry in idb
        var prevPath = data.value;
        self.idb.del(data.value, function(err) {
          if(err) return cb(err);
          
          // since it was a move there may be children and grandchildren
          self._moveChildren(oldPath, newPath, cb);          
        })
      });
    });
  };
  
  this._onDel = function(key, cb) {
    cb = cb || function(){};

    var self = this;

    this.rdb.get(key, function(err, path) {
      if(err) return;
      
      self.idb.del(path);
      self.rdb.del(key);
      
      var newPath;
      if(Buffer.isBuffer(path)) {
        newPath = new Buffer();
      } else {
        newPath = '';
      }
      
      // move children to be root nodes
      self._moveChildren(path, newPath);
    });
  };

  // get stream of all children, grand-children, etc.
  this._childStream = function(parentPath) {
    if(!parentPath || parentPath.length <= 0) return this.idb.createReadStream();


    return this.idb.createReadStream({
      gt: concat(parentPath, this.opts.sep),
      lte: concat(concat(parentPath, this.opts.sep), '\xff')
    });    
  };

  // update the tree indexes of all descendants (children, grand-children, etc.)
  // based on the old and new path of a parent
  this._moveChildren = function(oldPath, newPath, cb) {
    cb = cb || function(){};

    var s = this._childStream(oldPath);

    var oldChildPath;
    var newChildPath;
    s.on('data', function(data) {
      oldChildPath = data.key;
      newChildPath = replace(data.key, oldPath, newPath);

      this.idb.put(newChildPath, data.value);
      this.rdb.put(data.value, newChildPath);
      this.idb.del(oldChildPath);

    }.bind(this));

    s.on('end', function(err) {
      cb();
    });
    
    s.on('error', function(err) {
      cb(err);
    })
  };

  // TODO 
  // we should be able to get the depths just by separator count
  // instead of actually splitting
  this._pathDepth = function(path) {
    return split(path, this.opts.sep).length;
  };


  // TODO guard against loops
  // Takes a value as input and builds its path by recursively
  // looking up the parent_key
  // We could look up the path of the parent in the index itself,
  // which would be faster since it's only one operation, but then 
  // e.g. adding an object and then immediately adding a child
  // could fail since the index is built asynchronously in parallel
  // with the put operation for the parent, so the path for
  // the parent may not have been built by the time the child
  // path needs to be built.
  this._buildPath = function(value, path, cb, seen) {
    if(typeof path === 'function') {
      cb = path
      path = null;
    }
    path = path || [this._getPathPart(value)];
    seen = seen || [];

    var parentKey = this._getParentKey(value);
    if(!parentKey) return cb(null, join(path.reverse(), this.opts.sep));

    // loop avoidance
    var i;
    for(i=0; i < seen.length; i++) {
      if(seen[i] === parentKey) return cb(new Error("loop detected"));
    }
    seen.push(parentKey);

    this.db.get(parentKey, function(err, value) {
      if(err) return cb(err);

      var pathPart = this._getPathPart(value);
      if(!pathPart) return cb(new Error("Object "+parentKey+" is missing its pathProp"))

      path.push(pathPart);
      this._buildPath(value, path, cb, seen);
      
    }.bind(this));
  }

  // clear an index (delete the index data from the db)
  this.clear = function(cb) {
    cb = cb || function(){};

    var self = this;

    // delete entire index
    var s = self.idb.createReadStream();
    s.pipe(through.obj(function(data, enc, next) {
      self.idb.del(data.key, function() {
        next();
      });
    }, function() {
      // delete entire reverse lookup index
      var rs = self.rdb.createReadStream();
      rs.pipe(through.obj(function(data, enc, next) {
        self.rdb.del(data.key, function() {
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

  };

  // build an index from scratch for existing contents of the db
  this.build = function(cb) {
    cb = cb || function(){};

    var self = this;

    var s = this.db.createReadStream();
    s.on('data', function(data) {
      self._onPut(data.key, data.value);
    });

    s.on('error', function(err) {
      cb(err);
    });

    s.on('end', function() {
      cb();
    });
  };


  // clear and then build an index from scratch for existing contents of the db
  this.rebuild = function() {
    this.clear(function(err) {
      if(err) return;

      this.build();

    }.bind(this));
  };

  // get value from tree path
  this.get = function(path, cb) {
    var self = this;

    this.idb.get(path, function(err, key) {
      if(err) return cb(err);
      self.db.get(key, function(err, value) {
        if(err) return cb(err);
        cb(null, key, value);
      });
    });

  };

  // get tree path given a key
  this.getPath = function(key, cb) {
    var self = this;

    this.rdb.get(path, function(err, path) {
      if(err) return cb(err);
      return cb(null, path);
    });

  };

  // get parent value given a key
  this.getParent = function(key, cb) {
    var self = this;

    this.db.get(key, function(err, value) {
      if(err) return cb(err);

      var parentKey = self.getParentKey(value);
      self.db.get(parentKey, cb);
    });
  };

  // get parent value given a value
  this.getParentFromValue = function(value, cb) {
    var parentKey = this.getParentKey(value);

    this.db.get(parentKey, cb);
  };

  // get parent path given a key
  this.getParentPath = function(key, cb) {
    var self = this;

    this.db.get(key, function(err, value) {
      if(err) return cb(err);

      var parentKey = self.getParentKey(value);
      self.rdb.get(parentKey, cb);
    });    
  };

  // get parent path given a value
  this.getParentPathFromValue = function(value, cb) {
    var parentKey = this.getParentKey(value);

    this.rdb.get(parentKey, cb);
  };

  // get parent value given a path
  this.getParentFromPath = function(path, cb) {
    var parentPath = this.getParentPathFromPath(path);

    this.get(parentPath, cb);
  };

  // get parent path given a path
  // note: this function can be called synchronously
  this.getParentPathFromPath = function(path, cb) {
    var sep = this.opts.sep;
    var a, res;

    if(typeof path === 'string') {
      if(typeof sep !== 'string') sep = sep.toString();
      a = path.split(sep);

    } else if(Buffer.isBuffer(path)) {
      if(!Buffer.isBuffer(sep)) sep = new Buffer(sep);
      a = bufferSplit(path, sep);

    } else {
      var err = new Error("path must be of type string or buffer");
      if(cb) return cb(err);
      throw err;
    }

    a = a.slice(1, a.length);
    res = join(a, sep);
    if(cb) return cb(null, res);

    return res;
  };
  
  this.getChildren = function(value, cb) {
    // TODO
  };
  
  this.getChildrenFromPath = function(path, cb) {

  };

  this.getChildPaths = function(value, cb) {
    // TODO
  };

  this.getChildPathsFromPath = function(path, cb) {
    // TODO
  };

  this.getSiblings = function(value, cb) {
    // TODO
  };  

  this.getSiblingPaths = function(value, cb) {
    // TODO
  };
    

  this.pathStream = function() {
    return this._childStream();
  };
  
  this.stream = function(parentPath, opts) {
    opts = xtend({
      depth: 0, // how many (grand)children deep to go. 0 means infinite
      paths: true, // output the path for each child
      keys: true, // output the key for each child
      values: true // output the value for each child
      // if more than one of paths, keys and values is true
      // then the stream will output objects with these as properties
    }, opts || {});
    
    if(opts.withValues) opts.withKeys = true;
    if(!opts.parentPath) opts.depth = 0;

    if(opts.depth > 0) {
      var parentDepth = this._pathDepth(parentPath);
      var maxDepth = parentDepth + opts.depth;
    }

    var s = this._childStream(parentPath);

    var self = this;

    var depth;
    var out = through.obj(function(data, enc, cb) {

      var path = data.key;
      var key = data.value;

      if(opts.depth > 0) {
        depth = self._pathDepth(path);
        if(depth <= parentDepth) return cb();
        if(depth > maxDepth) return cb();
      }
      
      if(!opts.values) {
        if(opts.paths && opts.keys) {
          this.push({
            path: path,
            key: key
          });
          return cb();
        }
        if(opts.keys) {
          this.push(key)
          return cb();
        }
        if(opts.paths) {
          this.push(path)
          return cb();
        }
      }

      self.db.get(key, function(err, value) {
        if(err) return cb(err);
        
        if(!opts.paths && !opts.keys) {
          this.push(value);
          return cb();
        }
        
        var o = {
          value: value
        };
        
        if(opts.paths) {
          o.path = path;
        }
        if(opts.keys) {
          o.key = key;
        }
        this.push(o);
        return cb();
      });
    });

    s.pipe(out);
    return out;
  };

  this.pathStream = function(parentPath, opts) {
    opts = xtend({ // see this.stream() for opts docs
      depth: 0,
      paths: true,
      keys: false,
      values: false
    }, opts || {});

    return this.stream(parentPath, opts);
  };

  this.keyStream = function(parentPath, opts) {
    opts = xtend({ // see this.stream() for opts docs
      depth: 0,
      paths: false,
      keys: true,
      values: false
    }, opts || {});

    return this.stream(parentPath, opts);
  };

  this.valueStream = function(parentPath, opts) {
    opts = xtend({ // see this.stream() for opts docs
      depth: 0,
      paths: false,
      keys: false,
      values: true
    }, opts || {});

    return this.stream(parentPath, opts);
  };

}

module.exports = treeIndexer;

