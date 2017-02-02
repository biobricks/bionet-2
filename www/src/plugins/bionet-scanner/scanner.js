import nanoStream from '../../app/NanoStream';
import nanoRoute from '../../app/NanoRoute';
import utils from './utils'
import Slideout from './slideout'
import ScanGrid from './scanGrid'

// create click button
// todo: move to utils
const clickSprite = function (stage, inActiveUrl, activeUrl, x, y, onClick) {

  const clickButtonWrapper = new PIXI.Sprite.fromImage(inActiveUrl);
  clickButtonWrapper.x = x;
  clickButtonWrapper.y = y;
  stage.addChild(clickButtonWrapper)

  clickButtonWrapper.interactive = true;
  clickButtonWrapper.on('mousedown', onClick);
  clickButtonWrapper.on('touchstart', onClick);

  if (activeUrl !== undefined) {
    const clickButton = new PIXI.Sprite.fromImage(activeUrl);
    clickButton.visible = false
    clickButtonWrapper.addChild(clickButton);
  }
  return clickButtonWrapper
}

const scanner = {

  init: function (streams, stage) {
    this.streams = streams;
    this.stage = stage
    this.assets = '/static/assets/scanner-widget/';
    const s = this.streams;

    // scan indicator stream
    s.scanIndicator = new nanoStream()

    // handle controller events
    const thisModule = this;
    s.controller.observe((msg) => {
      switch (msg.cmd) {
        case 'load':
          thisModule.load();
          break;

        case 'configure':
          thisModule.configuration = msg.data
          console.log('scanner configuration:', JSON.stringify(thisModule.configuration))
          break;

        case 'scan':
          if (thisModule.configuration.selection !== undefined) {
            thisModule.startScan({}, [thisModule.configuration.selection])
          }
          break;

        case 'ready':
          thisModule.onLoadComplete(msg.data);
          break;
      }
    });
  },

  load: function () {
    var loader = PIXI.loader;
    loader.reset()
    loader.baseUrl = this.assets
    loader.add('transparentPixel', 'pixel.png');
    loader.add('scanImage', 'scan_sm.png');
    loader.add('scanImage10x10', 'scan_10x10.jpg');
    loader.add('scanBackground', 'scannerTrayBackground.png');
    loader.add('scanCellIdent', 'scanCellIdent.png');
    loader.add('scanCellNoIdent', 'scanCellNoIdent.png');
    //loader.add('testPattern', 'bionet_logo.png');
    loader.add('testPattern', 'testPattern.png');
    loader.add('microsphere', 'microsphere.png');
    loader.add('datamatrix', 'datamatrix.jpg');
    loader.add('background', 'scannerBackgroundTile.png');
    //loader.add('background', 'scannerBackground.svg');
  },

  onLoadComplete: function (resources) {
    const trayFormat = (this.configuration.cassetteType)

    const s = this.streams;
    const thisModule = this
    console.log('initializing sprites')

    // background
    const bg = new PIXI.extras.TilingSprite(resources.background.texture, 1600, 1120);
    bg.x = 0;
    bg.y = 0;
   this.stage.addChild(bg);

    // arrow buttons
    const arrowDown = new PIXI.Sprite.fromImage(this.assets + 'arrowDown.svg');
    arrowDown.x = 1225;
    arrowDown.y = 1010 - 49;

    const arrowUp = new PIXI.Sprite.fromImage(this.assets + 'arrowUp.svg');
    arrowUp.x = 92;
    arrowUp.y = 1010 - 837;

    const arrowRight = new PIXI.Sprite.fromImage(this.assets + 'arrowRight.svg');
    arrowRight.x = 1261;
    arrowRight.y = 1010 - 377;

    const arrowLeft = new PIXI.Sprite.fromImage(this.assets + 'arrowLeft.svg');
    arrowLeft.x = 130;
    arrowLeft.y = 960;

    //todo: user-defined grid adjustment
    const gridAdjustment = {
      x: -2,
      y: 2,
      width: 3,
      height: -2
    }
    var SCAN_GRID_PIXELS_X
    var trayFormatStr = ''
    if (trayFormat === 1) {
      trayFormatStr = ' 12x8'
      SCAN_GRID_PIXELS_X = 902 + gridAdjustment.width
    } else {
      trayFormatStr = ' 10x10'
      SCAN_GRID_PIXELS_X = 600 + gridAdjustment.width
    }
    const SCAN_GRID_PIXELS_Y = 600 + gridAdjustment.height

    // scan background
    var scanTexture = {}
    if (trayFormat === 1) {
      scanTexture = resources.scanImage.texture
    } else {
      scanTexture = resources.scanImage10x10.texture
    }
    const scanSprite = new PIXI.Sprite(resources.scanBackground.texture);
    scanSprite.x = 0
    scanSprite.y = 0
    scanSprite.width = scanTexture.width
    scanSprite.height = scanTexture.height
    scanSprite.visible = true

    // scanner tray grid
    const scanTray = new PIXI.Sprite.fromImage(this.assets + 'scanner12x8Tray.svg');
    scanTray.x = 0;
    scanTray.y = 0;
    this.stage.addChild(scanTray);

    // scan counters
    var cassetteTextProps = {
      font: '26px Arial',
      fill: '#00a5dc',
      backgroundColor: '#00000000'
    };
    var cassetteTxtStr = (this.configuration.cassette !== undefined) ? this.configuration.cassette.locationid + trayFormatStr : trayFormatStr;
    const cassetteText = new PIXI.Text(cassetteTxtStr, cassetteTextProps);
    cassetteText.position.x = 418;
    cassetteText.position.y = 115;
    scanTray.addChild(cassetteText);

    // scan image
    const scanImage = new PIXI.Sprite(scanTexture);
    const scanCellsContainer = new PIXI.Container()
    scanImage.addChild(scanSprite);
    scanImage.addChild(scanCellsContainer)
    if (trayFormat === 1) {
      scanImage.x = 300 + gridAdjustment.x
    } else {
      scanImage.x = 450 + gridAdjustment.x
    }
    scanImage.y = 212 + gridAdjustment.y
    scanImage.width = SCAN_GRID_PIXELS_X
    scanImage.height = SCAN_GRID_PIXELS_Y
    scanImage.visible = true

    this.stage.addChild(scanImage);

    var scanGrid = {}
    if (trayFormat === 1) {
      scanGrid = new ScanGrid(12, 8, scanTexture.width, scanTexture.height)
    } else {
      scanGrid = new ScanGrid(10, 10, scanTexture.width, scanTexture.height)
    }

    const closeButton = clickSprite(this.stage, this.assets + 'closeButton.svg', undefined, 1500, -1000, function (e) {
      s.plugin.dispatch({
        cmd: 'close'
      })
    });

    // toggle camera function
    var toggleCamera = false
    const cameraButton = clickSprite(scanTray, this.assets + 'scannerTrayCamera.svg', this.assets + 'scannerTrayCameraActive.svg', 1034, 99, function (e) {
      toggleCamera = !toggleCamera
      scanSprite.visible = !toggleCamera
      scanSprite.alpha = 1
      cameraButton.children[0].visible = toggleCamera
    });

    // slideouts
    const listSlideout = new Slideout(this.assets + 'scannerListNavSlideout.svg', 110, 811, 110, -30, arrowUp, this.stage)
      //const scannerStatsSlideout = new Slideout(this.assets + 'scannerStatsSlideout.svg', 1320, -80, 149, -80, arrowLeft, this.stage)
    const scannerStatsSlideout = new Slideout(this.assets + 'scannerStatsSlideout.svg', 1320, -80, 0, -80, arrowLeft, this.stage)
    const partDetailsSlideout = new Slideout(this.assets + 'scannerPartDetailsSlideout.svg', 92, -953, 92, -135, arrowDown, this.stage)
      //const iconNavSlideout = new Slideout(this.assets + 'scannerIconNavSlideout.svg', -1235, -80, 0, -80, arrowRight, this.stage)
    const iconNavSlideout = new Slideout(this.assets + 'scannerIconNavSlideout.svg', -1235, 0, 0, 0, arrowRight, this.stage)

    // scanner stats controls
    const microsphere = new PIXI.extras.TilingSprite(resources.microsphere.texture, 16, 680);
    microsphere.x = 134
    microsphere.y = 238
    microsphere.alpha = 0.5
    scannerStatsSlideout.container.addChild(microsphere)

    const datamatrix = new PIXI.Sprite(resources.datamatrix.texture);
    datamatrix.x = 114
    datamatrix.y = 580
    datamatrix.width = 60
    datamatrix.height = 60
    scannerStatsSlideout.container.addChild(datamatrix)

    const scanIndicators = new PIXI.Sprite.fromImage(this.assets + 'scannerTrayIndicators.svg');
    scanIndicators.x = 89
    scanIndicators.y = 710
    scanIndicators.visible = false
    scannerStatsSlideout.container.addChild(scanIndicators);

    var scanImageCell = new PIXI.Sprite(scanTexture)
    scanImageCell.x = 64
    scanImageCell.y = 343
    scanImageCell.width = 156
    scanImageCell.height = 156
    scanImageCell.visible = false
    scannerStatsSlideout.container.addChild(scanImageCell)

    const scanImageCellBG = new PIXI.Sprite(resources.testPattern.texture)
    scanImageCellBG.x = 64
    scanImageCellBG.y = 343
    scanImageCellBG.width = 156
    scanImageCellBG.height = 156
    scannerStatsSlideout.container.addChild(scanImageCellBG)

    // open scanstats slideout tween
    var scannerStatsSlideoutOpen = PIXI.tweenManager.createTween(scannerStatsSlideout.container);
    scannerStatsSlideoutOpen.easing = PIXI.tween.Easing.outSine();
    scannerStatsSlideoutOpen.time = 600;
    scannerStatsSlideoutOpen.from({
      x: 1620
    });
    scannerStatsSlideoutOpen.to({
      x: 1320
    });
    scannerStatsSlideout.container.x = 1620

    var scannerImageFade = PIXI.tweenManager.createTween(scanImageCell);
    scannerImageFade.easing = PIXI.tween.Easing.outSine();
    scannerImageFade.time = 600;
    scannerImageFade.from({
      alpha: 1
    });
    scannerImageFade.to({
      alpha: 0
    });

    // scan counters
    var textProps = {
      font: '60px Arial',
      fill: '#e0e0e0',
      backgroundColor: '#00000000',
      wordWrap: true,
      wordWrapWidth: 250
    };
    var stats = '';
    const identText = new PIXI.Text(stats, textProps);
    identText.position.x = 22;
    identText.position.y = 10;
    scanIndicators.addChild(identText);
    const ncText = new PIXI.Text(stats, textProps);
    ncText.position.x = 22;
    ncText.position.y = 130;
    scanIndicators.addChild(ncText);

    // scan button
    var ident = 0
    var nc = 0
    var toggleScan = false
    var isScanning = false
    this.startScan = function (e, highlight) {
      toggleScan = true
      scannerStatsSlideout.visible = toggleScan
      scannerStatsSlideoutOpen.start();
      ident = 0
      nc = 0
      scanCellsContainer.removeChildren()
      scanGrid.process(s.scanIndicator, highlight)
      isScanning = true
      microsphere.visible = isScanning
      datamatrix.visible = isScanning
      scanImageCell.alpha = 1
      scannerImageFade.reset()

      if (highlight === undefined) {
        scanIndicators.visible = toggleScan
        scanButton.children[0].visible = toggleScan
        scanSprite.visible = true
        scanSprite.alpha = 0.75
      } else {
        cassetteText.text = thisModule.configuration.cassette.locationid + trayFormatStr + ' ' + scanGrid.getCellCoordinates(highlight[0])
      }

    }
    const scanButton = clickSprite(scanTray, this.assets + 'scannerScanButton.svg', this.assets + 'scannerScanButtonActive.svg', 919, 99, this.startScan);

    const scanGridContainer = new PIXI.Container()
    scanImage.addChild(scanGridContainer)
    scanGrid.drawGrid(scanGridContainer)
    var scannerP1 = new PIXI.Point(2500, 320)
      //var scannerP1 = new PIXI.Point(0, 320)

    // toggle tray button
    var toggleTray = true
    const trayButton = clickSprite(scanTray, this.assets + 'scannerTrayButton.svg', this.assets + 'scannerTrayButtonActive.svg', 963, 898, function (e) {
      trayButton.children[0].visible = toggleTray
      toggleTray = !toggleTray

      // configure 12x8 tray
      if (toggleTray) {
        scanTexture = resources.scanImage.texture
        scanSprite.width = scanTexture.width
        scanSprite.height = scanTexture.height
        scanImage.texture = scanTexture
        scanImage.x = 300 + gridAdjustment.x
        scanImage.width = 902 + gridAdjustment.width
        scanGrid.xcells = 12
        scanGrid.ycells = 8
        scanGrid.width = resources.scanImage.texture.width
        scanGrid.height = resources.scanImage.texture.height
        scannerP1 = new PIXI.Point(2500, 320)

        // configure 10x10 tray
      } else {
        scanTexture = resources.scanImage10x10.texture
        scanSprite.width = scanTexture.width
        scanSprite.height = scanTexture.height
        scanImage.texture = scanTexture
        scanImage.x = 450 + gridAdjustment.x
        scanImage.width = 600 + gridAdjustment.width
        scanGrid.xcells = 10
        scanGrid.ycells = 10
        scanGrid.width = resources.scanImage10x10.texture.width
        scanGrid.height = resources.scanImage10x10.texture.height
        scannerP1 = new PIXI.Point(2800, 310)
      }
      scanGridContainer.removeChildren()
      scanCellsContainer.removeChildren()
      scanGrid.drawGrid(scanGridContainer)
    });

    const scanLine = new PIXI.Container()
    scanLine.alpha = 0.5
    scanImage.addChild(scanLine)
    const blurFilter = new PIXI.filters.BlurFilter()
      //const colorMatrix = new PIXI.ColorMatrixFilter();
      //colorMatrix.contrast(2)
    blurFilter.blur = 40
    var myMask = new PIXI.Graphics();
    myMask.beginFill();
    myMask.drawCircle(0, 0, 150);
    myMask.endFill();

    // observe and update qrcode scan result
    s.scanIndicator.observe((scanCellDef) => {

      if (scanCellDef.cmd !== undefined) {
        if (scanCellDef.cmd === 'end') {
          scanLine.removeChildren()
            //scanImageCell.texture = resources.testPattern.texture
            //scanImageCell.texture = resources.scanBackground.texture
          scannerImageFade.start()
            //scanImageCell.visible = true
          isScanning = false
          microsphere.visible = isScanning
          datamatrix.visible = isScanning
          return
        }
      }

      const x = scanCellDef.x
      const y = scanCellDef.y
      const width = scanCellDef.width
      const height = scanCellDef.height
      var cellTexture = new PIXI.Texture(scanTexture, new PIXI.Rectangle(x, y, width, height))
      var scanCell = {}
      var scanColor = 0xff0000
      var cellColor = 0x00a020
      if (scanCellDef.qrcode !== undefined) {
        //scanCell = new PIXI.Sprite(resources.datamatrix.texture)
        scanCell = new PIXI.Sprite(cellTexture)
          //scanCell.addChild(new PIXI.Sprite(resources.scanCellIdent.texture))
          //scanCell.alpha = 0.2
        ident++
        identText.text = ident
      } else {
        scanCell = new PIXI.Sprite(cellTexture)
          //scanCell.addChild(new PIXI.Sprite(resources.scanCellNoIdent.texture))
        nc++
        ncText.text = nc
        cellColor = scanColor
      }
      scanCell.x = x
      scanCell.y = y
      scanCell.width = width
      scanCell.height = height
      scanCellsContainer.addChild(scanCell)

      //myMask.x=x
      //myMask.y=y
      scanImageCell.texture = cellTexture
      scanImageCell.visible = true
        //scanImageCell.mask=myMask

      const scannerP2 = scanCell.position

      scanLine.removeChildren()

      const p1 = scannerP1
      const p2 = scannerP2
      const p3 = new PIXI.Point(scannerP2.x + width, scannerP2.y + height)

      var graphics = new PIXI.Graphics();
      graphics.alpha = 0.5

      // draw laser beam
      graphics.beginFill(scanColor);
      graphics.lineStyle(10, scanColor);
      graphics.moveTo(p1.x, p1.y)
      if (p2.y > p1.y) {
        graphics.lineTo(p2.x, p2.y)
        graphics.lineTo(p2.x, p3.y)
        graphics.lineTo(p3.x, p3.y)
      } else {
        graphics.lineTo(p3.x, p2.y)
        graphics.lineTo(p2.x, p2.y)
        graphics.lineTo(p2.x, p3.y)
      }
      graphics.lineTo(p1.x, p1.y)
      graphics.endFill();

      // draw highlighted cell
      graphics.lineStyle(30, scanColor);
      graphics.beginFill(scanColor);
      graphics.moveTo(p2.x, p2.y)
      graphics.lineTo(p3.x, p2.y)
      graphics.lineTo(p3.x, p3.y)
      graphics.lineTo(p2.x, p3.y)
      graphics.lineTo(p2.x, p2.y)
      graphics.endFill();

      //console.log(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)

      scanLine.addChild(graphics);

      graphics = new PIXI.Graphics();
      graphics.alpha = 0.5

      // draw highlighted cell
      //graphics.beginFill(0x0080ff);
      const u = 15
      graphics.lineStyle(30, cellColor);
      graphics.moveTo(u, u)
      graphics.lineTo(width - u, u)
      graphics.lineTo(width - u, height - u)
      graphics.lineTo(u, height - u)
      graphics.lineTo(u, u)
      graphics.filters = [blurFilter];
      //graphics.endFill();

      scanCell.addChildAt(graphics, 0)

    })
    var microspherey = 0

    s.update.observe(() => {
      if (isScanning) microsphere.tilePosition.y = microspherey += 1.5;
    });

    setTimeout(function () {
      /*
      if (thisModule.configuration.selection !== undefined) {
        startScan({}, [thisModule.configuration.selection])
      }
      */
      return

      console.log('loading hd resources')
      const scannerStatsSlideout_hd = PIXI.Sprite.fromImage(thisModule.assets + 'scannerStatsSlideout_hd.svg')
      scannerStatsSlideout.container.addChildAt(scannerStatsSlideout_hd, 0)

      const iconNavSlideout_hd = PIXI.Sprite.fromImage(thisModule.assets + 'scannerIconNavSlideout_hd.svg')
      iconNavSlideout.container.addChildAt(iconNavSlideout_hd, 0)

      return

      const listSlideout_hd = new PIXI.Sprite.fromImage(thisModule.assets + 'scannerListNavSlideout_hd.svg')
      listSlideout.container.addChildAt(listSlideout_hd, 0)

      const partDetailsSlideout_hd = PIXI.Sprite.fromImage(thisModule.assets + 'scannerPartDetailsSlideout_hd.svg')
      partDetailsSlideout.container.addChildAt(partDetailsSlideout_hd, 0)

      return
    }, 0)

    console.log('scanner initialized')
  }
}
module.exports = scanner
