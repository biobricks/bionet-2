const riot = require('riot')
import bionetapi from '../bionetapi'

var passwordReset = {
    init: function () {

        //-------------------------------------------------------------------------
        // ui components
        require('./password.tag.html')

        // remote interface handlers
        const passwordReset = app.addStreamRouter('passwordReset')

        passwordReset.addRoute('requestPasswordReset', function (emailOrName) {
            app.remote.requestPasswordReset(emailOrName, function (err) {
                passwordReset.route('requestPasswordResetResult', undefined, err)
            })
        })

        passwordReset.addRoute('checkPasswordResetCode', function (resetCode) {
            app.remote.checkPasswordResetCode(resetCode, function (err) {
                passwordReset.route('checkPasswordResetCodeResult', undefined, err)
            })
        })

        passwordReset.addRoute('completePasswordReset', function (reset) {
            app.remote.completePasswordReset(reset.resetCode, reset.password, function (err) {
                passwordReset.route('completePasswordResetResult', undefined, err)
            })
        })

        //-------------------------------------------------------------------------
        // routes
        
        const resetPassword = function(resetCode) {
            app.dispatch(app.$.appBarConfig, {
                enableTopNav: true,
                enableBreadCrumbs: false,
                enableSubbar: false
            })
            riot.mount('div#content', 'reset-password',{resetCode:resetCode})
        }

        app.addRoute('/password-reset', function () {
            resetPassword()
        })
        
        route('/password-reset/*', function (resetCode) {
            resetPassword(resetCode)
        })
        
    },
    remove: function () {

    }
}
module.exports = passwordReset
