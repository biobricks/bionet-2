const PIXI = require('pixi.js')
const StorageGrid = require('./storageGrid')
const StorageArray = require('./storageArray')
const StorageDetails = require('./storageDetails')
import moveAndZoomXform from './moveAndZoomXform'

const bionetStorageContainer = function (config) {
    this.config = config
}

bionetStorageContainer.prototype.createScene = function (storageSprite) {
    const config = this.config
    const marginX = 30
    const marginY = 30
    if (config.imageSprite) {
        const storageImage = config.imageSprite
        const width = storageImage.width
        const height = storageImage.height
        const scale = (height > width) ? config.height / height : config.width / width
        storageImage.width *= scale
        storageImage.height *= scale
        storageImage.y = marginY * 2
        storageSprite.addChild(storageImage)
        const gridSprite = new PIXI.Sprite()
        if (config.subunit) {
            const subunit = config.subunit
            const subunitArray = new StorageArray(subunit, width, height)
            subunitArray.setScale(scale)
            subunitArray.highlight(config.x, gridSprite)
            this.grid = subunitArray
        }
        storageSprite.addChild(gridSprite)
        gridSprite.y = storageImage.y
        this.gridSprite = gridSprite
    } else {

        const grid = new StorageGrid(config.xc, config.yc, config.width, config.height)
        this.grid = grid

        const gridSprite = new PIXI.Sprite()
        grid.drawGrid(gridSprite)
        grid.highlight(config.x, config.y, gridSprite)
        gridSprite.x = marginX
        gridSprite.y = marginY * 2

        const clickGrid = function (e) {
            const global = e.data.global
            const local = gridSprite.toLocal(global)
            const gx = global.x
            const gy = global.y
            const cellCoordinates = grid.getCellCoordinatesFromPoint(local)
            console.log('clickgrid %s %s', JSON.stringify(local), JSON.stringify(cellCoordinates))
            grid.highlight(cellCoordinates.x, cellCoordinates.y, gridSprite)
            const pixiController = app.getStream('bionetStorageLocation')
            pixiController.dispatch('selectCell', {
                id: this.config.childId,
                cell: cellCoordinates
            })
        }.bind(this)

        gridSprite.interactive = true
        gridSprite.on('mousedown', clickGrid)
        gridSprite.on('touchstart', clickGrid)
        const bounds = gridSprite.getBounds()
        gridSprite.hitArea = new PIXI.Rectangle(0, 0, bounds.width, bounds.height);
        gridSprite.buttonMode = true;
        storageSprite.addChild(gridSprite)
        this.gridSprite = gridSprite
    }

    if (config.title !== undefined) {
        const fontSize = '16px'
        //const fontSize = (config.width>400) ? '32px' : '16px'
        var titleTextProps = {
            fontFamily: 'Roboto',
            fontSize: fontSize,
            fill: '#000000',
            align: 'center',
            backgroundColor: '#00000000'
        };
        const titleSprite = new PIXI.Text(config.title, titleTextProps)
        titleSprite.x = config.width / 2 + marginX
        titleSprite.y = marginY
        titleSprite.anchor = new PIXI.Point(0.5, 1)
        storageSprite.addChild(titleSprite)
        this.titleSprite = titleSprite
    }
    const storageSpriteBounds = storageSprite.getBounds()
    const storageDetails = new StorageDetails(storageSpriteBounds.width + marginX, storageSpriteBounds.height + marginY)
    //storageDetails.outline(storageSprite)
    
    storageSprite.y = config.height
}
Object.defineProperty(bionetStorageContainer, "grid", {
    get: function getp1() {
        return this.grid
    }
});
Object.defineProperty(bionetStorageContainer, "gridSprite", {
    get: function getp1() {
        return this.gridSprite
    }
});
module.exports = bionetStorageContainer
