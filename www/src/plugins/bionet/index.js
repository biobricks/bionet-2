// bionet app plugin
const riot=require('riot')
import bionetapi from './bionetapi'

// modules
import appMain from './appmain'
import igemPart from './igempart'
import partSearch from './partsearch'
import partsInventory from './partsinventory'
import errorPage from './error_page'
import passwordReset from './password_reset'

const bionetPlugin = app.addPlugin('bionet')

bionetPlugin.start = function () {

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

}

bionetPlugin.remove = function () {
  
  // remove modules
  appMain.remove()
  igemPart.remove()
  partSearch.remove()
  partsInventory.remove()
  
  // shutdown bionet connection
  bionetapi.shutdown()
  
}

module.exports = bionetPlugin
