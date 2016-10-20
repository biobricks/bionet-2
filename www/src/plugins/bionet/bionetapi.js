const elasticsearch = require('elasticsearch');

var bionetapi = {
  esclient: {},
  indexName: 'cassette',
  listingType: 'inlab',
  init: function () {
    /*
    this.esclient = new elasticsearch.Client({
      host: '10.0.0.5:9200'
    });
    this.esclient = new elasticsearch.Client({
      host: '172.16.20.1:9200'
    });
    */
    this.esclient = new elasticsearch.Client({
      host: 'dev.bionet.io:9200'
    });

  },
  shutdown: function () {},
  checkMasterPassword: function (password, cb) {
    const result = password === 'code'
    const err = (result) ? '' : 'Invalid code.'
    cb(result, err)
  },
  validateEmail: function (email, cb) {
    const result = email.length > 0
    const err = (result) ? '' : 'You must enter a valid email address.'
    cb(result, err)
  },
  validatePassword: function (password, cb) {
    const result = password.length > 7
    const err = (result) ? '' : 'Password must be at least 8 characters long.'
    cb(result, err)
  },
  createUser: function (email, password, cb) {
    cb(true, '')
  },
  verifyUser: function (cb) {
    cb(true, '')
  },
  tryLogin: function (email, password, cb) {
      console.log("trying login:", email, password);

    cb(true, '')
  },
  tryLogout: function () {
    return true;
  },
  requestPasswordReset: function (emailOrName, cb) {
    cb(true, '')
  },
  checkPasswordResetCode(cb) {
    cb(true, '')
  },
  completePasswordReset(cb) {
    cb(true, '')
  },
  partClassSearch: function (q, cb) {
    console.log('part class search q:%s', q)
    const indexName = 'igem';
    const listingType = 'virtual';
    this.esclient.search({
      index: indexName,
      type: listingType,
      "size": 20,
      body: {
        "query": {
          or: [
            {
              "match": {
                "partid": q
              }
          },
            {
              "match": {
                "description": q
              }
          }
        ]
        }
      }
    }).then(function (resp) {
      console.log('searching for part: %s', q);
      //console.log(JSON.stringify(resp, null, 2));
      //var hits = resp.hits.total;
      var hits = resp.hits.hits.length;
      if (hits > 0) console.log("class search %s (%d)", q, hits);
      var response = [];
      for (var i = 0; i < hits; i++) {
        var result = resp.hits.hits[i];
        var id = result._id;
        //console.log(id);
        var part = {
            t: 'c',
            id: result._source.partid,
            description: result._source.description,
            data: result._source.props
          }
          //console.log('part class:',JSON.stringify(result._source))
          //app.route('searchResult', 'packet', 'class', part)
        response.push(part)
      }
      cb(true, response, '')
    }, function (err) {
      console.trace(err.message);
      cb(false, [], err.message)
    })
  },
  partInstanceSearch: function (q, cb) {
    //const thisLocation = [-122.1765219, 37.4287491];
    const thisLocation = [-122.230506, 37.482743];
    const distance = q.distance
    const partid = q.partid
    const locationid = q.locationid

    // set distance filter and sort if specified
    var locationSearch = {}
    var distanceSort = []
    if (distance) {
      locationSearch = {
        "geo_distance": {
          "distance": distance,
          "location": thisLocation
        }
      }
      distanceSort = [
        {
          "_geo_distance": {
            "location": {
              "lat": thisLocation[1],
              "lon": thisLocation[0]
            },
            "order": "asc",
            "unit": "km",
            "distance_type": "plane"
          }
        }
      ]
    }

    // set part id filter if specified
    var partSearch = {}
    if (partid !== undefined && partid.length > 0) {
      partSearch = {
        "match": {
          "partid": partid
        }
      }
    }

    this.esclient.search({
      index: this.indexName,
      type: this.listingType,
      "size": 20,
      body: {
        "query": {
          "match_phrase_prefix": {
            "locationid": {
              "query": locationid
            }
          }
        },
        "filter": {
          and: [
          partSearch,
          locationSearch
        ]
        },
        "sort": distanceSort
      }
    }).then(function (resp) {
      console.log('searching for lab %s, part %s, distance %s', locationid, partid, distance);
      //console.log(JSON.stringify(resp, null, 2));
      var hits = resp.hits.total;
      //if (hits > 0) console.log("%s (%d)", term, hits);
      var response = [];
      for (var i = 0; i < hits; i++) {
        var result = resp.hits.hits[i];
        const d = (distance && result.sort !== undefined) ? result.sort[0] : undefined
        var cassette = {
            t: 'i',
            id: result._source.id,
            partid: result._source.partid,
            locationid: result._source.locationid,
            distance: d
          }
          //app.route('searchResult', 'packet', 'instance', cassette)

        //console.log(JSON.stringify(cassette, null, 2));
        response.push(cassette)
          //var id = resp.hits.hits[i]._id
          //console.log(id);
          //cassetteDB.get(id, function (err, cassetteDoc) {})
      }
      //console.log('invoking search callback')
      cb(true, response, '')
    }, function (err) {
      console.trace(err.message);
      cb(false, [], err.message)
    });
  },

  updateClassItem: function (id, classData, cb) {
    console.log('bionetapi.updateClassItem: id=%s classData=%s', id, JSON.stringify(classData, null, 2))
      //cb(false, {}, '')
      //return

    this.esclient.index({
      index: 'igem',
      type: 'virtual',
      id: id,
      body: classData
    }, function (error, response) {
      if (error) {
        //console.log(error);
        cb(true, {}, error)
      } else {
        //console.log(response);
        cb(false, {}, '')
      }
    });
  },

  recentChanges: function (cb) {
    cb(true, [], '')
  },
  getID(cb) {
    cb(true, '', '')
  },
  getPhysical(id, cb) {
    cb(true, {}, '')
  },
  savePhysical(m, imageData, doPrint, cb) {
    cb(true, '')
  },
  delPhysical(id, cb) {
    cb(true, '')
  }
}
module.exports = bionetapi
