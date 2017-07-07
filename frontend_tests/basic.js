module.exports = {
  'Test that the web app loads' : function (client) {
    client
      .url('http://localhost:8000/')
      .waitForElementVisible('appbar', 3000)
      .assert.visible('#searchbio')
      .end();
  }
};
