import nanoStream from '../../app/NanoStream';
import nanoRoute from '../../app/NanoRoute';
import utils from './utils'
import labStorageItem from './moveAndZoomSprite'

const labStorage = {

  init: function (streams, stage) {
    this.streams = streams;
    this.stage = stage
    this.assets = '/static/assets/lab-storage/';
    const s = this.streams;

    // handle controller events
    const thisModule = this;
    s.controller.addObserver((msg) => {
      switch (msg.cmd) {
        case 'load':
          thisModule.load();
          break;

        case 'configure':
          thisModule.configuration = msg.data
          console.log('lab storage configuration:', JSON.stringify(thisModule.configuration))
          thisModule.initializeModel();
          break;

        case 'scan':
          break;

        case 'ready':
          thisModule.onLoadComplete(msg.data);
          break;
      }
    });
  },

  load: function () {
    console.log('labStorage load function')

    var loader = PIXI.loader;
    loader.baseUrl = this.assets
    loader.add('labLayout', 'labLayout.svg');
      
    // freezer or shelving unit
    loader.add('freezer01', 'freezer01.svg');
      
    // rack or shelf
    loader.add('rack01', 'rack01.svg');
      
    // box or tray
      
    /*
    loader.add('transparentPixel', 'pixel.png');
    loader.add('scanImage', 'scan_sm.png');
    loader.add('scanImage10x10', 'scan_10x10.jpg');
    loader.add('scanBackground', 'scannerTrayBackground.png');
    loader.add('scanCellIdent', 'scanCellIdent.png');
    loader.add('scanCellNoIdent', 'scanCellNoIdent.png');
    loader.add('testPattern', 'testPattern.png');
    loader.add('microsphere', 'microsphere.png');
    loader.add('datamatrix', 'datamatrix.jpg');
    loader.add('background', 'scannerBackgroundTile.png');
    */
  },
    
  initializeModel: function() {
      // initialize lab sprite
      // initialize freezer sprites
  },

  onLoadComplete: function (resources) {
    console.log('labStorage onLoadComplete function')

    const s = this.streams;
    const thisModule = this;
    
    // initialize view root container
    const rootContainer = new PIXI.Container()
    
    // initialize lab container
    const labContainer = new PIXI.Container()
    const labImage = new PIXI.Sprite.fromImage(this.assets + 'labImage.png');
    labContainer.addChild(labImage);
    
    // initialize freezer or shelving unit container
    const storageUnitContainer = new PIXI.Container()
    
    // initialize rack or shelf container
    const storageSubUnitContainer = new PIXI.Container()
    
    // initialize initialize box container
    const storageItemContainer = new PIXI.Container()
    
    s.update.observe(() => {
      //if (isScanning) microsphere.tilePosition.y = microspherey += 1.5;
    });

    console.log('lab storage initialized')
  }
}
module.exports = labStorage
