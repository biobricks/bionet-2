const riot = require('riot')
const route = require('riot-route')

// is this string formatted like a UUID?
function isUUID(str) {
    str = str.trim().toLowerCase();

    // Strip off initial "v-" or "p-" if needed
    if (str.match(/^[vp]-/)) {
        str = str.slice(2);
    }

    return !!str.match(/^[\da-z]{8}-[\da-z]{4}-[\da-z]{4}-[\da-z]{4}-[\da-z]{12}$/)
}

route('/', function () {
    app.appbarConfig({
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false,
        activeItem: 'home'
    })
    riot.mount('div#content', 'welcome')
})


route('/logout', function () {
    console.log("logout route...");
    app.rpc.logout(function (err) {
        if (err) {
            app.ui.toast("Error logout route: " + err) // TODO handle better
            return;
        }
        route('/');
    });
})

route('/create-unknown/*', function (name) {
    app.appbarConfig({
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })
    riot.mount('div#content', 'create-unknown')
})

route('/create', function () {
    app.appbarConfig({
        enableTopNav: true,
        enableBreadCrumbs: true,
        enableSubbar: false,
        activeItem: 'workbench'
    })
    riot.mount('div#content', 'create-form')
})

route('/scan', function () {
    app.appbarConfig({
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false,
        activeItem: 'scan'
    })
    riot.mount('div#content', 'scan-page')
})


route('/o/*', function (idenc) {
    app.appbarConfig({
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false,
        activeItem: 'local inventory'
    })

    const id = decodeURIComponent(idenc)
    console.log('get object route:', id)

    //app.remote.getByHumanID(id, function (err, m) {
    app.remote.getBy('name', id, function (err, m) {
        if (err || !m) {
            app.ui.toast("Item " + id + " not found in inventory");
            console.log("route o: item %s not found in inventory", id)
            return;
        }
        console.log("route o: item %s found in inventory: %s", id, m.id)
        route('/inventory/' + m.id);
    });

    //    setTimeout(function () {
    //        app.remote.getByHumanID(id, function (err, m) {
    //            riot.mount('div#content', 'view-physical', m)
    //        });
    //    }, 500);
})

// TODO remove again
route('/print', function () {
    app.appbarConfig({
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })
    riot.mount('div#content', 'print')
})

function editPhysicalRoute(typeOrID) {
    app.appbarConfig({
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })

    var opts = {};

    typeOrID = decodeURIComponent(typeOrID).trim()


    if (isUUID(typeOrID)) {
        if (typeOrID.match(/^p-/)) {
            opts.physicalID = typeOrID
        } else {
            opts.virtualID = typeOrID
        }
    } else {
        opts.type = typeOrID
    }
    console.log('edit physical id: %s route: %s', typeOrID, JSON.stringify(opts))
    riot.mount('div#content', 'create-physical', opts);
}

route('/edit-physical/*', editPhysicalRoute);


function createPhysicalRoute(typeOrID, q) {

    app.appbarConfig({
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })

    var opts = {
        query: q || {}
    }
    typeOrID = decodeURIComponent(typeOrID).trim()

    opts.type = typeOrID

    if (isUUID(typeOrID)) {
        opts.virtualID = typeOrID
    } else {
        opts.type = typeOrID
    }

    riot.mount('div#content', 'create-physical', opts);
}

route('/create-physical/*', createPhysicalRoute);

route('/create-physical/*/..', function (typeOrID) {
    var q = route.query()
    createPhysicalRoute(typeOrID, q);
});


route('/foo', function () {
    app.appbarConfig({
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })
    riot.mount('div#content', 'foo')
})
