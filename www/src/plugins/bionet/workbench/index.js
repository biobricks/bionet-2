const riot = require('riot')
import bionetapi from '../bionetapi'
const MiniSignal = require('mini-signals')

var workbench = {
    init: function () {
        const workbench = app.addStreamRouter('workbench')
        const bionetSetup = app.getStream('bionetSetup')

        const workbenchData = new MiniSignal()
        app.addStream('workbenchData', workbenchData)

        const workbenchMsgHandler = {
            //workbenchData.dispatch('generatePhysicals', {name:seriesName, instances:instances, parent:parentId})
            generatePhysicals: function (msg) {
                const seriesName = msg.name
                const instances = msg.instances
                const workbenchId = app.user.workbenchID
                for (var instance = 0; instance < instances; instance++) {
                    // todo: generate hash value for new physical instance
                    const name = seriesName + '_' + instance
                    const dbData = {
                        name: name,
                        type: 'physical',
                        parent_id: workbenchId
                    }
                    console.log('addNode: %s', instances, JSON.stringify(dbData))
                        // TODO: messaging async api call
                        // todo: invoke local save function
                    workbench.route('saveInWorkbench', undefined, dbData)
                }
            }
        }

        const onWorkbenchDataEvent = function (cmd, msg) {
            workbenchMsgHandler[cmd](msg)
        }
        const eventBinding = workbenchData.add(onWorkbenchDataEvent);

        workbench.addRoute('requestWorkbench', function () {
            console.log('requestWorkbench')
            app.remote.getWorkbench(function (err, userWorkbench) {
                console.log('requestWorkbench result:', JSON.stringify(userWorkbench), err)
                    // TODO: messaging async api call
                workbench.route('requestWorkbenchResult', undefined, userWorkbench)
            })
        })

        workbench.addRoute('getWorkbenchTree', function (root) {
            const cartData = []
            app.remote.workbenchTree(function (err, result) {

                // reconstruct inventory hierarchy sent as array as a single json object
                console.log('getWorkbenchTree result:', JSON.stringify(result), err)
                if (err) return console.error(err);
                var matches = [];
                const nodes = {};
                var q = ''
                var children = result
                const matchAll = (q === undefined || q.length === 0) ? true : false

                var rootNode = {
                    key: root.id,
                    title: 'workbench',
                    dbData: root,
                    parentId: root.parent_id,
                    children: []
                }
                nodes[root.id] = rootNode

                var i, cur, indent, a;
                for (i = 0; i < children.length; i++) {
                    cur = children[i].path;
                    if (cur.match(q) || matchAll) matches.push(cur);
                }

                var j, m, add, perfect;
                for (i = 0; i < children.length; i++) {
                    cur = children[i].path;
                    a = cur.split('.');
                    indent = a.length - 1;
                    add = false
                    perfect = false
                    for (j = 0; j < matches.length; j++) {
                        m = matches[j];
                        if (m.indexOf(cur) === 0) {
                            add = true;
                            if (m.length === cur.length) perfect = true;
                            break;
                        }
                    }
                    if (add) {
                        const data = children[i].value
                            //console.log('inventory re value:', JSON.stringify(data))
                        var key = children[i].key
                        var parentId = data.parent_id
                            //var title = a[a.length - 1]
                        var title = data.name
                        var node = {
                            key: data.id,
                            title: title,
                            dbData: data,
                            notes: data.notes,
                            barcode: data.barcode,
                            parentId: parentId,
                            children: []
                        }
                        console.log('adding %s %s, parent %s', node.title, node.key, node.parentId)
                        nodes[data.id] = node
                    }
                }
                // pass two - add children to tree
                Object.keys(nodes).forEach(function (key, index) {
                        var node = nodes[key]
                        var parentId = node.parentId
                        if (parentId && nodes[parentId]) {
                            nodes[parentId].children.push(node)
                                //console.log('adding %s to %s',node.title,nodes[parentId].title)
                        }
                    })
                    //console.log('inventory step 1:', JSON.stringify(nodes,null,2))
                    // pass three - remove children from top level
                const treeNodes = []
                Object.keys(nodes).forEach(function (key, index) {
                        var node = nodes[key]
                        if (node.parentId === undefined) {
                            treeNodes.push(node)
                        }
                    })
                    //console.log('inventory step 2:', JSON.stringify(treeNodes,null,2))
                    //bionetSetup.route('storage', undefined, treeNodes)

                // TODO: messaging async api call
                workbench.route('getWorkbenchTreeResult', undefined, treeNodes)
            })
        })

        workbench.addRoute('saveInWorkbench', function (item) {
            console.log('saveInWorkbench, item:', JSON.stringify(item))
            app.remote.saveInWorkbench(item, null, false, function (err, result) {
                if (err) {
                    console.log('saveInWorkbench: err ', err)
                    app.ui.toast(err);
                    return;
                }
                console.log('saveInWorkbench result:', JSON.stringify(result))
                    // TODO: messaging async api call
                workbench.route('requestWorkbench')
            })
        })

        require('./workbench.tag.html')

        const workbenchRouter = function (q) {

            app.appbarConfig({
                enableTopNav: true,
                enableBreadCrumbs: true,
                enableSubbar: false
            })

            // todo: set inventory item
            app.setBreadcrumbs([{
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
