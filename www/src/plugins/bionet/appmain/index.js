const riot=require('riot')
import bionetapi from '../bionetapi'

var appmain = {
  init: function () {
    
    //-------------------------------------------------------------------------
    // ui components
//    require('./home.tag.html')

    //----------------------------------------------------------------------------
    // primary nav - logged in
    const loggedInNav = [{
      icon: 'search',
      action: '/#!/'
    }, {
      label: 'inventory',
      action: '/#!/inventory'
    }, {
      label: 'create',
      action: '/#!/create'
    }, {
      label: 'scan',
      action: '/#!/scan'
    }, {
      label: 'help',
      action: '/#!/help'
    }];

    // primary nav - logged out
    const loggedOutNav = [{
      icon: 'search',
      action: '/#!/'
    }, {
      label: 'inventory',
      action: '/#!/inventory'
    }, {
      label: 'help',
      action: '/#!/help'
    }]

    // TODO: messaging - error or application state
    app.dispatch(app.$.primaryNav, loggedOutNav)


    // signup process
    const signupClient = app.addStream('signupClient')
    const signupServer = app.addStream('signupServer')

    // store current value of signup up process and forward step name and value to observer
    signupServer.reduce((m, b) => {

      // initialize newState or make copy of current immutable state
      const newState = (b.name === 'init') ? {} : JSON.parse(JSON.stringify(m))

      // store property in next state
      newState[b.name] = b.value

      // forward step and value to observers
      newState.name = b.name
      newState.value = b.value
      return newState
    })


    // signup process verification
    signupServer.observe((step) => {

      const stepName = step.name
      const value = step.value
      console.log('signup server observe', JSON.stringify(step))

      switch (stepName) {

        // master password verification
        case 'mpassword':
          bionetapi.checkMasterPassword(value, function (result, err) {
            if (result) {
              // TODO: messaging - async api
              signupClient.dispatch({
                name: 'email',
                err: false,
                msg: ''
              })
            } else {
              // TODO: messaging - async api
              signupClient.dispatch({
                name: stepName,
                err: true,
                msg: err
              })
            }
          })
          break;

          // email verification
        case 'email':
          bionetapi.validateEmail(value, function (result, err) {
            if (result) {
              signupClient.dispatch({
                name: 'password',
                err: false,
                msg: ''
              })
            } else {
              // TODO: messaging - async api
              signupClient.dispatch({
                name: stepName,
                err: true,
                msg: err
              })
            }
          })
          break;

          // password verification and create user step
        case 'password':
          bionetapi.validatePassword(value, function (result, err) {
            if (result) {
              bionetapi.createUser(step.email, step.password, function (result, createerr) {
                if (result) {
                  // TODO: messaging - async api
                  signupClient.dispatch({
                    name: 'complete',
                    err: false,
                    msg: 'sign up, mpassword=' + step.mpassword + ' email= ' + step.email + ' password=' + step.password
                  })
                } else {
                  // TODO: messaging - async api
                  signupClient.dispatch({
                    name: stepName,
                    err: true,
                    msg: createerr
                  })
                }
              })
            } else {
              // TODO: messaging - async api
              signupClient.dispatch({
                name: stepName,
                err: true,
                msg: err
              })
            }
          })
          break;
      }
    })

    //-------------------------------------------------------------------------
    // routes

    // TODO JUUL move non-namespaced routes to main file
  },
  remove: function() {
    
  }
}
module.exports = appmain
