const plugin = function (name) {
  const plugin = this
  if (name !== undefined) plugin.name = name
  else plugin.name = 'unnamed plugin'
  //console.log('init plugin:', plugin.name)
  
  // receive notifications from plugin stream
  const observer = sudocms.addObserver(sudocms.$.plugin, function (cmd) {
    //console.log(plugin.name, ' plugin cmd:', cmd)
    switch (cmd) {
      case plugin.$.start:
        plugin.start();
        break;
      case plugin.$.remove:
        plugin.remove();
        sudocms.removeObserver(sudocms.$.plugin, observer)
        break;
    }
  })
}
plugin.prototype.$ = {
  start:'start',
  remove:'remove'
}
plugin.start = function () {
  console.log('plugin ',this.name, ' default start')
}
plugin.remove = function () {
  console.log('plugin ',this.name, ' default remove')
}
module.exports = plugin
