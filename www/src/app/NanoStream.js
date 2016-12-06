/*

NanoStream.js: a minimalist monadic streaming interface

NanoStream implements the observer pattern with a reducer step that enables filtering or mapping of the next state before dispatching to observers.
After application of the transform the resulting next state is made immutable.

Caveats:

  The object returned from getModel or passed to observers is immutable.
  If the object is used in an asynchronous function it is possible that it could be updated to another immutable object before it is used.
  
  Either scenario can be resolved by making a copy of the streamed object.

NanoStream examples:

//----------------------------------------------------------
// dispatch/observe stream
// monad type: identity

stream = new nanoStream();

// observe updates to identity stream
stream.observe((message) => {
  console.log(message);
});

// dispatch a message to identity stream
stream.dispatch('a message from identity stream...');

//----------------------------------------------------------
// simple counter stream
// monad type: state

counter = (new nanoStream(1000))
  .reduce(function (x, d) {
    return x + d
  });

// increment counter stream every second
var interval = setInterval( function() {
  counter.dispatch(1);
}, 1000);

// observe updates to counter and stop after 10 updates
counter.observe((x) => {
  console.log('counter:',x);
  if (x>1009) clearInterval(interval);
});


//----------------------------------------------------------
// filter stream
// monad type: maybe

filter = (new nanoStream(0))
  .reduce(function (x, d) {
    if (d>=0) return d;
    else return undefined;
  });

// observe updates to counter
filter.observe((x) => {
  console.log('filter: ',x);
});

filter.dispatch(1);
filter.dispatch(-1);

//----------------------------------------------------------
// async stream read operation
// mondad type: I/O

ioRead = new nanoStream();
ioResult = new nanoStream();

function loadXMLDoc(url,cb) {
    if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari, SeaMonkey
        xmlhttp=new XMLHttpRequest();
    }
    else {// code for IE6, IE5
        xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange=function() {
        if (xmlhttp.readyState==4 && xmlhttp.status==200) {
          cb(null,responseText);
        } else {
          cb(xmlhttp.status,null);
        }
    }
    xmlhttp.open("GET", url, false);
    xmlhttp.send();
}

// observe updates to background position and redraw
ioRead.observe(function (url) {
  loadXMLDoc(url, function(err,result) {
    if (err) {
      console.log('ioRead error:',err);
    } else {
      if (result.length>0) ioResult.dispatch(result);
      else console.log('ioRead: 0 bytes read');
    }
  })
});

// observe read operations
ioResult.observe((result) => {
  console.log('ioResult: ',result.length,' bytes read');
});

// dispatch read opeation
ioRead.dispatch('http://www.google.com');

//todo:
//asynch function example
function async(fn, callback) {
    setTimeout(function() {
        fn();
        callback();
    }, 0);
}

// network examples, dfs and bfs traversal


------------------------------------------------------------------------------------------------------*/

// constructor
const NanoStream = function (model) {
  if (model !== undefined) {
    this.init(model);
  } else {
    this.init({});
  }
  this.observer = [];
  this.reducer = function (model, newModel) {
      return newModel;
    }
}

// initialize model
NanoStream.prototype.init = function (newModel) {
  this.model = newModel;
  Object.freeze(this.model)
  return this;
}

// set reducer function
NanoStream.prototype.reduce = function (reducer) {
  this.reducer = reducer;
  return this;
}

// set single observer function
NanoStream.prototype.observe = function (observer) {
  this.observer[0]=observer;
  return this;
}

// add observer function
NanoStream.prototype.addObserver = function (observer) {
  this.observer.push(observer);
  return this;
}

// remove observer function
NanoStream.prototype.removeObserver = function (observer) {
  var i = this.observer.findIndex(function (x) {
    return observer === x;
  });
  if (i >= 0) {
    this.observer.splice(i, 1);
  }
}

// get model
NanoStream.prototype.getModel = function () {
  return this.model;
}
// dispatch model update to observers
NanoStream.prototype.dispatch = function (newModel) {
  const updatedModel = this.reducer(this.model, newModel);
  if (updatedModel === undefined) return;
  Object.freeze(updatedModel)
  this.model = updatedModel;
  const observer = this.observer;
  for (var i = 0, k = observer.length; i < k; i++) observer[i](updatedModel);
}

module.exports = NanoStream;
