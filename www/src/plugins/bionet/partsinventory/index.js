const riot = require('riot')
import bionetapi from '../bionetapi'
import _ from 'lodash'


var partsInventory = {
    init: function () {
        require('./parts-inventory.tag.html')

        const inventoryRouter = function (q) {
            //var q = route.query()

            app.appbarConfig({
                enableTopNav: true,
                enableBreadCrumbs: true,
                enableSubbar: false,
                activeItem:'local inventory'
            })

            // todo: set inventory item
            app.setBreadcrumbs([{
                'label': 'local inventory',
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
