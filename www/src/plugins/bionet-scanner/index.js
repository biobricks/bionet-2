const riot = require('riot')
import nanoStream from '../../app/NanoStream';
import scanner from './scanner'
import bionetScannerApi from './bionetScannerApi'
import scanProcessor from './scanProcessor'
import pixijsutils from './pixijsutils'
const PIXI = require('pixi.js')
const tween = require('pixi-tween')
const MiniSignal = require('mini-signals');
const babylon = require('./3d/babylon.tag.html')

const bionetScanPlugin = app.addPlugin('bionetScan2')
require('./scanner.tag.html')
require('./bionetStorageLocation.tag.html')
require('./bionetStorageItem.tag.html')

bionetScanPlugin.start = function (cb) {
    console.log('starting bionet_scanner plugin')
    pixijsutils.initRenderer()

    // todo:
    // handle scaling for mobile devices

    //-------------------------------------------------------------------------
    // data streams
    const startScan = app.addStream('startScan')
    const scanResult = app.addStream('scanResult')
    const pixiController = new MiniSignal()
    BIONET.stream.bionetStorageLocation = pixiController
    
    BIONET.signal.highlightStorageCell = new MiniSignal()
    BIONET.signal.storageLocationViewReady = new MiniSignal()
    BIONET.signal.activate3D = new MiniSignal()
    BIONET.signal.physicalSaved = new MiniSignal()
    BIONET.signal.highlightCellArray = new MiniSignal()
    
    const thisModule = this
    startScan.observe((msg) => {
        switch (msg.status) {
            case 'init':
                console.log('bionetScanPlugin, mounting scanner tag')
                riot.mount('div#physical-storage', 'scanner');
                break;
            case 'start':
                thisModule.runScanner()
                break
            case 'stop':
                thisModule.stopScanner()
                break
        }
    })

    //-------------------------------------------------------------------------
    // tags
    //require('./scanner.tag.html')

    //-------------------------------------------------------------------------
    // routes
    app.addRoute('/scanner', function () {
        app.appbarConfig({
            enableTopNav: false,
            enableBreadCrumbs: false,
            enableSubbar: false
        })
        riot.mount('div#content', 'scanner')
    })

  cb();
}

bionetScanPlugin.remove = function () {
    // todo: unmount tags, etc.
}

bionetScanPlugin.runScanner = function () {

    //-------------------------------------------------------------------------
    // local streams
    console.log('runScanner')
    const s = {};

    // create streams
    s.update = new nanoStream();
    s.controller = new nanoStream();
    s.plugin = new nanoStream();

    const storageLocationView = app.addStreamRouter('storageLocationView')

    const thisModule = this
    const q = route.query()
    const config = {}

    if (q.id !== undefined) {
        config.q = app.getModel('bioInstanceQuery')
        config.cassette = undefined
        const cassetteList = app.getModel('searchCache')
        for (var i = 0; i < cassetteList.length; i++) {
            var cassette = cassetteList[i].data
            if (cassette.id === q.id) {
                config.cassette = cassette
                break
            }
        }
        if (config.cassette !== undefined) {
            const partList = config.cassette.partid.split(' ')
            config.partList = partList
            const partid = config.q.partid
            console.log('find part in cassette:', partid)
            config.selection = undefined
            for (var i = 0; i < partList.length; i++) {
                if (partList[i] === partid) {
                    config.selection = i - 1
                    console.log('selected part %s found at:%d', partid, i)
                }
            }
            config.cassetteType = (partList.length > 97) ? 2 : 1;
        }
        console.log('scan: cassette=', JSON.stringify(config))
    } else {
        config.cassetteType = 1
    }
    this.config = config
        //console.log('route: scan id: ' + q.id)

    //-------------------------------------------------------------------------
    // initialize pixi
    // create webgl renderer
    const GAME_WIDTH = 1100;
    const GAME_HEIGHT = 750;
    //const GAME_WIDTH = 1600;
    //const GAME_HEIGHT = 1120;
    //PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
    const backgroundColor = 0xffffff
        //backgroundColor: 0x000000,
        //backgroundColor: 0x303030,
        //alpha:0.8,
        /*
        const renderer = new PIXI.WebGLRenderer(GAME_WIDTH, GAME_HEIGHT, {
            backgroundColor: backgroundColor,
            transparent: false,
            resolution: window.devicePixelRatio,
            autoResize: true
        });
        PIXI.TRANSFORM_MODE.DEFAULT = PIXI.TRANSFORM_MODE.DYNAMIC;
        */
        // attach pixi to html element in tag
    const widgetDiv = document.getElementById("scanner-widget")
    widgetDiv.appendChild(renderer.view);

    // create the root of the scene graph
    const stage = new PIXI.Container();

    //-------------------------------------------------------------------------
    // setup dynamic resizing
    const resize = function () {
        // Determine which screen dimension is most constrained
        var ratio = Math.min((window.innerWidth - 300) / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);

        // Scale the view appropriately to fill that dimension
        stage.scale.x = stage.scale.y = ratio * 0.85;

    }

    window.onresize = () => resize();
    resize();

    //-------------------------------------------------------------------------
    // initialize plugins
    //labStorage.init(s, stage)
    scanner.init(s, stage)

    //-------------------------------------------------------------------------
    // dispatch plugin load resources event
    const loader = PIXI.loader
    loader.reset()
    s.controller.dispatch({
        cmd: 'configure',
        data: this.config
    })
    s.controller.dispatch({
        cmd: 'load'
    })

    //-------------------------------------------------------------------------
    // update frame handler
    this.animationReq = {}
    const update = function (timestamp) {
        PIXI.tweenManager.update()
        s.update.dispatch({})
        renderer.render(stage)
        thisModule.animationReq = window.requestAnimationFrame(update)
    }

    //-------------------------------------------------------------------------
    // preload resources and start frame updates
    loader.load((loader, resources) => {
        s.controller.dispatch({
            cmd: 'ready',
            data: resources
        })
        console.log('starting renderer')
        thisModule.animationReq = window.requestAnimationFrame(update)
            //update();
            // fetch cassette data if available
        setTimeout(function () {
            s.controller.dispatch({
                cmd: 'scan'
            })
        }, 500)
    });

    // handle messages received from scanner
    const pluginMsgHandler = {
        close: function () {
            $("#scanner-widget").remove()
            window.onresize = undefined
            window.cancelAnimationFrame(thisModule.animationReq)

            // route back to physical instance search result
            route('/q?partid=' + config.q.partid)
        },
        run: function () {
            thisModule.animationReq = window.requestAnimationFrame(update)
        }
    }

    // handle ui messages received from plugin
    s.plugin.observe((msg) => {
        const cmd = msg.cmd
        if (cmd === undefined) return;
        pluginMsgHandler[cmd](msg);
    })


    console.log('scanner initialization complete')

}

bionetScanPlugin.stopScanner = function () {
    window.cancelAnimationFrame(this.animationReq)
}

module.exports = bionetScanPlugin
