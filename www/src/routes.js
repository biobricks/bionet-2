
import riot from 'riot'


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


riot.route('/create-form', function () {
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
