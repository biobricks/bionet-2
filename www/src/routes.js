const riot =require('riot')
const route =require('riot-route')

// is this string formatted like a UUID?
function isUUID(str) {
  str = str.trim().toLowerCase();

  // Strip off initial "v-" or "p-" if needed
  if(str.match(/^[vp]-/)) {
    str = str.slice(2);
  }

  return !!str.match(/^[\da-z]{8}-[\da-z]{4}-[\da-z]{4}-[\da-z]{4}-[\da-z]{12}$/)
}

route('/', function () {
    app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })
    riot.mount('div#content', 'welcome')
})


route('/logout', function () {
    console.log("logout route...");
    app.logout(function (err) {
        if (err) {
            app.ui.toast("Error logout route: " + err) // TODO handle better
        }
        app.dispatch(app.$.loginState, false)
        route('/');
    });
})

route('/create-unknown/*', function (name) {
    app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })
    riot.mount('div#content', 'create-unknown')
})

route('/create', function () {
    app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: true,
        enableSubbar: false
    })
    riot.mount('div#content', 'create-form')
})

route('/scan', function () {
    app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })
    riot.mount('div#content', 'scan-page')
})


route('/p/*', function (id) {
    app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })
    setTimeout(function () {
        app.remote.getMaterialByHumanID(id, function (err, m) {
            riot.mount('div#content', 'view-physical', m)
        });
    }, 500);
})

// TODO remove again
route('/print', function () {
    app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })
    riot.mount('div#content', 'print')
})

function editPhysicalRoute(typeOrID) {

    app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })

    var opts = {};

    typeOrID = decodeURIComponent(typeOrID).trim()


    if(isUUID(typeOrID)) {
        if(typeOrID.match(/^p-/)) {
          opts.physicalID = typeOrID
        } else {
          opts.virtualID = typeOrID
        }
    } else {
      opts.type = typeOrID
    }
    console.log('edit physical id: %s route: %s',typeOrID, JSON.stringify(opts))
    riot.mount('div#content', 'create-physical', opts);
}

route('/edit-physical/*', editPhysicalRoute);


function createPhysicalRoute(typeOrID, q) {

    app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })

    var opts = {
        query: q || {}
    }
    typeOrID = decodeURIComponent(typeOrID).trim()

    opts.type = typeOrID

    if(isUUID(typeOrID)) {
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
