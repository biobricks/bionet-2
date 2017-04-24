const PIXI = require('pixi.js')

const StorageDetails = function (width, height) {
    this.width = width
    this.height = height
    this.scale = 1
}

Object.defineProperty(StorageDetails, "scale", {
    get: function getscale() {
        return this.scale
    },
    set: function (scale) {
        this.setScale(scale)
    }
});

StorageDetails.prototype.setScale = function (scale) {
    this.scale = scale
}

StorageDetails.prototype.outline = function (container) {
    if (this.outlineSprite) {
        container.removeChild(this.outlineSprite)
    }
    const p1x = 0
    const p1y = 0
    const p2x = this.width
    const p2y = this.height
    const alpha = 0.3
    var graphics = new PIXI.Graphics();
    graphics.lineStyle(4, 0x000000, alpha);
    graphics.moveTo(p1x, p1y)
    graphics.lineTo(p2x, p1y)
    graphics.lineTo(p2x, p2y)
    graphics.lineTo(p1x, p2y)
    graphics.lineTo(p1x, p1y)
    //graphics.beginFill(0xff0000, alpha);
    //graphics.drawRect(p1x, p1y, p2x - p1x, p2y - p1y)
    //graphics.endFill();
    container.addChild(graphics);
    this.outlineSprite = graphics
}

module.exports = StorageDetails
