import levelup from 'levelup';
import leveljs from 'level-js';
import testdata from './testdata';

const persist = {
  db: {},
  openDB: function () {
    this.db = levelup('bionet', {
      db: leveljs
    });
    //this.initTestData();
    //this.readTestData();
  },
  put: function (key, value, cb) {
    this.db.put(key, value, {}, cb);
  },
  get: function (key, cb) {
    this.db.get(key, {}, cb);
  },
  sync: function () {
    //import airplanedb from 'level-airplanedb';
    //this.db = airplanedb(this.db);
  },
  streamData: {},
  readTestData: function (cb) {
    this.streamData = [];
    const _this = this;
    this.db.createReadStream()
      .on('data', function (data) {
        const streamItem = JSON.parse(data.value);
        //console.log('readStream:' + data.key, '=', JSON.stringify(streamItem));
        if (streamItem.id !== undefined) {
          // TODO: messaging - async api
          app.dispatch('searchResult', streamItem)
        }
      })
      .on('error', function (err) {
        console.log('Oh my!', err)
      })
      .on('close', function () {
        //console.log('Stream closed')
      })
      .on('end', function () {
        //console.log('Stream closed');
        //console.log(JSON.stringify(_this.streamData));
        cb(_this.streamData);
      });
  },
  delTestData: function (cb) {
    const _this = this;
    this.db.createReadStream()
      .on('data', function (data) {
        const streamItem = JSON.parse(data.value);
        _this.db.del(streamItem.name);
      })
      .on('end', function (err) {
        cb(err);
      });
  },
  initTestData: function () {
    const _this = this;
    this.delTestData(function (err) {
      if (err) {
        console.log('ERROR deleting db:', err);
        return;
      }
      var batchData = [];
      for (var i = 0; i < testdata.length; i++) {
        const item = testdata[i];
        const batchItem = {
          type: 'put',
          key: item.name,
          value: JSON.stringify(item)
        };
        batchData.push(batchItem);
      }
      //console.log('testdata:'+JSON.stringify(batchData));
      _this.db.batch(batchData, function (err) {
        if (err) return console.log('Batch error', err)
        console.log('Items batched!');
      });
    });
  }
};
export default persist;
