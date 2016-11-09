import riot from 'riot'
import bionetapi from '../bionetapi'

var error = {
  init: function () {
    const errorStream = app.addStream('error')
    require('./errors.tag.html')

    app.observe('error', function (err) {
      console.log('error page router: err=%s', err)
      riot.mount('div#content', 'error-page', {
        err
      })
    })


  },
  remove: function () {}
}
module.exports = error
