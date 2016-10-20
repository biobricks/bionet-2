
import riot from 'riot'


app.addRoute('/', function () {
  app.dispatch(app.$.appBarConfig, {
    enableTopNav: true,
    enableBreadCrumbs: false,
    enableSubbar: false
  })
  riot.mount('div#content', 'welcome')
})
