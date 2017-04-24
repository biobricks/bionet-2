const PIXI = require('pixi.js')
const pixijsutils = require('./pixijsutils')

const moveAndZoomXform = function (container, clickSprite, dest, toggleAction, index) {

    // setup activate tween actions
    clickSprite.interactive = true
    clickSprite.on('mousedown', this.click.bind(this))
    clickSprite.on('touchstart', this.click.bind(this))
    clickSprite.buttonMode = true

    // setup sprite initial position
    const p1 = {
        x: container.x,
        y: container.y,
        scale: 1
    }
    const p2 = {
        x: dest.x,
        y: dest.y,
        scale: dest.scale
    }

    this.toggleState = true;
    this.container = container;
    this.transition = [p1, p2];
    this.tween = [];
    this.toggleAction = toggleAction;
    this.index = index
    this.xformTime = 750
}

// create transitions between x,y,width,height 
moveAndZoomXform.prototype.createTransitionTween = function (t1, t2) {
    const sprite = this.container;
    const tween = PIXI.tweenManager.createTween(sprite);

    const p1 = this.transition[t1];
    tween.from({
        x: p1.x,
        y: p1.y,
        scale: {
            x: p1.scale,
            y: p1.scale
        }

    })
    const p2 = this.transition[t2];
    tween.to({
        x: p2.x,
        y: p2.y,
        scale: {
            x: p2.scale,
            y: p2.scale
        }
    })

    tween.easing = PIXI.tween.Easing.outSine();
    tween.time = this.xformTime;
    return tween;
}

// create transitions between x,y,width,height 
moveAndZoomXform.prototype.initializeTweens = function () {
    // setup transition tweens
    this.tween[0] = this.createTransitionTween(0, 1)
    this.tween[1] = this.createTransitionTween(1, 0)
}


moveAndZoomXform.prototype.to = function () {
    this.initializeTweens()
    if (!this.tween[0]) this.initializeTweens();
    this.tween[0].start()
    this.tween[1].reset()
}

moveAndZoomXform.prototype.from = function () {
    this.initializeTweens()
    if (!this.tween[0]) this.initializeTweens();
    this.tween[1].start()
    this.tween[0].reset()
}

moveAndZoomXform.prototype.click = function () {
    if (this.toggleAction) this.toggleAction(this.toggleState, this.index);
    this.toggle()
}

moveAndZoomXform.prototype.toggle = function () {
    if (this.toggleState) {
        this.to();
    } else {
        this.from();
    }
    this.toggleState = !this.toggleState
    pixijsutils.animate(this.xformTime/1000)
}
module.exports = moveAndZoomXform
