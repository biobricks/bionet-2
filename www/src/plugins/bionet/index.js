// bionet app plugin
const riot = require('riot')
import bionetapi from './bionetapi'

// modules
import appMain from './appmain'
import igemPart from './igempart'
import partSearch from './partsearch'
import partsInventory from './partsinventory'
import errorPage from './error_page'
import passwordReset from './password_reset'
import bionetSetup from './bionet_setup'
import workbench from './workbench'
import cart from './cart'

const bionetPlugin = app.addPlugin('bionet')

bionetPlugin.start = function (cb) {

  // TODO check if any of these init functions do anything async
  // and if so, make them take a callback and use async.eachSeries to init

    //-------------------------------------------------------------------------
    // initialize bionet
    bionetapi.init()

    //-------------------------------------------------------------------------
    // initialize appMain module
    appMain.init()

    //-------------------------------------------------------------------------
    // initialize igempart module
    igemPart.init()

    //-------------------------------------------------------------------------
    // initialize part search module
    partSearch.init()

    //-------------------------------------------------------------------------
    // initialize parts inventory module
    partsInventory.init()

    //-------------------------------------------------------------------------
    // initialize password reset
    passwordReset.init();

    //-------------------------------------------------------------------------
    // initialize error handling
    errorPage.init();

    //-------------------------------------------------------------------------
    // initialize bionet setup
    bionetSetup.init();
    
    //-------------------------------------------------------------------------
    // initialize bionet setup
    workbench.init();

    //-------------------------------------------------------------------------
    // initialize bionet cart
    cart.init();

  cb()
}

bionetPlugin.remove = function () {

    // remove modules
    appMain.remove()
    igemPart.remove()
    partSearch.remove()
    partsInventory.remove()
    bionetSetup.remove()

    // shutdown bionet connection
    bionetapi.shutdown()

}

module.exports = bionetPlugin
