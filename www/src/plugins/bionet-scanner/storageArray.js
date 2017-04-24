const PIXI = require('pixi.js')

const StorageArray = function (units, width, height) {
    this.width = width
    this.height = height
    this.units = units
    this.scale = 1
}

Object.defineProperty(StorageArray, "scale", {
    get: function getscale() {
        return this.scale
    },
    set: function (scale) {
        this.setScale(scale)
    }
});
Object.defineProperty(StorageArray, "p1", {
    get: function getp1() {
        return this.p1
    },
    set: function setp1(p1) {
        this.p1 = p1
    }
});
Object.defineProperty(StorageArray, "p2", {
    get: function getp1() {
        return this.p2
    },
    set: function setp1(p1) {
        this.p1 = p2
    }
});
StorageArray.prototype.setScale = function (scale) {
    this.scale = scale
    const units = this.units
    const height = this.height
    if (!units) return
    for (var i = 0; i < units.length; i++) {
        const unit = units[i]
        unit.x *= scale
        unit.y *= scale
        //unit.y = (height-unit.y) * scale
        unit.width *= scale
        unit.height *= scale
    }
}

StorageArray.prototype.highlight = function (index, container) {
    const unit = this.units[index]
    if (!unit) return
    const p1x = unit.x
    const p1y = unit.y
    this.p1 = new PIXI.Sprite()
    this.p1.x = p1x
    this.p1.y = p1y
    container.addChild(this.p1)
    this.p1.updateTransform()

    const p2x = p1x + unit.width
    const p2y = p1y + unit.height

    this.p2 = new PIXI.Sprite()
    this.p2.x = p2x
    this.p2.y = p2y
    container.addChild(this.p2)
    this.p2.updateTransform()

    this.drawHighlight(p1x, p1y, p2x, p2y, container)
}

StorageArray.prototype.drawHighlight = function (p1x, p1y, p2x, p2y, container) {
    if (this.highlightSprite) {
        container.removeChild(this.highlightSprite)
    }
    const alpha = 0.3
    var graphics = new PIXI.Graphics();
    graphics.lineStyle(6, 0xff0000, alpha);
    graphics.moveTo(p1x, p1y)
    graphics.lineTo(p2x, p1y)
    graphics.lineTo(p2x, p2y)
    graphics.lineTo(p1x, p2y)
    graphics.lineTo(p1x, p1y)
    graphics.beginFill(0xff0000, alpha);
    graphics.drawRect(p1x, p1y, p2x - p1x, p2y - p1y)
    graphics.endFill();
    container.addChild(graphics);
    this.highlightSprite = graphics
}

module.exports = StorageArray
