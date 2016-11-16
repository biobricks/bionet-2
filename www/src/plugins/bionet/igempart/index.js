import riot from 'riot'
//import request from 'request'
import bionetapi from '../bionetapi'

var igempart = {
  init: function () {
    //----------------------------------------------------------------------------
    //----------------------------------------------------------------------------
    // streams

    console.log('***********initializing igem part streams 1')
    app.addStreamRouter('createPart')
    app.addStreamRouter('editPart')
    app.addStream('getPartsList')
    app.addStream('partsList')
    const partData = app.addStream('partData')
    const partDataAccessor = app.addStreamRouter('partDataAccessor')

    //----------------------------------------------------------------------------
    // web components
    require('./part-list.tag.html')
    require('./part-form.tag.html')
    require('./create-part.tag.html')

    app.observe('getPartsList', (q) => {
      // todo replace readTestData with bionet query
      app.readTestData(function (streamItems) {
        app.dispatch('partsList', streamItems)
      })
    })


    partDataAccessor.addRoute('cache', (partData) => {
      //console.log('partDataAccessor store:',JSON.stringify(partData))
      app.dispatch('partData', partData)
    })

    partDataAccessor.reduceRoute('fromSearchItem', (m, streamItem) => {
      console.log('partDataAccessor fromSearchItem:', JSON.stringify(streamItem))
        //todo: map the entire igem data object (causes data to not be saved in index if not mapped)
      return {
        name: streamItem.part_name,
        description: streamItem.short_desc,
        creator: streamItem.author,
        temperature: (streamItem.temperature !== undefined) ? streamItem.temperature : '-80C',
        bsl: (streamItem.bsl !== undefined) ? streamItem.bsl : 'BSL01',
        biohazard: (streamItem.biohazard !== undefined) ? streamItem.biohazard : false,
        created: streamItem.creation_date,
        avatar: '',
        notes: streamItem.notes,
        sequence: (streamItem.sequence !== undefined) ? streamItem.sequence : '',
        plasmidAnnotations: (streamItem.plasmidAnnotations !== undefined) ? streamItem.plasmidAnnotations : []
      }
    })

    partDataAccessor.addRoute('storeClass', (classData) => {
      console.log('partDataAccessor storeClass:', JSON.stringify(classData))
      const toast = app.getThemeMethod().toast
      bionetapi.updateClassItem(classData.partid, classData, (err, data, msg) => {
        if (err) {
          toast('ERROR saving ' + classData.partid)
          console.log('putPartData:', msg)
        } else {
          toast(classData.partid + ' saved')
        }
      })
    })

    partDataAccessor.reduceRoute('toPhysicalItem', (m, partData) => {
      return {
        id: partData.datamatrix,
        name: partData.name,
        cassetteid: partData.cassetteid,
        locationid: partData.locationid
      }
    })

    partDataAccessor.addRoute('storePhysical', (physicalData) => {
      console.log('partDataAccessor physicalData:', JSON.stringify(physicalData))
      const toast = app.getThemeMethod().toast
      bionetapi.savePhysical(physicalData, (err, data, msg) => {
        if (err) {
          toast('ERROR saving ' + physicalData.name)
          console.log('putPartData:', msg)
        } else {
          toast(physicalData.name + ' saved')
          app.dispatch('bioPhysicalQuery', physicalData.name)
        }
      })
    })


    partDataAccessor.reduceRoute('toSearchItem', (m, partData) => {
      //console.log('partDataAccessor toSearchItem:',JSON.stringify(partData))
      const igemData = {
        part_name: partData.name,
        short_desc: partData.description,
        author: partData.creator,
        temperature: partData.temperature,
        bsl: partData.bsl,
        biohazard: partData.biohazard,
        creation_date: partData.created,
        avatar: partData.avatar,
        sequence: partData.sequence
      }
      return {
        partid: partData.name,
        description: partData.description,
        props: JSON.stringify(igemData)
      }
      console.log('partDataAccessor toSearchItem:', JSON.stringify(props))
    })

    app.addStream('getPartData');
    app.observe('getPartData', (id) => {
      app.getLocal(id, function (err, value) {
        if (err) {
          console.log('getPartData:error reading part:', id, err)
          app.dispatch('error', err)
        } else {
          const item = JSON.parse(value)
          console.log('retrieved item:', JSON.stringify(item))
          app.dispatch('partData', item)
        }
      })
    })

    app.addStream('putPartData')

    app.observe('putPartData', (partData) => {
        const partDataStr = JSON.stringify(partData)
        console.log('submit', partDataStr)
        app.putLocal(partData.name, partDataStr, function (err) {
          const toast = app.getThemeMethod().toast
          if (err) {
            toast('ERROR saving ' + partData.name)
            console.log('putPartData:', err)
          } else {
            toast(partData.name + ' saved')
          }
        })
      })
      //----------------------------------------------------------------------------
      // web components
      //    require('./part-list.tag.html')
      //    require('./part-form.tag.html')

    // TODO remove these
    app.addStreamRouter('createPart')
    app.addStreamRouter('editPart')
    app.addStream('getPartsList')
    app.addStream('partsList')


/*
    riot.route('/create-virtual', function () {
      app.state.createPart = {}
      riot.mount('div#content', 'create-part')
      riot.mount('div#create-part-content', 'create-specification')
    })
*/
    riot.route('/create-virtual/*', function(type) {
      app.state.createPart = {}
      riot.mount('div#content', 'create-part', {type: type, query: {}})

    });
    riot.route('/create-virtual/*/..', function(type) {
      var q = riot.route.query()

      var opts = {type: type, query: q || {}}
      riot.mount('div#content', 'create-part', opts)

      if(q.tab === 'sequence') {
        riot.mount('div#create-part-content', 'create-sequence')
      } else if(q.tab === 'instances') {
        riot.mount('div#create-part-content', 'create-instances')
      } else {
        riot.mount('div#create-part-content', 'create-specification')
      }
    })

/*
    riot.route('/create/*', function (section) {
      riot.mount('div#content', 'create-part')
      if (section == 'sequence') {
        riot.mount('div#create-part-content', 'create-sequence')
      } else if (section == 'instances') {
        riot.mount('div#create-part-content', 'create-instances')
      } else {
        riot.mount('div#create-part-content', 'create-specification')
      }
    })
*/
    function getMaterial(id, cb) {
      if (!id) return riot.mount('div#content', 'err404', {
        msg: "Missing ID field in URL"
      })
      if (app.state.editPart && app.state.editPart.id && app.state.editPart.id === id) {

        process.nextTick(function () {
          cb(app.state.editPart)
        });
      } else {

        // TODO this is very bad
        setTimeout(function() {
          app.remote.get(id, function (err, data) {

            if (err) {
              app.dispatch('error', err)
              return
            }
            cb(data);
          })
        }, 500)
      }
    }

    /*
    riot.route('/edit...', function(partID) {
      console.log('edit part route A, partID:%s',partID)
      getMaterial(partID, function(data) {
        app.state.editPart = data
        riot.mount('div#content', 'part-form', {partID})
      })

    })
    */

    riot.route('/edit/*', function (partID) {

      getMaterial(partID, function (data) {
        console.log('MATERIAL', data)
        app.state.editPart = data
        riot.mount('div#content', 'part-form', {
          partID
        })
      })

    })

    riot.route('/edit/*/*', function (partID, section) {

      getMaterial(partID, function (data) {
        app.state.editPart = data
        var opts = {
          partID
        }

        riot.mount('div#content', 'part-form', opts)
        if (section == 'sequence') {
          riot.mount('div#edit-part-content', 'part-sequence', opts)
        } else if (section == 'instances') {
          riot.mount('div#edit-part-content', 'part-instance', opts)
        } else if (section == 'notes') {
          riot.mount('div#edit-part-content', 'part-notes', opts)
        } else if (section == 'attachment') {
          riot.mount('div#edit-part-content', 'part-attachment', opts)
        } else {
          riot.mount('div#edit-part-content', 'part-specification', opts)
        }
      });
    })

    require('./create-part.tag.html')
    require('./part-form.tag.html')

  },
  remove: function () {

  }
}
module.exports = igempart
