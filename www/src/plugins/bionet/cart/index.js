const riot = require('riot')
import bionetapi from '../bionetapi'

var cart = {
    init: function () {
        const cart = app.addStreamRouter('cart')
        const bionetSetup = app.getStream('bionetSetup')

        cart.addRoute('requestCart', function () {
            console.log('requestCart')
            const cartData = []
            app.remote.cartStream(function (err, result) {
                if (err) {
                    console.log('requestCart error:', err)
                    return
                }
                const results=[]
                for (var i=0; i<result.length; i++) {
                    const item = result[i]
                    const cartItem = {
                        primary_text: item.physical_id,
                        secondary_text: item.user,
                        id:item.physical_id
                    }
                    results.push(cartItem)
                }
                console.log('requestCart result:', JSON.stringify(results))
                cart.route('cartResult', undefined, results)
            })
        })
/*
requestCart result: [{"user":"tsakach@gmail.com","physical_id":"p-a24db919-f4d0-4c88-9044-771f88a5d049","created":1486625621},{"user":"tsakach@gmail.com","physical_id":"p-040d438d-a11b-4c21-a0b1-3ea1c8e6b81e","created":1486625615},{"user":"tsakach@gmail.com","physical_id":"p-0942a039-0e2b-4301-b563-937dad895174","created":1486625618}]
*/
        
        cart.addRoute('addToCart', function (item) {
            console.log('addToCart:',JSON.stringify(item))
            app.remote.addToCart(item.id, item.name, function (err, result) {
                if (err) {
                    console.log('addToCart error:',err)
                    return
                }
                console.log('addToCart result:', JSON.stringify(result))
                //cart.route('requestCart')
            })
        })

        require('./cart.tag.html')

        const cartRouter = function () {

            app.dispatch(app.$.appBarConfig, {
                enableTopNav: true,
                enableBreadCrumbs: true,
                enableSubbar: false
            })

            // todo: set inventory item
            app.dispatch(app.$.breadcrumbs, [{
                'label': 'cart',
                'url': '/cart'
            }]);
            riot.mount('div#content', 'cart')
        }

        route('/cart', function () {
            cartRouter();
        })

    },
    remove: function () {

    }
}
module.exports = cart
