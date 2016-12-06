const bionetScannerApi = {
  // simulated scanner
  startScan: function (xcells, ycells, x,y,width, height, cb) {
    console.log('bionetScannerApi: start scan')
    var i = 0;
    var n = xcells * ycells
    const dx = width / xcells
    const dy = height / ycells
    const timerloop = setInterval(function () {
        var xcell = (i % xcells)
        var ycell = Math.trunc(i / xcells)

        // invoke callback for each qrcode scanned
        var scanCellDef = {}
        const cellStatus = Math.random()
        if (cellStatus < 0.95 && i > 0) {
          scanCellDef.qrcode = 'qrcode'
        }
        scanCellDef.x = xcell * dx
        scanCellDef.y = ycell * dy
        scanCellDef.width = dx
        scanCellDef.height = dy
        cb(scanCellDef)

        if (++i >= n) {
          clearInterval(timerloop);
        }
      },
      75);
  }
}
module.exports = bionetScannerApi
