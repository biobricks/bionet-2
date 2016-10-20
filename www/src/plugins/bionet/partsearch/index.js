import riot from 'riot'
import bionetapi from '../bionetapi'

var partsearch = {
  init: function () {
    
    //-------------------------------------------------------------------------
    // search
    require('./search-result.tag.html')

    app.addStream('bioClassQuery')
    app.addStream('bioInstanceQuery')
    const searchResult = app.addStreamRouter('searchResult')
    const searchCache = app.addStream('searchCache').init(undefined)
    const bioClassCache = app.addStream('bioClassCache').init(undefined)
    const bioInstanceCache = app.addStream('bioInstanceCache').init(undefined)

    searchResult.reduceRoute('class', (m, streamItem) => {
      const mapItem = function (x) {
        return {
          url: '#!/item?id=' + x.id,
          secondary_url: '#!/q?partid=' + x.id,
          secondary_url_label: 'view availabilty',
          righticon: 'star',
          primary_text: x.id,
          secondary_text: x.description,
          starred: false,
          data: x.data
        }
      }
      if (Array.isArray(streamItem)) {
        console.log('search result reducer, array:')
        const itemList = []
        for (var i = 0; i < streamItem.length; i++) {
          itemList.push(mapItem(streamItem[i]))
        }
        return itemList
      } else {
        const item = mapItem(streamItem)
          //console.log('searchResult reduce:', JSON.stringify(item))
        return item
          //return mapItem(streamItem)
      }
    })

    searchResult.reduceRoute('instance', (m, streamItem) => {
      const mapItem = function (x) {
        var distance = (x.distance !== undefined) ? ' ' + Math.round(x.distance) + 'km' : ''
        if (distance === ' 0km') distance = ' ***available in lab'
        return {
          url: '#!/scan?id=' + x.id,
          righticon: 'star',
          primary_text: x.locationid,
          secondary_text: x.id + distance,
          starred: false,
          data: x
        }
      }
      if (Array.isArray(streamItem)) {
        console.log('search result reducer, array:')
        const itemList = []
        for (var i = 0; i < streamItem.length; i++) {
          itemList.push(mapItem(streamItem[i]))
        }
        return itemList
      } else {
        //console.log('searchResult instance reducer:', JSON.stringify(streamItem))
        const item = mapItem(streamItem)
          //console.log('searchResult instance reducer:', JSON.stringify(item))
        return item
          //return mapItem(streamItem)
      }
    })

    app.observe('bioClassQuery', (q) => {
      app.getStream('searchCache').init(undefined)
      bionetapi.partClassSearch(q.q, (result, data, msg) => {
        //console.log('search callback: result:%b data:%s', result, JSON.stringify(data, null, 2))
        if (result) {
          //app.route('searchResult', 'end')
          app.route('searchResult', 'list', 'class', data)
          app.dispatch('bioClassCache', searchResult.getModel())
        } else {
          app.getThemeMethod().toast(msg)
        }
      })
    })

    app.observe('bioInstanceQuery', (q) => {

      // initialize search result stream
      //app.route('searchResult', 'start')
      app.getStream('searchCache').init(undefined)

      // initiate query
      //if (q.partid !== undefined) {
        bionetapi.partInstanceSearch(q, (result, data, msg) => {
          if (result) {
            //app.route('searchResult', 'end')
            app.route('searchResult', 'list', 'instance', data)
            app.dispatch('bioInstanceCache', searchResult.getModel())
          } else {
            app.getThemeMethod().toast(msg)
          }
        })
      //}
    })

    //---------------------------------------------------------------------
    // search route
    app.addRoute('/q..', function () {
      app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: true,
        enableSubbar: false
      })

      // todo: handle pagination
      const q = riot.route.query()
      if (q.page !== undefined) {
        console.log('search result page: ' + q.page)
      }
      const terms = (q.terms !== undefined) ? '?terms=' + q.terms : ''

      if (q.partid !== undefined) {
        const distance = (q.distance === undefined) ? '500km' : q.distance
        const lab = (q.lab === undefined) ? 'LAB' : q.lab
        const qp = {
          q: q.partid,
          partid: q.partid,
          locationid: lab,
          distance: distance
        }
        app.dispatch('bioInstanceQuery', qp)
        app.dispatch('searchCache', bioInstanceCache.getModel())
        app.dispatch(app.$.breadcrumbs, [{
            'label': 'search',
            'url': '#!/'
        }, {
            'label': app.getModel('bioClassQuery').q,
            'url': '#!/q' + terms
        }, {
            'label': q.partid,
            'url': '#!/q?partid=' + q.partid
        }
        ]);
      } else {
        app.dispatch('searchCache', bioClassCache.getModel())
        app.dispatch(app.$.breadcrumbs, [{
            'label': 'search',
            'url': '#!/'
        }, {
            'label': app.getModel('bioClassQuery').q,
            'url': '#!/q' + terms
        }
        ]);
      }
      riot.mount('div#content', 'search-result')
    })
  },
  remove: function() {
    
  }
}
module.exports = partsearch
