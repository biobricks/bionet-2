import riot from 'riot'
import bionetapi from '../bionetapi'
import _ from 'lodash'

var partsInventory = {
  init: function () {
    require('./parts-inventory.tag.html')

    app.addStream('inventoryQuery')
    const inventorySearchResult = app.addStreamRouter('inventorySearchResult')
    const inventory = app.addStream('inventory').init(undefined)
    const inventoryCache = app.addStream('inventoryCache').init(undefined)

    app.observe('inventoryQuery', (q) => {

      app.getStream('searchCache').init(undefined)
      console.log('inventory query:', JSON.stringify(q))
        // initiate query
      bionetapi.partInstanceSearch(q, (result, data, msg) => {
        if (result) {
          app.route('inventorySearchResult', 'list', 'instance', data)
          app.dispatch('inventoryCache', inventorySearchResult.getModel())
        } else {
          app.getThemeMethod().toast(msg)
        }
      })
    })

    inventorySearchResult.reduceRoute('instance', (m, streamItem) => {
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

    app.addRouteDestination('inventorySearchResult', 'list', function (list2) {

      // sort inventory by location id
      // todo: return sorted result from elasticsearch

      console.log('inventory search result, list=%s', JSON.stringify(list2, null, 2))

      var list = JSON.parse(JSON.stringify(list2))
      list.sort(function (a, b) {
        if (a.primary_text < b.primary_text) return -1
        if (a.primary_text > b.primary_text) return 1
        return 0
      })

      // traverse list and generate inventory tree
      var inventoryType = {
        F: 'Freezer',
        S: 'Shelf',
        C: 'Cassette'
      }

      var inventoryTree = {}
      for (var i = 0; i < list.length; i++) {
        var item = list[i]
        _.setWith(inventoryTree, item.primary_text, item)
          /*
        const idList = item.primary_text.split(.)
          for (var j = 1; j < idList.length; j++) {
            const id = idList[j]
            const lcode = id.charAt(0)
            const loctype = inventoryType[lcode]
            _.setWith(inventoryTree,)
          }
          */
      }

      console.log('inventory search result, list=%s', JSON.stringify(inventoryTree, null, 2))
      app.dispatch('inventory', inventoryTree)
        //app.dispatch('inventory', list)
    })

    app.addRoute('/inventory..', function () {
      const q = riot.route.query()
      console.log('route: inventory')
        //app.dispatch('getPartsList', q)
      app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: true,
        enableSubbar: false
      })

      // todo: set inventory item
      app.dispatch(app.$.breadcrumbs, [{
        'label': 'inventory',
        'url': '#!/'
      }, {
        'label': 'BBa',
        'url': '#!/inventory'
      }]);

      riot.mount('div#content', 'parts-inventory')
    })


  },
  remove: function () {

  }
}
module.exports = partsInventory
