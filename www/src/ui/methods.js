// mapped to app.ui

module.exports = {
  toast: function (msg,cb) {
    Materialize.toast(msg, 3000,cb);
  }
}
