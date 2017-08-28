const riot = require('riot')
import bionetapi from '../bionetapi'
import _ from 'lodash'
var MiniSignal = require('mini-signals')

var partsInventory = {
    init: function () {
        require('./parts-inventory.tag.html')
        BIONET.signal.setItemCoordinates = new MiniSignal()

        const setItemCoordinates = function (id, x, y, w, h) {
            console.log('setItemCoordinates:', id, x, y, h, w)
            app.remote.get(id, function (err, data) {
                if (err) {
                    app.error(err)
                    return
                }
                if (h && w) {
                    const locationCoordinates = {
                        x: x,
                        y: y,
                        w: w,
                        h: h
                    }
                    data.locationCoordinates = locationCoordinates
                } else {
                    data.parent_x = x
                    data.parent_y = y
                }
                app.remote.savePhysical(data, null, false, function (err, id) {
                    if (err) {
                        console.log('setItemCoordinates error: %s', err)
                        if (cb) cb(err)
                        return;
                    }
                    console.log('setItemCoordinates result:', JSON.stringify(data, null, 2))
                    BIONET.signal.updateInventoryPath.dispatch(data.parent_id)
                })
            })
        }
        const setItemCoordinatesBinding = BIONET.signal.setItemCoordinates.add(setItemCoordinates)

        const inventoryRouter = function (q) {
            //var q = route.query()

            app.appbarConfig({
                enableTopNav: true,
                enableBreadCrumbs: true,
                enableSubbar: false,
                activeItem: 'local inventory'
            })

            // todo: set inventory item
            app.setBreadcrumbs([{
                'label': 'local inventory',
                'url': '/inventory'
            }]);
            riot.mount('div#content', 'inventory-treeview', {
                q: q
            })
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
