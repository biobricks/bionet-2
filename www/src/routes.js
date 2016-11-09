
import riot from 'riot'

// is this string formatted like a UUID?
function isUUID(str) {
  return !!str.toLowerCase().match(/^[\da-z]{8}-[\da-z]{4}-[\da-z]{4}-[\da-z]{4}-[\da-z]{12}$/)
}

riot.route('/', function () {
  app.dispatch(app.$.appBarConfig, {
    enableTopNav: true,
    enableBreadCrumbs: false,
    enableSubbar: false
  })
  riot.mount('div#content', 'welcome')
})


riot.route('/logout', function () {
  console.log("logout route...");
  app.logout(function(err) {
    if(err) {
      app.ui.toast("Error: " + err) // TODO handle better
    }
    riot.route('/');
  });
})

riot.route('/create-unknown/*', function(name) {
  app.dispatch(app.$.appBarConfig, {
    enableTopNav: true,
    enableBreadCrumbs: false,
    enableSubbar: false
  })
  riot.mount('div#content', 'create-unknown')
})

riot.route('/create', function () {
  app.dispatch(app.$.appBarConfig, {
    enableTopNav: true,
    enableBreadCrumbs: false,
    enableSubbar: false
  })
  riot.mount('div#content', 'create-form')
})

riot.route('/scan', function () {
  app.dispatch(app.$.appBarConfig, {
    enableTopNav: true,
    enableBreadCrumbs: false,
    enableSubbar: false
  })
  riot.mount('div#content', 'scan')
})


riot.route('/p/*', function (id) {
  app.dispatch(app.$.appBarConfig, {
    enableTopNav: true,
    enableBreadCrumbs: false,
    enableSubbar: false
  })
  setTimeout(function() {
    app.remote.getMaterialByHumanID(id, function(err, m) {
      riot.mount('div#content', 'view-physical', m)
    });
  }, 500);
})

// TODO remove again
riot.route('/print', function () {
  app.dispatch(app.$.appBarConfig, {
    enableTopNav: true,
    enableBreadCrumbs: false,
    enableSubbar: false
  })
  riot.mount('div#content', 'print')
})


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
  }  else {
    opts.type = typeOrID
  }

  riot.mount('div#content', 'create-physical', opts);
}

riot.route('/create-physical/*', createPhysicalRoute);

riot.route('/create-physical/*/..', function(typeOrID) {
  var q = riot.route.query()
  createPhysicalRoute(typeOrID, q);
});
