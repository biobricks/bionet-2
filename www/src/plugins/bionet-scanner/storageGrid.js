const PIXI = require('pixi.js')
const pixijsutils = require('./pixijsutils')

const StorageGrid = function (xcells, ycells, width, height, xalpha, yalpha) {
    this.xcells = xcells
    this.ycells = ycells
    this.width = width
    this.height = height
    this.xalpha = (xalpha === undefined) ? xalpha : false
    this.yalpha = (yalpha === undefined) ? yalpha : false
    this.dx = width / xcells
    this.dy = height / ycells
    this.mouseoverSprite = new PIXI.Container()
}

// generate grid
StorageGrid.prototype.drawGrid = function (container) {
    var i = 0;
    const xcells = this.xcells
    const ycells = this.ycells
    const width = this.width
    const height = this.height
    const margin = 10
    const dx = this.dx
    const dy = this.dy
    const ticLength = 4
    const lineThickness = 2
    const t2 = lineThickness / 2
    const anchorPoint = new PIXI.Point(0.5, 0.5)

    var graphics = new PIXI.Graphics();

    // grid line style
    graphics.lineStyle(lineThickness, 0);
    const textColor = '#000000'

    // grid labels text style
    const textProps = {
        fontFamily: 'Roboto',
        fontSize: '70px',
        fill: textColor,
        fontWeight: 1600,
        backgroundColor: '#00000000',
        wordWrap: false
    }

    // draw x axis
    const y1 = 0
    const y2 = height

    for (i = 0; i <= xcells; i++) {

        var x = i * dx
        var tic = (i === 0 || i === xcells) ? t2 : ticLength

        // draw grid line
        graphics.moveTo(x, y1 - tic)
        graphics.lineTo(x, y2 + tic)

        // draw grid labels
        if (i < xcells && xcells > 1) {
            var xp = x + dx / 2

            var label = new PIXI.Text(i + 1, textProps);
            label.anchor = anchorPoint
            label.position.x = xp
            label.position.y = y1 - margin;
            container.addChild(label);

            label = new PIXI.Text(i + 1, textProps);
            label.anchor = anchorPoint
            label.position.x = xp
            label.position.y = y2 + margin;
            container.addChild(label);
        }
    }

    // draw y axis
    const x1 = 0
    const x2 = width
    const cs = (this.yalpha === true) ? 'A' : '1'
    const cc = cs.charCodeAt(0)
    for (i = 0; i <= ycells; i++) {

        var y = i * dy
        var tic = (i === 0 || i === ycells) ? t2 : ticLength

        // draw grid line
        graphics.moveTo(x1 - tic, y);
        graphics.lineTo(x2 + tic, y);

        // draw grid labels
        if (i < ycells && ycells > 1) {
            var yp = y + dy / 2
            var gridlabel = String.fromCharCode(i + cc)

            var label = new PIXI.Text(gridlabel, textProps);
            label.anchor = anchorPoint
            label.position.x = x1 - 10
            label.position.y = yp
            container.addChild(label)

            label = new PIXI.Text(gridlabel, textProps)
            label.anchor = anchorPoint;
            label.position.x = x2 + 10
            label.position.y = yp
            container.addChild(label);
        }
    }
    container.addChild(graphics);
    container.addChild(this.mouseoverSprite)
    this.sprite = graphics
}

StorageGrid.prototype.getCellCoordinates = function (cellid) {
    const cs = (this.yalpha === true) ? 'A' : '0'
    const cc = cs.charCodeAt(0)
    const xcell = (cellid % this.xcells) + 1
    const ycell = Math.trunc(cellid / this.xcells)
    return xcell.toString() + String.fromCharCode(ycell + cc)
}

StorageGrid.prototype.getCellCoordinatesFromPoint = function (point) {
    return {
        x: Math.trunc(point.x / this.dx) + 1,
        y: Math.trunc(point.y / this.dy) + 1
    }
}

Object.defineProperty(StorageGrid, "p1", {
    get: function getp1() {
        return this.p1
    },
    set: function setp1(p1) {
        this.p1 = p1
    }
});
Object.defineProperty(StorageGrid, "p2", {
    get: function getp1() {
        return this.p2
    },
    set: function setp1(p1) {
        this.p1 = p2
    }
});

StorageGrid.prototype.highlightMouseover = function (name, x, y, container) {
    var annotation = this.mouseoverSprite
    annotation.removeChildren()
    annotation.x = x
    annotation.y = y
    annotation.updateTransform()
    const graphics = new PIXI.Graphics();
    annotation.addChild(graphics)
        //container.addChild(annotation)

    const textColor = '#000000'
    const textProps = {
        fontFamily: 'Ariel',
        fontSize: '64px',
        fill: textColor,
        fontWeight: 1600
    }
    const label = new PIXI.Text(name, textProps);
    label.scale.x = label.scale.y = 3
    annotation.addChild(label)
    label.updateTransform()
    label.calculateBounds()

    annotation.updateTransform()
    annotation.calculateBounds()
    const bounds = label.getLocalBounds()
    const margin = 6
    const bw = bounds.width
    const bh = bounds.height
    graphics.beginFill(0xffffff);
    graphics.drawRect(0, 0, bw, bh)
    graphics.endFill();
    graphics.scale.x = graphics.scale.y = 3

    this.mouseoverSprite.visible = true
}

