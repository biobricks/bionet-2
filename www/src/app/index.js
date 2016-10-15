import riot from 'riot';
import Plugin from './plugin';
import Persist from './persist'
import NanoStream from './NanoStream';
import NanoRoute from './NanoRoute';

const app = {

  remote: undefined, // RPC connection to server
  user: undefined, // currently logged in user

  login: undefined,
  logout: undefined,
 
  stream: {},
  plugin: {},

  // built-in streams
  $: {
    plugin: 'plugin',
    login: 'login',
    loginState: 'loginState',
    primaryNav: 'primaryNav',
    secondaryNav: 'secondaryNav',
    appBarConfig: 'appBarConfig',
    breadcrumbs: 'breadcrumbs',
    theme: 'theme',
    settings: 'settings'
  },

  // initialize sudocms
  initialize: function () {
    const thisModule = this

    // initialize local storage
    Persist.openDB();

    // plugin control stream
    this.addStream(this.$.plugin)

    // login data streams
    this.addStream(this.$.login)
    this.addStream(this.$.loginState, new NanoStream(false))

    // navigation data streams
    this.addStream(this.$.primaryNav)
    this.addStream(this.$.secondaryNav)

    // theme data streams
    this.addStream(this.$.appBarConfig)
    this.addStream(this.$.breadcrumbs)

    // initialize theme data stream
    const theme = this.addStream(this.$.theme)
    theme.reduce(function (m, b) {
      //todo: b.name should accept json path
      //note: method object containing functions is not stringify/parseable
      const newConfigStyle = JSON.parse(JSON.stringify(m.style))
      newConfigStyle[b.name] = b.value

      const newConfig = {
        style: newConfigStyle,
        method: m.method
      }
      return newConfig
    })

    // initialize settings data stream
    const settings = this.addStream(this.$.settings)
    settings.reduce(function (m, b) {
      const newSettings = JSON.parse(JSON.stringify(m))
      newSettings[b.setting] = b.value
      newSettings.lastUpdate = b
      return newSettings
    })
    settings.addObserver(function (newSettings) {
      console.log('storing settings:', JSON.stringify(newSettings))
      thisModule.putLocal(thisModule.$.settings, JSON.stringify(newSettings))
    })

  },

  // plugin methods
  addPlugin: function (name) {
    const newPlugin = new Plugin(name)
    this.plugin[name] = newPlugin
    return newPlugin
  },
  removePlugin: function (name) {
    plugin[name].remove()
    delete this.plugin[name];
  },

  // load settings and startup plugins 
  startPlugins: function () {

    const settings = this.getStream(this.$.settings)
    const thisModule = this

    // retrieve user settings from local storage or set default
    this.getLocal(this.$.settings, function (err, value) {
      var settingsObj = {}
      if (err) {
        //console.log('error reading userSettings:', err)
        // todo: encrypt/decript password in local storage
        settingsObj = {
          username: '',
          password: '',
          themeName: 'std',
          colorScheme: 'light'
        }
        thisModule.putLocal(thisModule.$.settings, JSON.stringify(settingsObj))
      } else {
        settingsObj = JSON.parse(value)
          //console.log('retrieved userSettings:', JSON.stringify(settingsObj))
      }
      settings.init(settingsObj)
      thisModule.dispatch(thisModule.$.plugin, 'start')
      thisModule.startRouter()
    })
  },

  // start router - after plugins have been started
  startRouter: function () {

    // mount root component
    riot.mount('div#app', 'app')

    // initialize and start router
    riot.route.base('#!')
    riot.route.start(true)

    console.log('app started')
  },

  // stream methods
  dispatch: function (name, message) {
    //console.log('dispatching to stream:',name)
    this.stream[name].dispatch(message);
  },
  route: function (router, address, mapper, message) {
    //console.log('routing %s to %s with mapper %s', address, router, mapper)
    this.stream[router].route(address, mapper, message)
  },
  observe: function (name, observer) {
    this.stream[name].observe(observer);
  },
  getStream: function (name) {
    return this.stream[name];
  },
  getModel: function (name) {
    //console.log('getModel:',name)
    return this.stream[name].getModel();
  },
  addObserver: function (name, observer) {
    //console.log('addObserver:', name)
    this.stream[name].addObserver(observer);
  },
  removeObserver: function (name, observer) {
    //console.log('removeObserver:', name)
    this.stream[name].removeObserver(observer);
  },
  addStream: function (name, stream) {
    if (stream === undefined) stream = new NanoStream();
    //console.log('addStream:',name)
    this.stream[name] = stream;
    return stream;
  },
  addStreamRouter: function (name, stream) {
    if (stream === undefined) stream = new NanoRoute();
    //console.log('addRoute:',name)
    this.stream[name] = stream;
    return stream;
  },
  addRouteDestination: function (router, address, f) {
    this.stream[router].addRoute(address, f)
  },
  removeRouteDestination: function (router, address) {
    this.stream[router].removeRoute(address);
  },
  initStream: function (name, state) {
    //console.log('init stream:', name, JSON.stringify(state))
    this.stream[name].init(state)
  },
  removeStream: function (name) {
    delete this.stream[name];
  },

  // local storage methods
  getLocal: function (key, cb) {
    Persist.get(key, cb)
  },
  putLocal: function (key, data, cb) {
    Persist.put(key, data, cb)
  },
  // todo: deprecated, remove when queries available
  readTestData: function (cb) {
    Persist.readTestData(cb)
  },

  // route methods
  addRoute: function (path, router) {
    riot.route(path, router);
  },

  // settings methods
  getSettings: function () {
    return this.getModel(this.$.settings)
  },
  putSetting: function (property) {
    //console.log('putSettings:',JSON.stringify(property))
    this.dispatch(this.$.settings, property)
  },

  // login methods
  getLoginState: function () {
    return this.getModel(this.$.loginState)
  },

  // theme methods
  getTheme: function () {
    return this.getModel(this.$.theme)
  },
  getThemeMethod: function () {
    return this.getTheme().method;
  }

};
export default app;
