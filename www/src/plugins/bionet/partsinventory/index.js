const riot=require('riot')
import bionetapi from '../bionetapi'
import _ from 'lodash'


var partsInventory = {
  init: function () {
    require('./parts-inventory.tag.html')



    route('/inventory..', function () {
      var q = route.query()

      app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: true,
        enableSubbar: false
      })
      
      // todo: set inventory item
      app.dispatch(app.$.breadcrumbs, [{
        'label': 'inventory',
        'url': '/inventory'
      }]);
      
      riot.mount('div#content', 'parts-inventory', q)


    })


  },
  remove: function () {

  }
}
module.exports = partsInventory
