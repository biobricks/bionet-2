const riot = require('riot')
import bionetapi from '../bionetapi'

var cart = {
    init: function () {
        const cart = app.addStreamRouter('cart')

        cart.addRoute('requestCart', function () {
            console.log('requestCart')

            const cartStream = app.remote.cartStream(function (err, result) {
                console.log('requestCart cb:', JSON.stringify(result), err)
            });
            
            cartStream.on('data', function (item) {
                // TODO: messaging async api call
                cart.route('cartResult', undefined, item)
            });

            cartStream.on('error', function (err) {
                console.log('requestCart error:', err)
            });
            //todo: end stream
            cartStream.on('end', function () {
                console.log('requestCart done:')
            });
        })

        cart.addRoute('addToCart', function (item) {
            console.log('addToCart:', JSON.stringify(item))
            app.remote.addToCart(item.id, item.name, function (err, result) {
                if (err) {
                    console.log('addToCart error:', err)
                    return
                }
                console.log('addToCart result:', JSON.stringify(result))
                app.ui.toast(item.name + ' added to cart')
                    //cart.route('requestCart')
            })
        })

        cart.addRoute('deleteCartItem', function (itemId) {
            console.log('deleteCartItem:', itemId)
            app.remote.delFromCart(itemId, function (err, result) {
                if (err) {
                    console.log('deleteCartItem error:', err)
                    return
                }
                console.log('deleteCartItem result:', JSON.stringify(result))
                app.ui.toast(itemId + ' removed from cart')
                cart.route('requestCart')
            })
        })
        
        cart.addRoute('deleteCartBatch', function (itemId) {
            app.remote.delFromCart(itemId, function (err, result) {})
        })

        require('./cart.tag.html')

        const cartRouter = function () {
            app.appbarConfig({
                enableTopNav: true,
                enableBreadCrumbs: true,
                enableSubbar: false,
                activeItem:'shopping_cart'
            })

            // todo: set inventory item
            app.setBreadcrumbs([{
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
