import riot from 'riot'
import bionetapi from '../bionetapi'

var partsearch = {
  init: function () {
    
    //-------------------------------------------------------------------------
    // search
    require('./search-result.tag.html')

    // TODO are these still used?
    app.addStream('bioClassQuery')
    app.addStream('bioInstanceQuery')
    app.addStream('bioPhysicalQuery')
    const searchResult = app.addStreamRouter('searchResult')
    const searchCache = app.addStream('searchCache').init(undefined)
    const bioClassCache = app.addStream('bioClassCache').init(undefined)
    const bioInstanceCache = app.addStream('bioInstanceCache').init(undefined)


/*
        return {
          url: '/edit/' + x.id,
          secondary_url: '/q?partid=' + x.id,
          secondary_url_label: 'view availabilty',
          righticon: 'star',
          primary_text: x.id,
          secondary_text: x.description,
          starred: false,
          data: x.data
*/

    //---------------------------------------------------------------------
    // search route
    app.addRoute('/q..', function () {
      app.dispatch(app.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: true,
        enableSubbar: false
      })

      // todo: handle pagination
      const q = riot.route.query()
      if (q.page !== undefined) {
        console.log('search result page: ' + q.page)
      }
      const termsURL = (q.terms !== undefined) ? '?terms=' + q.terms : ''

      q.terms = decodeURIComponent(q.terms)

      app.dispatch(app.$.breadcrumbs, [{
        'label': 'search',
        'url': '/'
      }, {
        'label': q.terms,
        'url': '/q' + termsURL
      }]);

      riot.mount('div#content', 'search-result', q)
    })
  },
  remove: function() {
    
  }
}
module.exports = partsearch
