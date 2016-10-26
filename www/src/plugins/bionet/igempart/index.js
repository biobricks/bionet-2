import riot from 'riot'
//import request from 'request'
import bionetapi from '../bionetapi'

var igempart = {
  init: function () {
    //----------------------------------------------------------------------------
    // web components
//    require('./part-list.tag.html')
//    require('./part-form.tag.html')

    // TODO remove these
    app.addStreamRouter('createPart')
    app.addStreamRouter('editPart')
    app.addStream('getPartsList')
    app.addStream('partsList')

    
    riot.route('/create', function() {
      app.state.createPart = {}
      riot.mount('div#content', 'create-part')
      riot.mount('div#create-part-content', 'create-specification')
    })

    riot.route('/create/*', function(section) {
      riot.mount('div#content', 'create-part')
      if(section == 'sequence') {
        riot.mount('div#create-part-content', 'create-sequence')
      } else if(section == 'instances') {
        riot.mount('div#create-part-content', 'create-instances')
      } else {
        riot.mount('div#create-part-content', 'create-specification')
      }
    })

    function getMaterial(id, cb) {
      if(!id) return riot.mount('div#content', 'err404', {msg: "Missing ID field in URL"})

      if(app.state.editPart && app.state.editPart.id && app.state.editPart.id === id) {
        process.nextTick(function() {
          cb(app.state.editPart)
        });
      } else {
        app.remote.getMaterial(id, function(err, data) {
          if(err) {
            riot.mount('div#content', 'err404', {msg: err})
            return
          }
          cb(data);
        })
      }
    }
    riot.route('/edit/*', function(partID) {

      getMaterial(partID, function(data) {
        app.state.editPart = data
        riot.mount('div#content', 'part-form', {partID})
      })

    })

    riot.route('/edit/*/*', function(partID, section) {

      getMaterial(partID, function(data) {
        app.state.editPart = data
        var opts = {partID}

        riot.mount('div#content', 'part-form', opts)
        if(section == 'sequence') {
          riot.mount('div#edit-part-content', 'part-sequence', opts)
        } else if(section == 'instances') {
          riot.mount('div#edit-part-content', 'part-notes', opts)
        } else {
          riot.mount('div#edit-part-content', 'part-specification', opts)
        }
      });
    })

    require('./create-part.tag.html')
    require('./part-form.tag.html')

  },
  remove: function() {
    
  }
}
module.exports = igempart

