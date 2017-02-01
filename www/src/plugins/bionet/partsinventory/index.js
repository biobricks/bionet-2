const riot = require('riot')
import bionetapi from '../bionetapi'
import _ from 'lodash'


var partsInventory = {
    init: function () {
        require('./parts-inventory.tag.html')

        const inventoryRouter = function (q) {
            //var q = route.query()

            app.dispatch(app.$.appBarConfig, {
                enableTopNav: true,
                enableBreadCrumbs: true,
                enableSubbar: false
            })

            // todo: set inventory item
            app.dispatch(app.$.breadcrumbs, [{
                'label': 'workbench',
                'url': '/inventory'
            }]);
            riot.mount('div#content', 'inventory-treeview', {q:q})
        }
        route('/inventory', function () {
            inventoryRouter();
        })

        route('/inventory/*', function (q) {
            inventoryRouter(q);
        })
    },
    remove: function () {

    }
}
module.exports = partsInventory
