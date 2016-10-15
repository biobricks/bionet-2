import riot from 'riot'
import bionetapi from '../bionetapi'

var partsearch = {
  init: function () {
    
    //-------------------------------------------------------------------------
    // search
    require('./search-result.tag.html')

    sudocms.addStream('bioClassQuery')
    sudocms.addStream('bioInstanceQuery')
    const searchResult = sudocms.addStreamRouter('searchResult')
    const searchCache = sudocms.addStream('searchCache').init(undefined)
    const bioClassCache = sudocms.addStream('bioClassCache').init(undefined)
    const bioInstanceCache = sudocms.addStream('bioInstanceCache').init(undefined)

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

    sudocms.observe('bioClassQuery', (q) => {
      sudocms.getStream('searchCache').init(undefined)
      bionetapi.partClassSearch(q.q, (result, data, msg) => {
        //console.log('search callback: result:%b data:%s', result, JSON.stringify(data, null, 2))
        if (result) {
          //sudocms.route('searchResult', 'end')
          sudocms.route('searchResult', 'list', 'class', data)
          sudocms.dispatch('bioClassCache', searchResult.getModel())
        } else {
          sudocms.getThemeMethod().toast(msg)
        }
      })
    })

    sudocms.observe('bioInstanceQuery', (q) => {

      // initialize search result stream
      //sudocms.route('searchResult', 'start')
      sudocms.getStream('searchCache').init(undefined)

      // initiate query
      //if (q.partid !== undefined) {
        bionetapi.partInstanceSearch(q, (result, data, msg) => {
          if (result) {
            //sudocms.route('searchResult', 'end')
            sudocms.route('searchResult', 'list', 'instance', data)
            sudocms.dispatch('bioInstanceCache', searchResult.getModel())
          } else {
            sudocms.getThemeMethod().toast(msg)
          }
        })
      //}
    })

    //---------------------------------------------------------------------
    // search route
    sudocms.addRoute('/q..', function () {
      sudocms.dispatch(sudocms.$.appBarConfig, {
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
        sudocms.dispatch('bioInstanceQuery', qp)
        sudocms.dispatch('searchCache', bioInstanceCache.getModel())
        sudocms.dispatch(sudocms.$.breadcrumbs, [{
            'label': 'search',
            'url': '#!/'
        }, {
            'label': sudocms.getModel('bioClassQuery').q,
            'url': '#!/q' + terms
        }, {
            'label': q.partid,
            'url': '#!/q?partid=' + q.partid
        }
        ]);
      } else {
        sudocms.dispatch('searchCache', bioClassCache.getModel())
        sudocms.dispatch(sudocms.$.breadcrumbs, [{
            'label': 'search',
            'url': '#!/'
        }, {
            'label': sudocms.getModel('bioClassQuery').q,
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
