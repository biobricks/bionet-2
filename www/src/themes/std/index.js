import {
  toast
} from './methods'

const stdThemePlugin = sudocms.addPlugin('stdTheme')
stdThemePlugin.start = function () {

  const settings = sudocms.getSettings()
  //console.log('std theme settings:', JSON.stringify(settings))

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
  sudocms.initStream(sudocms.$.theme, defaultSettings)

  sudocms.addObserver(sudocms.$.settings, function (newSettings) {
    //console.log('theme settings:', JSON.stringify(newSettings))
    if (newSettings.lastUpdate === undefined) return
    const update = newSettings.lastUpdate
    switch (update.setting) {
      case 'colorScheme':
        const color = (update.value === 'light') ? colorScheme.light : colorScheme.dark
        sudocms.dispatch(sudocms.$.theme, {
          name: 'color',
          value: color
        })
    }
  })

  // initialize appbar
  sudocms.dispatch(sudocms.$.appBarConfig, {
    enableTopNav: true,
    enableBreadCrumbs: false,
    enableSubbar: false
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
