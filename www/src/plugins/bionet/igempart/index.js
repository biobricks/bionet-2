import riot from 'riot'
//import request from 'request'
import bionetapi from '../bionetapi'

var igempart = {
  init: function () {

    //----------------------------------------------------------------------------
    // streams
    sudocms.addStreamRouter('createPart')
    sudocms.addStreamRouter('editPart')
    sudocms.addStream('getPartsList')
    sudocms.addStream('partsList')
    const partData = sudocms.addStream('partData')
    const partDataAccessor = sudocms.addStreamRouter('partDataAccessor')
    
    //----------------------------------------------------------------------------
    // web components
    require('./part-list.tag.html')
    require('./part-form.tag.html')
    require('./create-part.tag.html')

    sudocms.observe('getPartsList', (q) => {
      // todo replace readTestData with bionet query
      sudocms.readTestData(function (streamItems) {
        sudocms.dispatch('partsList', streamItems)
      })
    })


    partDataAccessor.addRoute('cache', (partData) => {
      //console.log('partDataAccessor store:',JSON.stringify(partData))
      sudocms.dispatch('partData', partData)
    })

    partDataAccessor.reduceRoute('fromSearchItem', (m, streamItem) => {
      console.log('partDataAccessor fromSearchItem:', JSON.stringify(streamItem))
        //todo: map the entire igem data object (causes data to not be saved in index if not mapped)
      return {
        name: streamItem.part_name,
        description: streamItem.short_desc,
        creator: streamItem.author,
        temperature: (streamItem.temperature !== undefined) ? streamItem.temperature : '-80C',
        bsl: (streamItem.bsl !== undefined) ? streamItem.bsl : 'BSL01',
        biohazard: (streamItem.biohazard !== undefined) ? streamItem.biohazard : false,
        created: streamItem.creation_date,
        avatar: '',
        notes: streamItem.notes,
        sequence: (streamItem.sequence !== undefined) ? streamItem.sequence : '',
        plasmidAnnotations: (streamItem.plasmidAnnotations !== undefined) ? streamItem.plasmidAnnotations : []
      }
    })

    partDataAccessor.addRoute('storeClass', (classData) => {
      console.log('partDataAccessor storeClass:', JSON.stringify(classData))
      const toast = sudocms.getThemeMethod().toast
      bionetapi.updateClassItem(classData.partid, classData, (err, data, msg) => {
        if (err) {
          toast('ERROR saving ' + classData.partid)
          console.log('putPartData:', msg)
        } else {
          toast(classData.partid + ' saved')
        }
      })
    })

    partDataAccessor.reduceRoute('toSearchItem', (m, partData) => {
      //console.log('partDataAccessor toSearchItem:',JSON.stringify(partData))
      const igemData = {
        part_name: partData.name,
        short_desc: partData.description,
        author: partData.creator,
        temperature: partData.temperature,
        bsl: partData.bsl,
        biohazard: partData.biohazard,
        creation_date: partData.created,
        avatar: partData.avatar,
        sequence: partData.sequence
      }
      return {
        partid: partData.name,
        description: partData.description,
        props: JSON.stringify(igemData)
      }
      console.log('partDataAccessor toSearchItem:', JSON.stringify(props))
    })

    sudocms.addStream('getPartData');
    sudocms.observe('getPartData', (id) => {
      sudocms.getLocal(id, function (err, value) {
        if (err) {
          console.log('error reading part:', id, err)
        } else {
          const item = JSON.parse(value)
          console.log('retrieved item:', JSON.stringify(item))
          sudocms.dispatch('partData', item)
        }
      })
    })

    sudocms.addStream('putPartData')

    sudocms.observe('putPartData', (partData) => {
      const partDataStr = JSON.stringify(partData)
      console.log('submit', partDataStr)
      sudocms.putLocal(partData.name, partDataStr, function (err) {
        const toast = sudocms.getThemeMethod().toast
        if (err) {
          toast('ERROR saving ' + partData.name)
          console.log('putPartData:', err)
        } else {
          toast(partData.name + ' saved')
        }
      })
    })

    sudocms.addRouteDestination('editPart', 'genPlasmidView', function (formData) {
      console.log('plasmid post:')
      var plasmidData = {
        fastaFile: '',
        vendor: 'Amersham%20Pharmacia',
        sequence: 'taatacgactcactatagggaga',
        Submit: 'Graphic Map',
        showOption: 1,
        showOption: 2,
        showOption: 3,
        showOption: 4,
        showOption: 6,
        showOption: 7,
        showOption: 8,
        showOption: 5,
        showOption: 9,
        restriction: 1,
        orfLen: 200,
        strand: 1,
        strand: 2,
        featureName1: '',
        start1: '',
        dir1: 1,
        category1: 'origin_of_replication',
        stop1: '',
        featureName2: '',
        start2: '',
        dir2: 1,
        category2: 'origin_of_replication',
        stop2: '',
        featureName3: '',
        start3: '',
        dir3: 1,
        category3: 'origin_of_replication',
        stop3: '',
        featureName4: '',
        start4: '',
        dir4: 1,
        category4: 'origin_of_replication',
        stop4: '',
        featureName5: '',
        start5: '',
        dir5: 1,
        category5: 'origin_of_replication',
        stop5: '',
        featureName6: '',
        start6: '',
        dir6: 1,
        category6: 'origin_of_replication',
        stop6: '',
        scheme: 0,
        shading: 0,
        labColor: 0,
        labelBox: 1,
        labels: 0,
        innerLabels: 0,
        legend: 0,
        arrow: 0,
        tickMark: 0,
        mapTitle: '',
        comment: 'Created using PlasMapper',
        imageFormat: 'PNG',
        imageSize: '850 x 750',
        backbone: 'medium',
        arc: 'medium'
      };

      var cb = function (err, httpResponse, body) {
        if (err) {
          return console.error('plasmid upload failed:', err);
        }
        console.log('plasmid Upload successful!  Server responded with:', JSON.stringify(body));
      }

      var req = request.post('http://wishart.biology.ualberta.ca/PlasMapper/servlet/DrawVectorMap')
      var form = req.form();

      form.append('imageSize', '850 x 750')
      form.append('imageFormat', 'PNG')
      form.append('sequence', 'taatacgactcactatagggaga')

      form.on = cb
      form.getHeaders = function () {
        return []
      }
      console.log('before submit')
      form.submit('http://wishart.biology.ualberta.ca/PlasMapper/servlet/DrawVectorMap', function (err, res) {
        // res – response object (http.IncomingMessage)  //
        console.log('plasmid Upload successful!  Server responded with:', JSON.stringify(body));
        res.resume();
      });

      /*
      var req = request.post({
        url: 'http://wishart.biology.ualberta.ca/PlasMapper/servlet/DrawVectorMap',
        formData: plasmidData
      }, cb);
      */

    })
    
    //----------------------------------------------------------------------------------
    // igem part routes
    sudocms.addRoute('/item..', function () {
      const q = riot.route.query()
      console.log('route: part id: ' + q.id)
        //sudocms.dispatch('getPartData', q.id)

      const tab = q.tab
      if (tab !== undefined) {
        sudocms.route('editPart', tab, undefined, sudocms.getModel('partData'))
        return
      }

      // secondary nav
      sudocms.dispatch(sudocms.$.secondaryNav, [{
        label: 'specifications',
        icon: 'toc',
        action: '/#!/item?tab=specifications&id=' + q.id
    }, {
        label: 'notes',
        icon: 'web',
        action: '/#!/item?tab=notes&id=' + q.id
    }, {
        label: 'discussion',
        icon: 'question_answer',
        action: '/#!/item?tab=discussion&id=' + q.id
    }, {
        label: 'plasmid',
        icon: 'library_books',
        action: '/#!/item?tab=sequence&id=' + q.id
    }])

      sudocms.dispatch(sudocms.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: true,
        enableSubbar: true
      })
      sudocms.dispatch(sudocms.$.breadcrumbs, [{
        'label': 'search',
        'url': '#!/'
        }, {
        'label': sudocms.getModel('bioClassQuery').q,
        'url': '#!/q'
        }, {
        'label': q.id,
        'url': '#!'
  }]);

      riot.mount('div#content', 'part-form')
    })

    sudocms.addRoute('/create..', function () {
      const q = riot.route.query()
      const tab = q.tab
      if (tab !== undefined) {
        sudocms.route('createPart', tab, undefined, sudocms.getModel('createPart'))
        return
      }

      // initialize partdata and create part streams
      sudocms.getStream('partData').init({})
      sudocms.getStream('createPart').init({})

      // setup secondary nav
      sudocms.dispatch(sudocms.$.secondaryNav, [{
        label: 'name',
        icon: undefined,
        action: '/#!/create?tab=name'
    }, {
        label: 'specifications',
        icon: undefined,
        action: '/#!/create?tab=specifications'
    }, {
        label: 'sequence',
        icon: undefined,
        action: '/#!/create?tab=sequence'
    }, {
        label: 'physical instance',
        icon: undefined,
        action: '/#!/create?tab=instance'
    }])

      // initialize breadcrumbs
      sudocms.dispatch(sudocms.$.breadcrumbs, [{
        'label': 'inventory',
        'url': '#!/'
        }, {
        'label': 'create part',
        'url': '#!'
    }]);

      // configure app bar
      sudocms.dispatch(sudocms.$.appBarConfig, {
        enableTopNav: true,
        enableBreadCrumbs: true,
        enableSubbar: true
      })

      riot.mount('div#content', 'create-part')
    })
  },
  remove: function() {
    
  }
}
module.exports = igempart
