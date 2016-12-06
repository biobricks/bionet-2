
var sublevel = require('subleveldown'); // leveldb multiplexing

// generate unique sequential IDs
function IDGenerator(db) {

    this.db = sublevel(db, 'seq-ids', { valueEncoding: 'utf8' });
    this.cur = null;

    this.loadFromDB = function(cb) {
        this.db.get('current', function(err, val) {
            if(err) {
                if(err.notFound) {
                    return cb(null, 0);
                }
                return cb(err);
            }
            cb(null, parseInt(val));
        });
    };

    this.getCur = function(cb) {
        if(this.cur) return process.nextTick(function() {
            cb(null, this.cur);
        });

        this.loadFromDB(cb);
    };

    this.next = function(cb) {
        if(this.cur === null) return this.loadFromDB(function(err, val) {
            if(err) return cb(err);
            this.cur = val;
            return this.next(cb);
        }.bind(this));
       
        this.db.put('current', String(this.cur+1), function(err) {
            if(err) return cb(err)

            this.cur++;
            cb(null, this.cur);
        }.bind(this));
    };
}

module.exports = IDGenerator;
