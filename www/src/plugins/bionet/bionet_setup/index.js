const riot = require('riot')
import bionetapi from '../bionetapi'

require('./bionet-setup-storage.tag.html')
require('./bionet-setup-schemas.tag.html')
require('./bionet-setup-strains.tag.html')

var bionetSetup = {
    init: function () {
        // setup streams and routes
        const bionetSetup = app.addStreamRouter('bionetSetup')

        bionetSetup.addRoute('requestSchemas', function () {
            const schemaData = []
            const dataTypes = app.getAppSettings().dataTypes
            var key = 1
            for (var i = 0; i < dataTypes.length; i++) {
                var dataType = dataTypes[i]
                var node = {
                    title: dataType.name,
                    key: key.toString(),
                    type: '',
                    children: []
                }
                key++
                var fields = app.getAttributesForType(dataType.name)
                for (var j = 0; j < fields.length; j++) {
                    var field = fields[j]
                    var nodeType = {
                        title: field.name,
                        key: key.toString(),
                        type: field.value
                    }
                    key++
                    node.children.push(nodeType)
                }
                schemaData.push(node)
            }
            // TODO: messaging async api call
            bionetSetup.route('schemas', undefined, schemaData)
        })

        bionetSetup.addRoute('requestStorage', function (q) {
            app.remote.inventoryTree(function (err, children) {
                if (err) return console.error(err);

                var matches = [];
                //const nodes = [];
                const nodes = {};
                const matchAll = (q === undefined || q.length === 0) ? true : false

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
                // TODO: messaging async api call
                bionetSetup.route('storage', undefined, treeNodes)
            });
        })

        bionetSetup.addRoute('createStorageItem', function (storageItem) {
            console.log('createStorageItem:', JSON.stringify(storageItem))
            app.remote.savePhysical(storageItem, null, false, function (err, id) {
                if (err) {
                    console.log('createStorageItem error: %s', err)
                    if (cb) cb(err)
                    return;
                }
                console.log('createStorageItem saved, id:', id)
                const updatedStorageItem = JSON.parse(JSON.stringify(storageItem))
                updatedStorageItem.id = id
                // TODO: messaging async api call
                bionetSetup.route('createStorageItemResult', undefined, updatedStorageItem)
            })
        })


        bionetSetup.addRoute('getPhysical', function (id) {
            app.remote.get(id, function (err, data) {
                if (err) {
                    app.error(err)
                    return
                }
                // TODO: messaging async api call
                bionetSetup.route('getPhysicalResult', undefined, data)
            })
        })

        bionetSetup.addRoute('updateStorageItem', function (storageItem) {
            console.log('updateStorageItem:', JSON.stringify(storageItem))
            app.remote.savePhysical(storageItem, null, false, function (err, id) {
                if (err) {
                    console.log('updateStorageItem error: %s', err)
                    if (cb) cb(err)
                    return;
                }
                console.log('updateStorageItem saved')
            })
        })

        bionetSetup.addRoute('delPhysical', function (id) {
            console.log('delPhysical:', JSON.stringify(id))
            app.remote.delPhysical(id, function (err, cbid) {
                if (err) {
                    console.log('delPhysical error: %s', err)
                    if (cb) cb(err)
                    return;
                }
                console.log('delPhysical %s deleted', id)
            })
        })


        bionetSetup.addRoute('requestStrains', function () {})

        // process setup message
        bionetSetup.observe(function (setup) {
            return;
            console.log('bionetSetup:', JSON.stringify(setup))
            console.log('Configuring entity:', setup.entityName)
            var i
            console.log('creating layout items')

            for (i = 0; i < setup.labStorageLayout.length; i++) {
                const layoutItem = setup.labStorageLayout[i]
                console.log('\tcreating %s %s', layoutItem.type, layoutItem.name)
                    /*
                    app.remote.savePhysical(layoutItem, null, null, function (err, id) {
                        if (err) {
                            console.log('\terror creating %s %s Error:%s', layoutItem.type, layoutItem.name, err)
                        } else {
                            console.log('\tcreated %s %s', layoutItem.type, layoutItem.name)
                        }
                    })
                    */
            }

            console.log('creating schemas')
            for (i = 0; i < setup.schemas.length; i++) {
                const schema = setup.schemas[i]
                console.log('\tcreating %s', schema.name)
            }

            console.log('creating strains')
            for (i = 0; i < setup.strains.length; i++) {
                const strain = setup.strains[i]
                console.log('\tcreating %s', strain.name)
            }
        })

        app.editTextElement = function (e, active) {
            e.preventDefault();
            e.stopPropagation();
            const ARROW_LEFT = 37,
                ARROW_UP = 38,
                ARROW_RIGHT = 39,
                ARROW_DOWN = 40,
                ENTER = 13,
                ESC = 27,
                TAB = 9

            const activeOptions = {
                cloneProperties: ['top', 'left', 'padding', 'padding-bottom', 'padding-left', 'padding-right',
                        'text-align', 'font', 'font-size', 'font-family', 'font-weight',
                        'border', 'border-top', 'border-bottom', 'border-left', 'border-right'
                    ],
                editor: $('<input>')
            }

            const editor = activeOptions.editor.css('position', 'absolute').hide().appendTo(active.parent())

            const showEditor = function (select) {
                console.log('showEditor')
                    //.width(active.width())
                    //.width(parent.outerWidth()-active.position().left)
                    //const parent = active;
                const parent = active.parent();
                editor.val(active.text())
                    .removeClass('error')
                    .offset(active.offset())
                    .css(active.css(activeOptions.cloneProperties))
                    .width(parent.width())
                    .height(active.height())
                if (select) {
                    active.hide()
                    editor.show()
                    editor.focus()
                    editor.select();
                } else {
                    active.show();
                }
                active.css('cursor', 'pointer')
                active.keydown(function (e) {
                    console.log('active keydown ', e.which)
                    var prevent = true
                        //possibleMove = movement($(e.target), e.which);
                    var possibleMove
                    if (possibleMove.length > 0) {
                        possibleMove.focus();
                    } else if (e.which === ENTER) {
                        showEditor(false);
                    } else if (e.which === 17 || e.which === 91 || e.which === 93) {
                        showEditor(true);
                        prevent = false;
                    } else {
                        prevent = false;
                    }
                    if (prevent) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                });
            }
            const setActiveText = function () {
                var text = editor.val(),
                    evt = $.Event('change'),
                    originalContent;
                if (active.text() === text || editor.hasClass('error')) {
                    return true;
                }
                originalContent = active.html();
                active.text(text).trigger(evt, text);
                if (evt.result === false) {
                    active.html(originalContent);
                }
            }
            const movement = function (element, keycode) {
                if (keycode === ARROW_RIGHT) {
                    return element.next('td');
                } else if (keycode === ARROW_LEFT) {
                    return element.prev('td');
                } else if (keycode === ARROW_UP) {
                    return element.parent().prev().children().eq(element.index());
                } else if (keycode === ARROW_DOWN) {
                    return element.parent().next().children().eq(element.index());
                }
                return [];
            };
            editor.blur(function () {
                setActiveText();
                editor.remove();
                active.show();
            })
            editor.keydown(function (e) {
                console.log('editor keydown ', e.which)
                if (e.which === ENTER) {
                    setActiveText();
                    editor.hide();
                    active.show();
                    active.focus();
                    //e.preventDefault();
                    //e.stopPropagation();
                } else if (e.which === ESC) {
                    editor.val(active.text());
                    e.preventDefault();
                    e.stopPropagation();
                    editor.hide();
                    active.show();
                    active.focus();
                } else if (e.which === TAB) {
                    active.show();
                    active.focus();
                } else if (this.selectionEnd - this.selectionStart === this.value.length) {
                    /*
                    var possibleMove = movement(active, e.which);
                    if (possibleMove.length > 0) {
                        possibleMove.focus();
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    */
                }
            })
            editor.on('input paste', function () {
                var evt = $.Event('validate');
                active.trigger(evt, editor.val());
                if (evt.result === false) {
                    editor.addClass('error');
                } else {
                    editor.removeClass('error');
                }
            });
            showEditor(true)
        }


        // routes
        route('/bionetsetup/*', function (section) {
            const opts = {}
            var tagName = 'bionet-setup-storage'
            switch (section) {
                case 'storage':
                    tagName = 'bionet-setup-storage'
                    break;
                case 'schemas':
                    tagName = 'bionet-setup-schemas'
                    break;
                case 'strains':
                    tagName = 'bionet-setup-strains'
                    break;
            }
            riot.mount('div#content', tagName, opts)
        })
    },
    remove: function () {}
}
module.exports = bionetSetup