StorageGrid.prototype.highlightId = function (id, data, x, y, container, multiple) {
    const graphics = this.highlight(x, y, container, multiple, 0x00ffff)
    graphics.interactive = true
    graphics.mouseover = function () {
        console.log('cell highlight mouseover ', data.name, x, y)
        const dx = this.dx
        const dy = this.dy
        const p1x = (x - 1) * dx
        const p1y = (y - 1) * dy
        this.highlightMouseover(data.name + ' (' + x + ',' + y + ')', p1x, p1y, container)
        pixijsutils.renderStage()
    }.bind(this)
    graphics.mouseout = function () {
        console.log('cell highlight mouseout ', name, x, y)
            //this.mouseoverSprite.visible = false
        pixijsutils.renderStage()
    }.bind(this)
}

StorageGrid.prototype.highlight = function (x, y, container, multiple, highlightColor) {
    const dx = this.dx
    const dy = this.dy
    const p1x = (x - 1) * dx
    const p1y = (y - 1) * dy

    const p1 = new PIXI.Sprite()
    p1.x = p1x
    p1.y = p1y
    container.addChild(p1)
    p1.updateTransform()

    const p2x = p1x + dx
    const p2y = p1y + dy

    const p2 = new PIXI.Sprite()
    p2.x = p2x
    p2.y = p2y
    container.addChild(p2)
    p2.updateTransform()

    const graphics = this.drawHighlight(p1x, p1y, p2x, p2y, container, multiple, highlightColor)
    if (multiple !== true) {
        this.p1 = p1
        this.p2 = p2
    }
    return graphics
}

StorageGrid.prototype.initHighlight = function (x1, y1, x2, y2, container) {
    const p1x = x1
    const p1y = y1

    this.p1 = new PIXI.Sprite()
    this.p1.x = p1x
    this.p1.y = p1y
    container.addChild(this.p1)
    this.p1.updateTransform()

    const p2x = x2
    const p2y = y2

    this.p2 = new PIXI.Sprite()
    this.p2.x = p2x
    this.p2.y = p2y
    container.addChild(this.p2)
    this.p2.updateTransform()
    this.drawHighlight(p1x, p1y, p2x, p2y, container)
}

StorageGrid.prototype.drawHighlight = function (p1x, p1y, p2x, p2y, container, multiple, highlightColor) {
    const color = (highlightColor !== undefined) ? highlightColor : 0xff0000
    var pos = 0
    if (multiple !== true) {
        if (this.highlightSprite) {
            container.removeChild(this.highlightSprite)
        }
        pos = (container.children !== undefined && container.children.length > 0) ? container.children.length - 1 : 0
    }
    const alpha = 0.3
        //const alpha = 1
    var graphics = new PIXI.Graphics();
    graphics.lineStyle(6, color, alpha);
    graphics.moveTo(p1x, p1y)
    graphics.lineTo(p2x, p1y)
    graphics.lineTo(p2x, p2y)
    graphics.lineTo(p1x, p2y)
    graphics.lineTo(p1x, p1y)
    graphics.beginFill(color, alpha);
    graphics.drawRect(p1x, p1y, p2x - p1x, p2y - p1y)
    graphics.endFill();
    container.addChildAt(graphics, pos);
    if (multiple !== true) {
        this.highlightSprite = graphics
    }
    return graphics
}

// process grid cells
StorageGrid.prototype.process = function (scanIndicator, highlight) {
    const xcells = this.xcells
    const ycells = this.ycells
    const width = this.width
    const height = this.height
    const dx = this.dx
    const dy = this.dy

    var i = 0;
    var n = 0
    var cells = []
    if (highlight !== undefined) {
        n = highlight.length
        cells = highlight
    } else {
        n = xcells * ycells
    }
    var cell = 0
    var n = 8

    const nextCell = function () {
        cell = (highlight !== undefined) ? cells[i] : i
            //var xcell = (cell % xcells)
            //var ycell = Math.trunc(cell / xcells)
        var xcell = Math.trunc(Math.random() * xcells)
        var ycell = Math.trunc(Math.random() * ycells)

        var scanCellDef = {}
        const cellStatus = Math.random()
        if (cellStatus < 0.95 && i > 0 || highlight !== undefined) {
            scanCellDef.qrcode = 'qrcode'
        }
        scanCellDef.x = xcell * dx
        scanCellDef.y = ycell * dy
        scanCellDef.width = dx
        scanCellDef.height = dy

        if (++i > n) {
            clearInterval(timerloop);
            if (highlight !== undefined) {
                setTimeout(function () {
                    scanIndicator.dispatch({
                        cmd: 'end'
                    })
                }, 150)
            } else {
                scanIndicator.dispatch({
                    cmd: 'end'
                })
            }
        } else {
            scanIndicator.dispatch(scanCellDef)
        }
    }

    nextCell();
    const timerloop = setInterval(nextCell, 200);

}

module.exports = StorageGrid
