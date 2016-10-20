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


    console.log("=== create init");
    
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

    riot.route('/edit/*', function(partID) {
      console.log("getting part:", partID)
      app.remote.getMaterial(partID, function(err, data) {
        console.log("=====", err, data)
        if(err) {
          riot.mount('div#content', 'err404', {msg: err})
          return
        }
        app.state.editPart = data

        riot.mount('div#content', 'part-form')
      })
    })

    riot.route('/edit/*/*', function(partID, section) {
      riot.mount('div#content', 'part-form')
      if(section == 'sequence') {
        riot.mount('div#create-part-content', 'part-sequence')
      } else if(section == 'instances') {
        riot.mount('div#create-part-content', 'part-notes')
      } else {
        riot.mount('div#create-part-content', 'part-specification')
      }
    })


    require('./create-part.tag.html')
    require('./part-form.tag.html')

  },
  remove: function() {
    
  }
}
module.exports = igempart

