const riot = require('riot')
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
                // TODO: messaging - async api
                app.dispatch('partsList', streamItems)
            })
        })


        partDataAccessor.addRoute('cache', (partData) => {
            //console.log('partDataAccessor store:',JSON.stringify(partData))
            // TODO: messaging - async api
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

        // TODO why is this necessary? it seems to simply strip all but four properties but why is that important?
        partDataAccessor.reduceRoute('toPhysicalItem', (m, partData) => {
            return {
                name: partData.name,
                virtual_id: partData.virtual_id,
                cassetteid: partData.cassetteid,
                locationid: partData.locationid
            }
        })

      // TODO why is this a route? should simply be a function call
        partDataAccessor.addRoute('storePhysical', (physicalData) => {
            console.log('partDataAccessor physicalData:', JSON.stringify(physicalData))
            const toast = app.getThemeMethod().toast
            app.remote.savePhysical(physicalData.material, physicalData.labelImage, physicalData.doPrint, function (err, id) {
                if (err) {
                    toast('ERROR saving ' + physicalData.material.name + ' ' + err)
                    if (cb) cb(err)
                    return;
                }
                toast(physicalData.material.name + ' saved')
                // TODO: messaging - async api
                app.dispatch('bioPhysicalQuery', physicalData.material.virtual_id)
                BIONET.signal.physicalUpdated.dispatch(physicalData.material)
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
                    app.error(err)
                } else {
                    const item = JSON.parse(value)
                    console.log('retrieved item:', JSON.stringify(item))
                    // TODO: messaging - async api
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
        app.addStreamRouter('createPart');
        app.addStreamRouter('editPart');
        app.addStream('getPartsList');
        app.addStream('partsList');


        /*
            route('/create-virtual', function () {
              app.state.createPart = {}
              riot.mount('div#content', 'create-part')
              riot.mount('div#create-part-content', 'create-virtual-form')
            })

        */

        route('/create-virtual/*', function (type) {
            app.state.createPart = {
                name: '',
                description: '',
                creator: '',
                created: '',
                temperature: '',
                bsl: '',
                biohazard: '',
                avatar: ''
            }
            riot.mount('div#content', 'create-part', {
                type: type,
                query: {}
            })
        });

        route('/create-virtual/*/..', function (type) {
            var q = route.query()

            var opts = {
                type: type,
                query: q || {}
            }
            riot.mount('div#content', 'create-part', opts)
        })

        /*
            route('/create/*', function (section) {
              riot.mount('div#content', 'create-part')
              if (section == 'sequence') {
                riot.mount('div#create-part-content', 'create-sequence')
              } else if (section == 'instances') {
                riot.mount('div#create-part-content', 'create-instances')
              } else {
                riot.mount('div#create-part-content', 'create-virtual-form')
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

                app.remote.get(id, function (err, data) {

                    if (err) {
                        app.error(err)
                        return
                    }
                    cb(data);
                })

            }
        }

        partDataAccessor.addRoute('getVirtual', (virtualId) => {
            getMaterial(virtualId, (virtualData) => {
                // TODO: messaging async api call
                partDataAccessor.route('getVirtualResult', undefined, virtualData)
            })
        })

        /*
        route('/edit...', function(partID) {
          console.log('edit part route A, partID:%s',partID)
          getMaterial(partID, function(data) {
            app.state.editPart = data
            riot.mount('div#content', 'part-form', {partID})
          })

        })
        */

        route('/edit/*', function (partID) {

            getMaterial(partID, function (data) {
                console.log('MATERIAL', data)
                app.state.editPart = data
                riot.mount('div#content', 'part-form', {
                    partID
                })
            })

        })

        route('/edit/*/*', function (partID, section) {

            getMaterial(partID, function (data) {
                app.state.editPart = data
                var opts = {
                    partID: partID,
                    virtualID: partID
                }

                riot.mount('div#content', 'part-form', opts)
                if (section == 'sequence') {
                    riot.mount('div#edit-part-content', 'part-sequence', opts)
                } else if (section == 'instances') {
                    opts.topMargin = 0
                    riot.mount('div#edit-part-content', 'create-physical', opts)
                } else if (section == 'notes') {
                    riot.mount('div#edit-part-content', 'part-notes', opts)
                } else if (section == 'attachment') {
                    riot.mount('div#edit-part-content', 'part-attachment', opts)
                } else {
                    riot.mount('div#edit-part-content', 'part-specification', opts)
                }
            });
        })

        require('./create-part.tag.html');
        require('./part-form.tag.html')

    },
    remove: function () {

    }
}
module.exports = igempart
