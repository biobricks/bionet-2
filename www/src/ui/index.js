import {
  toast
} from './methods'

//console.log("======= TWO", $().sideNav, $)

const stdThemePlugin = app.addPlugin('stdTheme')
stdThemePlugin.start = function () {

  const settings = app.getSettings()
  //console.log('std theme settings:', JSON.stringify(settings))

  //----------------------------------------------------------------------------
  // primary nav - logged in
  const loggedInNav = [{
    icon: 'search',
    action: '/'
  }, {
    label: 'inventory',
    action: '/inventory'
  }, {
    label: 'create',
    action: '/create-form'
  }, {
    label: 'scan',
    action: '/scan'
  }, {
    label: 'help',
    action: '/help'
  }];

  // primary nav - logged out
  const loggedOutNav = [{
    icon: 'search',
    action: '/'
  }, {
    label: 'inventory',
    action: '/inventory'
  }, {
    label: 'help',
    action: '/help'
  }]
  
  // initialize theme settings
  const colorScheme = {
    light: {
      text: 'black-text',
      background: 'white',
      highlightBackground: 'blue',
      navText: 'grey-text text-darken-2',
      navBackground: 'white',
      navButton: 'grey-text text-darken-2',
      smallLogo: 'static/images/BioNet_Logo_Vertical_web_sm.png'
    },
    dark: {
      text: 'grey-text text-lighten-2',
      background: 'grey darken-3',
      highlightBackground: 'blue',
      navText: 'grey-text text-lighten-2',
      navBackground: 'grey darken-3',
      navButton: 'grey-text text-lighten-2',
      smallLogo: 'static/images/BioNet_Logo_Vertical_web_sm_white.png'
    }
  }

  const defaultSettings = {
    style: {
      color: (settings.colorScheme === 'light') ? colorScheme.light : colorScheme.dark,
    },
    method: {
      toast: toast
    }
  }
  app.initStream(app.$.theme, defaultSettings)

  app.addObserver(app.$.settings, function (newSettings) {
    //console.log('theme settings:', JSON.stringify(newSettings))
    if (newSettings.lastUpdate === undefined) return
    const update = newSettings.lastUpdate
    switch (update.setting) {
      case 'colorScheme':
        const color = (update.value === 'light') ? colorScheme.light : colorScheme.dark
        app.dispatch(app.$.theme, {
          name: 'color',
          value: color
        })
    }
  })

  // initialize appbar
  app.dispatch(app.$.appBarConfig, {
    enableTopNav: true,
    enableBreadCrumbs: false,
    enableSubbar: false
  })

  app.dispatch(app.$.primaryNav, loggedOutNav)

  // login state
  app.addObserver(app.$.loginState, (loginState) => {
    const toast = app.getThemeMethod().toast
    if (loginState) {
      toast('logged into bionet')
      app.dispatch(app.$.primaryNav, loggedInNav)
    } else {
      toast('logged out of bionet')
      app.dispatch(app.$.primaryNav, loggedOutNav)
    }
  })

  require('./app.tag.html')
  require('./appbar.tag.html')
  require('./container.tag.html')
  require('./nav-group.tag.html')
  require('./nav-item.tag.html')
  require('./list-item.tag.html')
  require('./form-input.tag.html')
  require('./button.tag.html')
  require('./breadcrumbs.tag.html')
  require('./pagination.tag.html')
  require('./header.tag.html')
  require('./footer.tag.html')
  require('./login.tag.html')
  require('./settings.tag.html')
  require('./tree-view.tag.html')
  require('./err404.tag.html')
  require('./welcome.tag.html')

  require('./create-form.tag.html')
  require('./create-physical.tag.html')
  require('./scan.tag.html')
  require('./print.tag.html')
  require('./autocomplete.tag.html')
  require('./create-unknown.tag.html')
  require('./view-physical.tag.html')

  /*
  todo: add standard components for:
  card
  image card
  tabs
  tree view
  dropdown
  chips
  modal dialog
  snackbar
  badge

  completed:
  *toast
  *navbar
  *sidenav
  *content container
  *section
  *form elements
  *buttons
  *light/dark color schemes

*/
}
stdThemePlugin.remove = function () {
  // todo: unmount tags, etc.
}
module.exports = stdThemePlugin
