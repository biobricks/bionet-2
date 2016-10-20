

var search = {

  // calling with "lab:endy foo bar" or " foo   lab:endy bar "
  // returns:
  // { params: { lab:'endy' }, query: 'foo bar' }
  getParams: function(q) {
    
    var params = {};
    var m;
    while(m = q.match(/([^\s]+):([^\s]+)/)) {
      params[m[1]] = m[2];
      q = q.slice(0, m.index) + q.slice(m.index + m[0].length)
    }
    
    q = q.replace(/\s+/g, ' ').trim()
    
    return {
      params: params,
      query: q
    }
  },

  search: function(q) {
    q = this.getParams(q);

    var distance = q.params['d']
    var locationid = q.params['l'] || 'LAB'


      app.dispatch('bioClassQuery', q)
      console.log('search query:',JSON.stringify(q))
      app.dispatch('bioClassCache', [])
      riot.route('q?terms='+encodeURIComponent(self.searchbio.value))

  }
  


};

module.exports = search;
