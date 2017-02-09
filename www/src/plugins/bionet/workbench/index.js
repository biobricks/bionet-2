const riot = require('riot')
import bionetapi from '../bionetapi'

var workbench = {
    init: function () {
        const workbench = app.addStreamRouter('workbench')
        const bionetSetup = app.getStream('bionetSetup')

        workbench.addRoute('requestWorkbench', function () {
            console.log('requestWorkbench')
            app.remote.getWorkbench(function (err, userWorkbench) {
                console.log('requestWorkbench result:', JSON.stringify(userWorkbench))
                bionetSetup.route('requestStorage', undefined, userWorkbench.name)
                    //bionetSetup.route('storage', undefined, treeNodes)
                    //workbench.route('workbenchResult', undefined, result)
            })
        })

        workbench.addRoute('getWorkbenchTree', function () {
            const cartData = []
            app.remote.workbenchTree(function (err, result) {
                console.log('getWorkbenchTree result:', JSON.stringify(result))
                workbench.route('workbenchTreeResult', undefined, result)
            })
        })

        workbench.addRoute('saveInWorkbench', function (item) {
            console.log('saveInWorkbench, item:', JSON.stringify(item))
            app.remote.saveInWorkbench(item, null, false, function (err, result) {
                if (err) {
                    console.log('saveInWorkbench: err ', err)
                    return
                }
                console.log('saveInWorkbench result:', JSON.stringify(result))
                workbench.route('requestWorkbench')
            })
        })

        require('./workbench.tag.html')

        const workbenchRouter = function (q) {

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
            riot.mount('div#content', 'inventory-treeview', {
                q: q
            })
        }
        route('/workbench', function () {
            workbenchRouter();
        })

        route('/workbench/*', function (q) {
            workbenchRouter(q);
        })
    },
    remove: function () {

    }
}
module.exports = workbench
