const riot = require('riot')
import bionetapi from '../bionetapi'

const genbankToJson = require('bio-parsers/parsers/genbankToJson');

const MiniSignal = require('mini-signals')
var workbench = {
    init: function () {
        const thisModule = this

        BIONET.signal.getWorkbenchTreeResult = new MiniSignal()

        const getWorkbenchTree = function (root) {
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
                        var coordinates = (data.parent_x !== undefined) ? ' (' + data.parent_x + ',' + data.parent_y + ')' : ''
                        var node = {
                            key: data.id,
                            title: title + coordinates,
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

                BIONET.signal.getWorkbenchTreeResult.dispatch(treeNodes)
            })
        }

        const requestWorkbench = function () {
            app.remote.getWorkbench(function (err, userWorkbench) {
                if (err) {
                    console.log('get workbench err:', err)
                    return
                }
                getWorkbenchTree(userWorkbench)
            })
        }
        BIONET.signal.requestWorkbench = new MiniSignal()
        BIONET.signal.requestWorkbench.add(requestWorkbench)

        const getFavorites = function () {
            app.remote.favLocationsTree(function (err, userFavorites) {
                if (err) {
                    console.log('get favorites err:', err)
                    return
                }
                BIONET.signal.getFavoritesResult.dispatch(userFavorites)
            })
        }
        BIONET.signal.getFavoritesResult = new MiniSignal()
        BIONET.signal.getFavorites = new MiniSignal()
        BIONET.signal.getFavorites.add(getFavorites)

        const saveInWorkbench = function (item) {
            console.log('saveInWorkbench, item:', JSON.stringify(item))
            app.remote.saveInWorkbench(item, null, false, function (err, result) {
                if (err) {
                    console.log('saveInWorkbench: err ', err)
                    app.ui.toast(err);
                    return;
                }
                requestWorkbench()
            })
        }

        const saveToInventory = function (physical, label, doPrint, cb) {
            app.remote.savePhysical(physical, label, doPrint, function (err, id) {
                if (err) {
                    //toast('ERROR saving ' + physicalData.material.name + ' ' + err)
                    console.log(err)
                    if (cb) cb(err)
                    return;
                }
                if (cb) cb(id)
            })
        }

        const generatePhysicals = function (seriesName, instances, container_id, well_id) {
            const parent_id = container_id || app.user.workbenchID
            const instancesList = []
            for (var instance = 0; instance < instances; instance++) {
                // todo: generate hash value for new physical instance to avoid naming collisions
                const name = seriesName + '_' + instance
                var parent_x, parent_y
                if (well_id) {
                    parent_x = well_id.x
                    parent_y = well_id.y
                }
                const dbData = {
                    name: name,
                    type: 'physical',
                    parent_id: parent_id,
                    parent_x: parent_x,
                    parent_y: parent_y
                }
                instancesList.push(dbData)
            }
            if (container_id) {
                var nrem = instancesList.length
                for (var i = 0; i < instancesList.length; i++) {
                    saveToInventory(instancesList[i], null, null, function (n) {
                        if (--nrem <= 0) {
                            //app.ui.toast(instancesList.length + ' items uploaded to inventory');
                            BIONET.signal.refreshInventoryPath.dispatch(container_id)
                        }
                    })
                }
            } else {
                saveInWorkbench(instancesList)
            }
        }.bind(this)
        BIONET.signal.generatePhysicals = new MiniSignal()
        BIONET.signal.generatePhysicals.add(generatePhysicals)

        /*
        generatePhysicalsFromUpload
        parameter: cvsData
        bionet: ["Name","Created By","Created","Description","Sequence","Physical Instances"]
        twist: Plate,Well,customer_line_item_id,line_item_number,order_item_id,Insert Sequence,Insert Length,Frag Analysis Status,synthesized sequence length,Yield (ng)
         */
        
        const generatePhysicalsFromUpload = function (csvData, container_id) {
            if (!csvData) return
            console.log('generatePhysicalsFromUpload csv:', csvData)
            const instancesList = []
            const lines = csvData.match(/[^\r\n]+/g);
            console.log('generatePhysicalsFromUpload lines:', lines)



            const headerLine = lines[0].match(/[^,]+/g)
            console.log('generatePhysicalsFromUpload headerLine:', headerLine)

            const isBionetBulkData = (headerLine.indexOf('customer_line_item_id') < 0)
            console.log('generatePhysicalsFromUpload: isBionet:', isBionetBulkData)

            const bionetBulkUpload = function () {
                const createVirtual = function (virtualObj, physicalInstances, container_id, well_id) {
                    if (!physicalInstances || isNaN(physicalInstances)) return
                    app.remote.saveVirtual(virtualObj, function (err, id) {
                        if (err) return app.ui.toast("Error: " + err) // TODO handle error
                        generatePhysicals(virtualObj.name, physicalInstances, container_id, well_id)
                    });
                }
                const nameIdx = headerLine.indexOf('Name')
                const typeIdx = headerLine.indexOf('Type')
                const usernameIdx = headerLine.indexOf('Created By')
                const createdDateIdx = headerLine.indexOf('Created')
                const descriptionIdx = headerLine.indexOf('Description')
                const sequenceIdx = headerLine.indexOf('Sequence')
                const instancesIdx = headerLine.indexOf('Physical Instances')
                const genomeIdx = headerLine.indexOf('Genome')
                if (nameIdx < 0 || typeIdx < 0 || instancesIdx < 0) {
                    app.toast('invalid format specified, missing name, type or instances')
                    return
                }

                for (var i = 1; i < lines.length; i++) {
                    var line = lines[i].match(/[^,]+/g)
                    console.log('line:%s', JSON.stringify(line))
                    var instances = line[instancesIdx]
                    if (!instances || isNaN(instances)) continue
                    var seriesName = line[nameIdx]
                    var userName = line[usernameIdx]
                    var virtualType = line[typeIdx]
                        //const timeCreated = line[createdDateIdx]
                    var timeCreated = new Date().toDateString()
                    var creator = {
                        user: userName,
                        time: timeCreated
                    }
                    var updated = {
                        user: userName,
                        time: timeCreated
                    }
                    var description = line[descriptionIdx]
                    var sequence = line[sequenceIdx]
                    var genome = line[genomeIdx]
                    var virtualObj = {
                        name: seriesName,
                        type: virtualType,
                        creator: creator,
                        "creator.user": userName,
                        "creator.time": timeCreated,
                        Description: description,
                        Sequence: sequence,
                        Genome: genome
                    }
                    createVirtual(virtualObj, instances, container_id)

                    /*

                getPhysicalResult {"name":"myNewVector01_0","type":"physical","parent_id":"p-40f35523-9884-4361-8eae-e97466e7b25d","id":"p-9820ba76-5ff0-4270-bbc3-07079a796b76","created":{"user":"tsakach@gmail.com","time":1499278758},"updated":{"user":"tsakach@gmail.com","time":1499278758}}

                {"type":"vector","name":"myNewVector02","creator":{"user":"tsakach@gmail.com","time":"Wed Jul 05 2017"},"Description":"v02","Sequence":"abba","creator.user":"tsakach@gmail.com","creator.time":"Wed Jul 05 2017","Genotype":"abcd"}"
                */
                }
            }

            const twistBulkUpload = function () {
                const createVirtual = function (virtualObj, physicalInstances, container_id, well_id) {
                    if (!physicalInstances || isNaN(physicalInstances)) return
                    app.remote.saveVirtual(virtualObj, function (err, id) {
                        if (err) return app.ui.toast("Error: " + err) // TODO handle error
                        generatePhysicals(virtualObj.name, physicalInstances, container_id, well_id)
                    });
                }
                const nameIdx = headerLine.indexOf('customer_line_item_id')
                    //const typeIdx = headerLine.indexOf('Type')
                    //const usernameIdx = headerLine.indexOf('Created By')
                    //const createdDateIdx = headerLine.indexOf('Created')
                    //const descriptionIdx = headerLine.indexOf('Description')
                const sequenceIdx = headerLine.indexOf('Insert Sequence')
                    //const instancesIdx = headerLine.indexOf('Physical Instances')
                    //const genomeIdx = headerLine.indexOf('Genome')
                const wellIdx = headerLine.indexOf('Well')

                for (var i = 1; i < lines.length; i++) {
                    var line = lines[i].match(/[^,]+/g)
                    console.log('line:%s', JSON.stringify(line))
                        //var instances = line[instancesIdx]
                    var instances = 1
                    if (!instances || isNaN(instances)) continue
                    var seriesName = line[nameIdx]
                    var well_id_str = line[wellIdx]
                    var well_x = Number(well_id_str.substr(1))
                    var well_y = well_id_str.charCodeAt(0) - 64
                    var well_id = {
                            x: well_x,
                            y: well_y
                        }
                        //var userName = line[usernameIdx]
                    var userName = app.user.email
                        //var virtualType = line[typeIdx]
                    var virtualType = 'vector'
                        //const timeCreated = line[createdDateIdx]
                    var timeCreated = new Date().toDateString()
                    var creator = {
                        user: userName,
                        time: timeCreated
                    }
                    var updated = {
                            user: userName,
                            time: timeCreated
                        }
                        //var description = line[descriptionIdx]
                    var sequence = line[sequenceIdx]
                        //var genome = line[genomeIdx]
                    var virtualObj = {
                        name: seriesName,
                        type: virtualType,
                        creator: creator,
                        "creator.user": userName,
                        "creator.time": timeCreated,
                        Sequence: sequence
                    }
                    createVirtual(virtualObj, instances, container_id, well_id)
                }
            }

            if (isBionetBulkData) {
                bionetBulkUpload()
            } else {
                twistBulkUpload()
            }
            saveInWorkbench(instancesList)

        }.bind(this)
        BIONET.signal.generatePhysicalsFromUpload = new MiniSignal()
        BIONET.signal.generatePhysicalsFromUpload.add(generatePhysicalsFromUpload)

        const generatePhysicalsFromTwistUpload = function (csvData, container_id) {
            console.log('generatePhysicalsFromUpload:', csvData)
            const instancesList = []
            const lines = csvData.match(/[^\r\n]+/g);

            const createVirtual = function (virtualObj, physicalInstances, container_id, well_id) {
                    if (!physicalInstances || isNaN(physicalInstances)) return
                    app.remote.saveVirtual(virtualObj, function (err, id) {
                        if (err) return app.ui.toast("Error: " + err) // TODO handle error
                        generatePhysicals(virtualObj.name, physicalInstances, container_id, well_id)
                    });
                }
                // line:["Name","Created By","Created","Description","Sequence","Physical Instances"]
                /*
Plate,Well,customer_line_item_id,line_item_number,order_item_id,Insert Sequence,Insert Length,Frag Analysis Status,synthesized sequence length,Yield (ng)            */
            const headerLine = lines[0].match(/[^,]+/g)
            const nameIdx = headerLine.indexOf('customer_line_item_id')
                //const typeIdx = headerLine.indexOf('Type')
                //const usernameIdx = headerLine.indexOf('Created By')
                //const createdDateIdx = headerLine.indexOf('Created')
                //const descriptionIdx = headerLine.indexOf('Description')
            const sequenceIdx = headerLine.indexOf('Insert Sequence')
                //const instancesIdx = headerLine.indexOf('Physical Instances')
                //const genomeIdx = headerLine.indexOf('Genome')
            const wellIdx = headerLine.indexOf('Well')

            for (var i = 1; i < lines.length; i++) {
                var line = lines[i].match(/[^,]+/g)
                console.log('line:%s', JSON.stringify(line))
                    //var instances = line[instancesIdx]
                var instances = 1
                if (!instances || isNaN(instances)) continue
                var seriesName = line[nameIdx]
                var well_id_str = line[wellIdx]
                var well_x = Number(well_id_str.substr(1))
                var well_y = well_id_str.charCodeAt(0) - 64
                var well_id = {
                        x: well_x,
                        y: well_y
                    }
                    //var userName = line[usernameIdx]
                var userName = app.user.email
                    //var virtualType = line[typeIdx]
                var virtualType = 'vector'
                    //const timeCreated = line[createdDateIdx]
                var timeCreated = new Date().toDateString()
                var creator = {
                    user: userName,
                    time: timeCreated
                }
                var updated = {
                        user: userName,
                        time: timeCreated
                    }
                    //var description = line[descriptionIdx]
                var sequence = line[sequenceIdx]
                    //var genome = line[genomeIdx]
                var virtualObj = {
                    name: seriesName,
                    type: virtualType,
                    creator: creator,
                    "creator.user": userName,
                    "creator.time": timeCreated,
                    Sequence: sequence
                }
                createVirtual(virtualObj, instances, container_id, well_id)
            }
            saveInWorkbench(instancesList)
        }.bind(this)


        BIONET.signal.generatePhysicalsFromTwistUpload = new MiniSignal()
        BIONET.signal.generatePhysicalsFromTwistUpload.add(generatePhysicalsFromTwistUpload)

        const createVirtual = function (virtualObj, physicalInstances, container_id) {
            if (!physicalInstances) return
            app.remote.saveVirtual(virtualObj, function (err, id) {
                if (err) return app.ui.toast("Error: " + err) // TODO handle error
                generatePhysicals(virtualObj.name, physicalInstances, container_id)
            });
        }

        const generatePhysicalFromGenbankUpload = function (filename, gbData, container_id) {
            genbankToJson(gbData, function (results) {

                if (!results || !results.length) {
                    return app.ui.toast("Error reading file: " + filename);
                }

                var i, data;
                for (i = 0; i < results.length; i++) {
                    if (!results[i].success) {
                        console.error("Error:", results.messages);
                        return app.ui.toast("Error reading file: " + filename);
                    }
                    data = results[i].parsedSequence;

                    if (!data || !data.name) {
                        return app.ui.toast("Error reading file: " + filename);
                    }

                    // if no description, generate description from features
                    if (!data.description || !data.description.trim()) {
                        data.description = (data.features) ? data.features.map(function (feat) {
                            return feat.name;
                        }).join(', ') : '';

                    }

                    var virtualObj = {
                        name: data.name,
                        type: 'vector',
                        Description: data.description,
                        Sequence: data.sequence,
                        filename: filename
                    }
                    createVirtual(virtualObj, 1, container_id);
                }
            }, {
                isProtein: false
            })
        }

        BIONET.signal.generatePhysicalFromGenbankUpload = new MiniSignal()
        BIONET.signal.generatePhysicalFromGenbankUpload.add(generatePhysicalFromGenbankUpload)

        require('./workbench.tag.html')

        const workbenchRouter = function (q) {

            app.appbarConfig({
                enableTopNav: true,
                enableBreadCrumbs: true,
                enableSubbar: false,
                activeItem: 'workbench'
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
