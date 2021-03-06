const PIXI = require('pixi.js')
const StorageGrid = require('./storageGrid')
import moveAndZoomXform from './moveAndZoomXform'
const BionetStorageContainer = require('./bionetStorageContainer')

const cellArrayColor = 0x00b0ff
const highlightColor = 0x00ffff
const outlineColor = 0x808080

const bionetLabLayout = {
    assets: '/static/assets/lab-storage/',
    storageSprite: null,
    resources: {},
    sceneWidth: {},

    loadResources: function () {
        console.log('labStorage load function')
        const loader = PIXI.loader
        loader.baseUrl = this.assets

        loader.add('threedicon', 'ic_3d_rotation_black_24px.svg')

        if (this.types !== undefined) {
            const types = this.types
            Object.keys(types).forEach(function (key, index) {
                const typeSpec = types[key]
                if (typeSpec.image !== undefined) {
                    const imageName = typeSpec.image
                        //const imageName = decodeURI(location.image)
                    console.log('labStorage.log attempting to load %s', imageName)
                    try {
                        loader.add(key, imageName);
                    } catch (e) {}
                }
            })
        }

    },

    setResources: function (resources) {
        this.resources = resources
    },

    clear: function () {
        delete this.locations
    },

    initializeTypes: function () {
        const types = {}
        this.types = types
        types['lab'] = {
            image: 'endylab.png'
        }
        types['-80 freezer'] = {
            xc: 1,
            yc: 5
        }
        types['-20 freezer'] = {
            xc: 1,
            yc: 5
        }
        types['-4 fridge'] = {
            xc: 1,
            yc: 5
        }
        types['shelf'] = {
            xc: 4,
            yc: 1
        }
        types['freezer rack'] = {
            xc: 5,
            yc: 4
        }
        types['5 x 4 freezer rack'] = {
            xc: 4,
            yc: 3
        }
        types['4 x 3 freezer rack'] = {
            xc: 4,
            yc: 3
        }
        types['8 x 12 freezer box'] = {
            xc: 12,
            yc: 8
        }
        types['9 x 9 freezer box'] = {
            xc: 9,
            yc: 9
        }
        types['10 x 10 freezer box'] = {
            xc: 10,
            yc: 10
        }
        types['freezer box'] = {
            xc: 1,
            yc: 1
        }
        types['physical'] = {
            image: 'storageTube.png'
        }
        types['workbench'] = {
            image: 'workbench.png'
        }
    },

    initializeModel: function (config) {
        this.config = config
        this.sceneWidth = 1600
        if (config.title !== undefined) {
            //this.title = config.title
        }
        const locationPath = this.config.locationPath
        const appSettings = BIONET.getAppSettings()

        const locations = []
        for (var i = locationPath.length - 1; i >= 0; i--) {
            const locationSpec = locationPath[i]
            if (locationSpec.type === undefined) {
                if (locationSpec.name === 'endy lab') {
                    locationSpec.type = 'lab'
                }
            }
            const type = locationSpec.type
            const typeSpec = this.types[type]
            if (type === undefined || typeSpec == undefined) {
                console.log('undefined type:%s %s', locationSpec.name, type)
                continue
            }
            const location = {
                name: locationSpec.name,
                id: locationSpec.id,
                type: type,
                x: locationSpec.parent_x,
                y: locationSpec.parent_y,
                image: typeSpec.image,
                xc: typeSpec.xc,
                yc: typeSpec.yc
            }

            switch (type) {
                case 'lab':
                    location.subunit = JSON.parse(JSON.stringify(appSettings.labLayout))
                    for (var j = 0; j < location.subunit.length; j++) {
                        const freezer = location.subunit[j]
                        if (freezer.parent_x === undefined) freezer.parent_x = j
                    }
                    break;
                case 'physical':
                    location.emoji_cloud = []
                        /*
                        location.emoji_cloud = [
                            {
                                x: 100,
                                y: 60,
                                emoji: ':warning:'
                            },
                            {
                                x: 100,
                                y: 100,
                                emoji: ':smile:'
                            },
                            {
                                x: 100,
                                y: 150,
                                emoji: ':ledger:'
                            }
                        ]
                        */
                    break;
            }
            locations.push(location)

        }
        this.locations = locations
    },

    createScene: function (stage, divwidth, divheight) {
        if (this.locations === undefined) return

        console.log('labStorage initialize scene ')
        this.sceneWidth = divwidth
        const scale = stage.scale.x

        const thisModule = this;
        const sceneRoot = stage
        this.sceneRoot = sceneRoot

        // initialize lab storage hierarchy
        const locations = this.locations;
        // scan counters
        const textColor = '#000000'
        var storageTextProps = {
            fontFamily: 'Roboto',
            fontSize: '16px',
            fill: textColor,
            align: 'center',
            backgroundColor: '#00000000'
        };
        const containerOutlineColor = outlineColor
        const containerFillColor = outlineColor

        //var celldx = Math.max(divwidth / locations.length, 250)
        var celldx = 250
        var celldy = (150 / 190) * celldx
            //var celldy = (150 / 190) * celldx
            /*
            if (celldy * scale > divheight) {
                celldy = divheight - 60
                const sc = celldx / celldy
                celldx = celldy * sc
            }
            */

        const marginx = 0
        const marginy = 0
            //const marginy = 20
            //const marginy = (locations.length > 2) ? 30 : 50
        var lx = marginx;
        var ly = marginy;

        const p1 = {
            x: 0,
            y: 0
        }
        const p2 = {
            x: celldx,
            y: celldy
        }

        // todo: calculate scale value
        /*
        const centerStage = {
            x: marginx,
            y: marginy,
            scale: 2.5
        }
        const centerStage = {
            x: marginx,
            y: celldy + marginy * 3,
            scale: 2.5
        }
        */
        const centerStage = {
            x: marginx,
            y: celldy - 60,
            scale: 2.5
        }

        const centerSprite = function (w, h, obj) {
            obj.x = (w - obj.width) / 2
            obj.y = (h - obj.height) / 2
        }

        const layout = [
                {
                    x: 0,
                    y: 0
            },
                {
                    x: 1,
                    y: 0
            },
                {
                    x: 2,
                    y: 0
            },
                {
                    x: 3,
                    y: 0
            },
                {
                    x: 4,
                    y: 0
            },
                {
                    x: 5,
                    y: 0
            }
        ]
            /*        
                    const layout = [
                        {
                            x: 0,
                            y: 0
                        },
                        {
                            x: 1,
                            y: 0
                        },
                        {
                            x: 1,
                            y: 1
                        },
                        {
                            x: 2,
                            y: 1
                        },
                        {
                            x: 2,
                            y: 0
                        }
                    ]
            */
        const anchorPoint = new PIXI.Point(0.5, 1)

        if (thisModule.title !== undefined) {
            const titleTextSize = '20px'
                //const titleTextSize = (locations.length > 2) ? '22px' : '44px'
            var titleTextProps = {
                fontFamily: 'Roboto',
                fontSize: titleTextSize,
                fill: '#000000',
            };
            const titleSprite = new PIXI.Text(this.title, titleTextProps)
            sceneRoot.addChild(titleSprite)
        }
        const emojiFont = {
            fontFamily: 'Noto Color Emoji',
            fontSize: '34px',
            fill: '#000000',
        };

        const makeInteractive = function (sprite, clickFunction) {
            sprite.interactive = true
            sprite.on('mousedown', clickFunction)
            sprite.on('touchstart', clickFunction)
            const bounds = sprite.getBounds()
            sprite.hitArea = new PIXI.Rectangle(0, 0, bounds.width, bounds.height);
            sprite.buttonMode = true;
        }


        const storageLocations = []
        var activeStorageItem = -1
        const toggleStorageItem = function (toggleState, toggleIndex) {
            const pixiController = app.getStream('bionetStorageLocation')
            pixiController.dispatch('resize', {})
                /*
                 */
            if (activeStorageItem >= 0) {
                const activeStorageLocation = storageLocations[activeStorageItem]
                if (activeStorageLocation) {
                    activeStorageLocation.mz.toggle()
                }
            }
            /*
            for (var i=0; i<storageLocations.length; i++) {
                const storageLocation = storageLocations[i]
                if (storageLocation) {
                    storageLocation.mz.toggle()
                }
            }
            */

            activeStorageItem = toggleIndex
        }

        const moveNextItem = function (direction) {
            console.log('moveNextItem ', direction)

            const pixiController = app.getStream('bionetStorageLocation')
            pixiController.dispatch('resize', {})

            var activeStorageLocation
            var firstClick = false
            if (activeStorageItem < 0) {
                activeStorageItem = 0
                firstClick = true
            }
            activeStorageLocation = storageLocations[activeStorageItem]
            if (activeStorageLocation) {
                activeStorageLocation.mz.toggle()
            }

            if (firstClick === false) {
                activeStorageItem += direction
                if (activeStorageItem >= storageLocations.length) activeStorageItem = storageLocations.length - 1
                if (activeStorageItem < 0) activeStorageItem = 0
                activeStorageLocation = storageLocations[activeStorageItem]
                if (activeStorageLocation) {
                    activeStorageLocation.mz.toggle()
                }
            }
        }
        const moveLeft = function () {
            moveNextItem(-1)
        }
        const moveRight = function () {
            moveNextItem(1)
        }
        const moveRightButtonText = '\ue315'
        const moveLeftButtonText = '\ue314'
        const activate3dButtonText = '\ue84d'

        var iconFontProps = {
            fontFamily: 'Material Icons',
            fontSize: '64px',
            fill: textColor
        };
        /*
        const moveIconY = celldy + marginy * 3.5
        const moveLeftButton = new PIXI.Text(moveLeftButtonText, iconFontProps)
        moveLeftButton.x = 25
        moveLeftButton.y = moveIconY
            //moveLeftButton.anchor = new PIXI.Point(0.5, 0.5)
        sceneRoot.addChild(moveLeftButton)
        makeInteractive(moveLeftButton, moveLeft)

        const moveRightButton = new PIXI.Text(moveRightButtonText, iconFontProps)
        moveRightButton.x = 1600
        moveRightButton.y = moveIconY
            //moveRightButton.anchor = new PIXI.Point(0.5, 0.5)
        sceneRoot.addChild(moveRightButton)
        makeInteractive(moveRightButton, moveRight)

        if (BIONET.state.toggle3d === undefined) BIONET.state.toggle3d = false
        const toggle3d = function () {
            BIONET.state.toggle3d = !BIONET.state.toggle3d
            BIONET.signal.activate3D.dispatch(BIONET.state.toggle3d)
        }
        const threedbutton = new PIXI.Sprite(this.resources.threedicon.texture)
            //const threedbutton = new PIXI.Text(activate3dButtonText, iconFontProps)
        threedbutton.x = 800
        threedbutton.y = moveIconY
            //threedbutton.anchor = new PIXI.Point(0, -0.5)
        threedbutton.width = threedbutton.height = 48
            //threedbutton.scale.x = threedbutton.scale.y = 0.75
        sceneRoot.addChild(threedbutton)
        makeInteractive(threedbutton, toggle3d)
            //EmojiOneColor-SVGinOT.ttf
            */

        for (var i = 0; i < locations.length; i++) {
            const storageItem = locations[i];
            console.log('labStorage.onLoadComplete: initializing storage location %s %s', storageItem.name, storageItem.type)

            var storageContainer = new PIXI.Container()
            var storageSprite = new PIXI.Sprite()
            storageContainer.x = lx
            storageContainer.y = layout[i].y * (celldy + marginy) + marginy
            var containerConfig = {}
            if (storageItem.image) {
                const storageImage = new PIXI.Sprite(this.resources[storageItem.type].texture)
                const storageText = (storageItem.type === 'workbench') ? 'workbench' : storageItem.name
                const childLoc = locations[i + 1]
                containerConfig = {
                    x: (childLoc) ? childLoc.x : undefined,
                    imageSprite: storageImage,
                    title: storageText,
                    width: celldx,
                    height: celldy,
                    subunit: storageItem.subunit
                }
            } else {
                var width, height
                if (storageItem.xc === storageItem.yc) {
                    height = celldx - marginy * 2
                    width = height
                    width = celldx * 0.66
                    height = celldx * 0.66
                } else {
                    if (storageItem.xc > storageItem.yc) {
                        width = celldx
                        height = celldx * 0.66
                    } else {
                        width = celldx * 0.5
                        height = celldx * 0.66
                    }
                }
                const childLoc = locations[i + 1]
                containerConfig = {
                    xc: storageItem.xc,
                    yc: storageItem.yc,
                    width: width,
                    height: height,
                    x: (childLoc) ? childLoc.x : undefined,
                    y: (childLoc) ? childLoc.y : undefined,
                    childId: (childLoc) ? childLoc.id : undefined,
                    title: storageItem.name
                }
            }
            var bionetStorageContainer = new BionetStorageContainer(containerConfig)
            bionetStorageContainer.createScene(storageSprite)
            const grid = bionetStorageContainer.grid
            storageSprite.y = marginy / 2
            storageContainer.addChild(storageSprite)

            var bounds = storageContainer.getBounds()
            const centerContainer = {
                    x: (this.sceneWidth - bounds.width * centerStage.scale) / 2,
                    y: centerStage.y,
                    scale: centerStage.scale
                }
                /*
                const centerContainer = {
                    x: storageContainer.x,
                    y: centerStage.y,
                    scale: 2.5
                }
                */
            var mz = new moveAndZoomXform(storageContainer, bionetStorageContainer.titleSprite, centerContainer, toggleStorageItem, i);

            if (storageItem.emoji_cloud) {
                const emoji_cloud = storageItem.emoji_cloud
                for (var j = 0; j < emoji_cloud.length; j++) {
                    const emoji = emoji_cloud[j]
                    const emojiStr = emoji.emoji
                    const emojiCode = emojione.shortnameToUnicode(emojiStr)
                    const emojiSprite = new PIXI.Text(emojiCode, emojiFont)
                    emojiSprite.x = emoji.x
                    emojiSprite.y = emoji.y
                    emojiSprite.anchor = new PIXI.Point(0.5, 0.5)
                    storageSprite.addChild(emojiSprite)
                }
            }

            lx += bounds.width + marginx

            sceneRoot.addChild(storageContainer);
            storageContainer.updateTransform();

            storageLocations.push({
                id: storageItem.id,
                sprite: storageSprite,
                container: storageContainer,
                bionetStorage: bionetStorageContainer,
                grid: grid,
                mz: mz
            })

        }
        this.storageLocations = storageLocations
        this.connectCells()
        console.log('lab storage initialized')
    },
    highlightCell: function (id, data, x, y) {
        const storageLocations = this.storageLocations
        for (var i = 0; i < storageLocations.length; i++) {
            var loc = storageLocations[i]
            if (loc.id === id) {
                if (loc.grid !== undefined && loc.grid.highlightId !== undefined) {
                    loc.grid.highlightId(id, data, x, y, loc.bionetStorage.gridSprite, highlightColor, true)
                }
            }
        }
    },
    highlightCellArray: function (id, cells, cellColor) {
        const storageLocations = this.storageLocations
        if (storageLocations === undefined) return
        const cColor = (cellColor !== undefined) ? cellColor : cellArrayColor
        for (var i = 0; i < storageLocations.length; i++) {
            var loc = storageLocations[i]
            if (loc.id === id) {
                if (loc.grid !== undefined && loc.grid.highlightId !== undefined) {
                    for (var j = 0; j < cells.length; j++) {
                        const partData = cells[j]
                        loc.grid.highlightId(partData.parent_id, partData, partData.parent_x, partData.parent_y, loc.bionetStorage.gridSprite, cColor, true)
                    }
                }
                break;
            }
        }
    },

    connectCells: function () {
        if (this.storageLocations === undefined) return
        const storageLocations = this.storageLocations
        const sceneRoot = this.sceneRoot
        if (this.connectCellsGraphics) {
            sceneRoot.removeChild(this.connectCellsGraphics)
        }
        const hp = new PIXI.Point(0, 0)
        const hpoints = []
        for (var i = 0; i < storageLocations.length; i++) {
            var loc = storageLocations[i]
            if (loc.grid !== undefined && loc.grid.p1 !== undefined && loc.grid.p2 !== undefined) {
                //loc.grid.highlight(cellCoordinates.x, cellCoordinates.y, gridSprite)
                hpoints.push({
                    p1: loc.grid.p1.toGlobal(hp),
                    p2: loc.grid.p2.toGlobal(hp)
                })
            }
        }


        const scale = 1 / sceneRoot.worldTransform.a
        var graphics = new PIXI.Graphics();
        graphics.scale.x = scale
        graphics.scale.y = scale

        const connectCells = function (a, b, direction2) {
            if (hpoints[a] === undefined || hpoints[b] === undefined) return
            const p1a = hpoints[a].p1
            const p2a = hpoints[a].p2
            const p1b = hpoints[b].p1
            const p2b = hpoints[b].p2
            var direction = direction2

            const pa_active = storageLocations[a].mz.toggleState === false
            const pb_active = storageLocations[b].mz.toggleState === false
            if (pa_active || pb_active) direction = false
            graphics.alpha = 0.3
            graphics.beginFill(highlightColor);
            graphics.lineStyle(4, highlightColor);
            if (direction === true) {
                graphics.moveTo(p2a.x, p1a.y)
                graphics.lineTo(p1b.x, p1b.y)
                graphics.lineTo(p1b.x, p2b.y)
                graphics.lineTo(p2a.x, p2a.y)
                graphics.lineTo(p2a.x, p1a.y)
            } else {
                if (pa_active) {
                    graphics.moveTo(p1a.x, p1a.y)
                    graphics.lineTo(p1b.x, p2b.y)
                    graphics.lineTo(p2b.x, p2b.y)
                    graphics.lineTo(p2a.x, p1a.y)
                    graphics.lineTo(p1a.x, p1a.y)
                }
                if (pb_active) {
                    graphics.moveTo(p1a.x, p2a.y)
                    graphics.lineTo(p1b.x, p1b.y)
                    graphics.lineTo(p2b.x, p1b.y)
                    graphics.lineTo(p2a.x, p2a.y)
                    graphics.lineTo(p1a.x, p2a.y)
                }
            }
            graphics.endFill();
        }
        connectCells(0, 1, true)
        connectCells(1, 2, true)
        connectCells(2, 3, true)
        connectCells(3, 4, true)
        sceneRoot.addChild(graphics);
        this.connectCellsGraphics = graphics

    }
}
module.exports = bionetLabLayout
