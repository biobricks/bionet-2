const riot = require('riot')
import bionetapi from '../bionetapi'
import _ from 'lodash'
var MiniSignal = require('mini-signals')

var partsInventory = {
    init: function () {
        require('./parts-inventory.tag.html')
        BIONET.signal.setItemCoordinates = new MiniSignal()
        
        BIONET.signal.highlightItem = new MiniSignal()
        BIONET.signal.selectInventoryItem = new MiniSignal()
        BIONET.signal.setSelectionMode = new MiniSignal()
        BIONET.signal.refreshInventoryPath = new MiniSignal()
        BIONET.signal.savePhysicalProperties = new MiniSignal()
        BIONET.signal.setLayout = new MiniSignal()

        BIONET.NAV_SELECTION= 'nav'
        BIONET.EDIT_SELECTION= 'edit'
        BIONET.MOVE_SELECTION= 'moveLocation'
        
        BIONET_DATAGRID.init()

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
                    //BIONET.signal.updateInventoryPath.dispatch(data.parent_id)
                    BIONET.signal.refreshInventoryPath.dispatch(data.parent_id)
                })
            })
        }
        const setItemCoordinatesBinding = BIONET.signal.setItemCoordinates.add(setItemCoordinates)
        
        const savePhysicalProperties = function(id, properties) {
            app.remote.get(id, function (err, data) {
                _.merge(data,properties)
                console.log('savePhysicalProperties:',properties, data)
                app.remote.savePhysical(data, null, null, function (err, id) {
                })
            })
        }
        const savePhysicalPropertiesBinding = BIONET.signal.savePhysicalProperties.add(savePhysicalProperties)

        const inventoryRouter = function (q) {
            //var q = route.query()

            app.appbarConfig({
                enableTopNav: false,
                enableBreadCrumbs: true,
                enableSubbar: false,
                activeItem: 'local inventory'
            })

            // todo: set inventory item
            app.setBreadcrumbs([{
                'label': 'local inventory',
                'url': '/inventory'
            }]);
            //riot.mount('div#content', 'inventory-treeview', {
            riot.mount('div#content', 'parts-inventory', {
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
