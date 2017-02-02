const ScanGrid = function (xcells, ycells, width, height) {
    this.xcells = xcells
    this.ycells = ycells
    this.width = width
    this.height = height
}

// generate grid
ScanGrid.prototype.drawGrid = function (container) {
    var i = 0;
    const xcells = this.xcells
    const ycells = this.ycells
    console.log('draw grid', xcells, ycells)
    const width = this.width
    const height = this.height
    const dx = width / xcells
    const dy = height / ycells
    const ticLength = 40
    const lineThickness = 10
    const t2 = lineThickness / 2

    var graphics = new PIXI.Graphics();

    // grid line style
    graphics.lineStyle(lineThickness, 0x21dfcc);

    // grid labels text style
    const textProps = {
        font: '70px Arial',
        fill: '#00a5dc',
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
        graphics.beginFill(0x00FF00);
        graphics.moveTo(x, y1 - tic)
        graphics.lineTo(x, y2 + tic)
        graphics.endFill();

        // draw grid labels
        if (i < xcells) {
            var xp = (i < 9) ? x + dx / 3 : x + dx / 4

            var label = new PIXI.Text(i + 1, textProps);
            label.position.x = xp
            label.position.y = -3 * ticLength;
            container.addChild(label);

            label = new PIXI.Text(i + 1, textProps);
            label.position.x = xp
            label.position.y = y2 + ticLength;
            container.addChild(label);
        }

    }

    // draw y axis
    const x1 = 0
    const x2 = width
    const cs = 'A'
    const cc = cs.charCodeAt(0)

    for (i = 0; i <= ycells; i++) {

        var y = i * dy
        var tic = (i === 0 || i === ycells) ? t2 : ticLength

        // draw grid line
        graphics.beginFill(0x00FF00);
        graphics.moveTo(x1 - tic, y);
        graphics.lineTo(x2 + tic, y);
        graphics.endFill();

        // draw grid labels
        if (i < ycells) {
            var yp = y + dy / 4
            var gridlabel = String.fromCharCode(i + cc)

            var label = new PIXI.Text(gridlabel, textProps);
            label.position.x = x1 - ticLength * 2
            label.position.y = yp
            container.addChild(label)

            label = new PIXI.Text(gridlabel, textProps)
            label.position.x = x2 + ticLength * 1
            label.position.y = yp
            container.addChild(label);
        }
    }

    container.addChild(graphics);
}

ScanGrid.prototype.getCellCoordinates = function (cellid) {
    const cs = 'A'
    const cc = cs.charCodeAt(0)
    const xcell = (cellid % this.xcells) + 1
    const ycell = Math.trunc(cellid / this.xcells)
    return xcell.toString() + String.fromCharCode(ycell + cc)
}

// process grid cells
ScanGrid.prototype.process = function (scanIndicator, highlight) {
    const xcells = this.xcells
    const ycells = this.ycells
    const width = this.width
    const height = this.height

    var i = 0;
    var n = 0
    var cells = []
    if (highlight !== undefined) {
        n = highlight.length
        cells = highlight
    } else {
        n = xcells * ycells
    }
    const dx = width / xcells
    const dy = height / ycells
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

module.exports = ScanGrid
