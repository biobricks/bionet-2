import riot from 'riot'
import bionetapi from '../bionetapi'

var passwordReset = {
  init: function () {
    
    //-------------------------------------------------------------------------
    // ui components
    require('./password.tag.html')

    const passwordReset = app.addStream('passwordReset')

    //-------------------------------------------------------------------------
    // routes

    app.addRoute('/password_reset', function () {
      app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
      })
      riot.mount('div#content', 'reset-password')
    })

  },
  remove: function() {
    
  }
}
module.exports = passwordReset
