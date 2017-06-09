const PIXI = require('pixi.js')
const tween = require('pixi-tween')
const MiniSignal = require('mini-signals');
const pixijsUtils = {
    PIXI_WIDTH:945,
    PIXI_HEIGHT:230,
    //PIXI_WIDTH:1465,
    //PIXI_HEIGHT:834,
    initRenderer: function () {
        this.pixiBackgroundColor = 0xffffff
        //xconst renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight, {
        const renderer = PIXI.autoDetectRenderer(this.PIXI_WIDTH, this.PIXI_HEIGHT, {
            backgroundColor: this.pixiBackgroundColor,
            resolution: window.devicePixelRatio,
            transparent: false,
            autoResize: true
        });
        PIXI.TRANSFORM_MODE.TRANSFORM_MODE = PIXI.TRANSFORM_MODE.DYNAMIC;
        this.renderer = renderer
        this.stage = new PIXI.Container()
        renderer.render(this.stage)
    },
    attachRenderer: function (element) {
        /*
        if (element.children && element.children.length>0) {
            element.children[0] = this.renderer.view
        } else {
            element.appendChild(this.renderer.view)
        }
        */
        element.appendChild(this.renderer.view)
    },
    initStage: function (width, height) {
        this.stage.removeChildren()
        const w = Math.round(width)
        const h = Math.round(height)
        this.width = w
        this.height = h
        
        const graphics = new PIXI.Graphics()
        graphics.beginFill(0xffffff)
        graphics.drawRect(0, 0, w, h)
        graphics.endFill();
        this.stage.addChild(graphics)

        this.renderer.render(this.stage)
        //xthis.renderer.resize(w, h)
    },
    resizeStage: function (width, height) {
        const w = Math.round(width)
        const h = Math.round(height)
        this.width = w
        this.height = h
        this.renderer.resize(w, h)
    },
    scaleToFit: function (source) {
        const bounds = source.getBounds()
        /*
        const bounds = {
            width:this.PIXI_WIDTH,
            height:this.PIXI_HEIGHT
        }
        */
        const scalex = this.width / bounds.width
        const scaley = this.height / bounds.height
        var scale = Math.min(scalex, scaley)
        source.scale.x = source.scale.y = scale
        const scaleObj = {
            stageWidth: bounds.width,
            stageHeight: bounds.height,
            divWidth: this.width,
            divHeight: this.height,
            scale: scale,
            devicePixelRatio: window.devicePixelRatio,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
        }
        console.log('***pixijs scaling*** \n %s', JSON.stringify(scaleObj, null, 2))
    },
    appendToStage: function (source) {
        this.stage.addChild(source)
    },
    renderStage: function () {
        this.renderer.render(this.stage)
    },
    renderToImage: function (width, height, source, canvas) {
        const renderer = this.renderer
        const bounds = source.getBounds()
        const scale = Math.min(width / bounds.width, height / bounds.height)
        renderer.render(source)
        const extract = renderer.plugins.extract
        const image = extract.image(source)
        if (canvas.children.length > 0) {
            canvas.removeChild(canvas.children[0])
        }
        image.width *= scale
        image.height *= scale
        canvas.appendChild(image)
    },
    renderToCanvas: function (width, height, source, canvas) {
        const renderer = this.renderer
        if (canvas.children.length > 0) {
            canvas.removeChild(children[0])
        }
        canvas.appendChild(renderer.view)
        const bounds = source.getBounds()
        const scale = Math.min(width / bounds.width, height / bounds.height)
            //source.scale.x = source.scale.y = scale
        renderer.render(source)
    },
    animate: function (seconds) {
        const thisModule = this
        const frames = seconds * 30
        const delta = 1 / 30
        const msg = app.getStream('bionetStorageLocation')

        const update = function (timestamp) {
            PIXI.tweenManager.update(delta)
            msg.dispatch('render')
            thisModule.renderStage()
            if (!thisModule.frameCounter || --thisModule.frameCounter > 0) window.requestAnimationFrame(update)
        }
        if (!thisModule.frameCounter || thisModule.frameCounter <= 0) window.requestAnimationFrame(update)
        thisModule.frameCounter = (thisModule.frameCounter) ? thisModule.frameCounter + frames : frames
    }
}
module.exports = pixijsUtils
