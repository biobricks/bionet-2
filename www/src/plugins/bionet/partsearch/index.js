const riot = require('riot')
import bionetapi from '../bionetapi'

var partsearch = {
    init: function () {

        //-------------------------------------------------------------------------
        // search
        require('./search-result.tag.html')

        // TODO are these still used?
        app.addStream('bioClassQuery')
        app.addStream('bioInstanceQuery')
        const bioPhysicalQuery = app.addStream('bioPhysicalQuery')
        const searchResult = app.addStreamRouter('searchResult')
        const searchCache = app.addStream('searchCache').init(undefined)
        const bioClassCache = app.addStream('bioClassCache').init(undefined)
        const bioInstanceCache = app.addStream('bioInstanceCache').init(undefined)

        bioPhysicalQuery.reduceRoute('toQueryItem', (m, partData) => {
            return {
                id: partData.datamatrix,
                name: partData.name,
                cassetteid: partData.cassetteid,
                locationid: partData.locationid
            }
        })

        searchResult.reduceRoute('toListItem', (m, partList) => {
            const convertItem = function (partData) {
                return {
                    primary_text: partData.name,
                    secondary_text: partData.id + ' ' + partData.cassetteid + ' ' + partData.locationid,
                    data: partData
                }
            }
            const listItem = []
            for (var i = 0; i < partList.length; i++) {
                listItem.push(convertItem(partList[i]))
            }
            return listItem
        })

        app.observe('bioPhysicalQuery', (q) => {
            app.remote.instancesOfVirtual(q, function (err, data) {
                app.route('searchResult', 'updateList', 'toListItem', data)
            })
        })

        /*

        app.remote.inventoryTree(function (err, children) {
            if (err) return console.error(err);

            // TODO rewrite this matching algorithm 
            //      so we can do single-pass matching
            //      so we can use a stream
            //      And move it to the level-tree-index module

            var matches = [];
            var nodes = [];

            var i, cur, indent, a;
            for (i = 0; i < children.length; i++) {
                cur = children[i].path;
                if (cur.match(q)) matches.push(cur);
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
                    const bioPhysical = {
                        indent: indent,
                        url: 'edit-physical/' + children[i].path + "/?id=" + children[i].key,
                        primary_text: a[a.length - 1],
                        id: children[i].key,
                        highlight: perfect
                    };
                    nodes.push(bioPhysical)
                }
            }
            app.route('searchResult', 'list', null, nodes)
        });
        */

        /*
                return {
                  url: '/edit/' + x.id,
                  secondary_url: '/q?partid=' + x.id,
                  secondary_url_label: 'view availabilty',
                  righticon: 'star',
                  primary_text: x.id,
                  secondary_text: x.description,
                  starred: false,
                  data: x.data
        */

        //---------------------------------------------------------------------
        // search route
        app.addRoute('/q..', function () {
            app.dispatch(app.$.appBarConfig, {
                enableTopNav: true,
                enableBreadCrumbs: true,
                enableSubbar: false
            })

            // todo: handle pagination
            const q = route.query()
            if (q.page !== undefined) {
                console.log('search result page: ' + q.page)
            }
            const termsURL = (q.terms !== undefined) ? '?terms=' + q.terms : ''

            q.terms = decodeURIComponent(q.terms)

            app.dispatch(app.$.breadcrumbs, [{
                'label': 'search',
                'url': '/'
              }, {
                'label': q.terms,
                'url': '/q' + termsURL
              }]);

            setTimeout(function () { // TODO remove timeout

                app.remote.elasticSearch(q.terms, function (err, results) {
                    if (err) return console.error(err); // TODO handle error better

                    q.results = [];
                    var i;
                    for (i = 0; i < results.length; i++) {
                        const result = results[i]._source
                        if (!result || !result.name) continue;
                        console.log('result:',JSON.stringify(results[i] ))
                        const isVirtual = result.id.charAt(0)==='v'
                        q.results.push({
                            primary_text: result.name,
                            secondary_text: ((isVirtual) ? 'virtual' : 'physical') +' id '+result.id,
                            url: '/edit/'+result.id,
                            id: result.id
                        });
                    }

                    riot.mount('div#content', 'search-result', q)

                });
            }, 500);
        })
    },
    remove: function () {

    }
}
module.exports = partsearch
