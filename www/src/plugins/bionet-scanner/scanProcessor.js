const scanProcessor = {
  process: function (scanIndicator, xcells, ycells, width, height) {
    var i = 0;
    var n = xcells * ycells
    const dx = width / xcells
    const dy = height / ycells
    const timerloop = setInterval(function () {
        var xcell = (i % xcells)
        var ycell = Math.trunc(i / xcells)

        var scanCellDef = {}
        const cellStatus = Math.random()
        if (cellStatus < 0.95 && i > 0) {
          scanCellDef.qrcode = 'qrcode'
        }
        scanCellDef.x = xcell * dx
        scanCellDef.y = ycell * dy
        scanCellDef.width = dx
        scanCellDef.height = dy

        scanIndicator.dispatch(scanCellDef)

        if (++i >= n) {
          clearInterval(timerloop);
        }
      },
      50);
  }
}
module.exports = scanProcessor
