import {
    toast
}
from './methods'

const stdThemePlugin = app.addPlugin('stdTheme')
stdThemePlugin.start = function () {

    const settings = app.getSettings()
    console.log('std theme init, settings:', JSON.stringify(settings))

    //----------------------------------------------------------------------------
    // primary nav - logged in
    /*
        label: 'configure',
        action: '/bionetsetup/config'
  }, {
    */
    const loggedInNav = [{
        label: 'global search',
        action: '/search'
  }, {
        label: 'local inventory',
        action: '/inventory'
  }, {
        label: 'workbench',
        action: '/create'
  }, {
        icon: 'shopping_cart',
        action: '/cart'
    }];

    // primary nav - logged out
    const loggedOutNav = [{
        label: 'global search',
        action: '/search'
  }, {
        label: 'local inventory',
        action: '/inventory'
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
            smallLogo: '/static/images/BioNet_Logo_Vertical_web_sm.png'
        },
        dark: {
            text: 'grey-text text-lighten-2',
            background: 'grey darken-3',
            highlightBackground: 'blue',
            navText: 'grey-text text-lighten-2',
            navBackground: 'grey darken-3',
            navButton: 'grey-text text-lighten-2',
            smallLogo: '/static/images/BioNet_Logo_Vertical_web_sm_white.png'
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
                app.setTheme({
                    name: 'color',
                    value: color
                })
        }
    })

    // initialize appbar
    app.appbarConfig({
        enableTopNav: true,
        enableBreadCrumbs: false,
        enableSubbar: false
    })

    if (app.getLoginState()) app.setPrimaryNav(loggedInNav)
    else app.setPrimaryNav(loggedOutNav)

    // login state
    app.addObserver(app.$.loginState, (loginState) => {
        const toast = app.getThemeMethod().toast
        if (loginState) {
            toast('logged into bionet')
            app.setPrimaryNav(loggedInNav)
        } else {
            toast('logged out of bionet')
            app.setPrimaryNav(loggedOutNav)
        }
    })


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
