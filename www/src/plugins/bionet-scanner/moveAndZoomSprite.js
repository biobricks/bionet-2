const moveAndZoomSprite = function (container, p1, p2, toggleAction, visible) {

    // create sprite
    //const container = new PIXI.Sprite.fromImage(resourceUrl);

    // setup sprite initial position
    container.x = p1.x;
    container.y = p1.y;
    container.width = p1.width;
    container.height = p1.height;

    // setup activate tween actions
    container.interactive = true
    container.on('mousedown', this.toggle.bind(this))
    container.on('touchstart', this.toggle.bind(this))

    if (visible !== undefined) container.visible = visible
    //stage.addChild(container)

    this.toggleState = false;
    this.container = container;
    this.transition = [{
            x: p1.x,
            y: p1.y,
            width: p1.width,
            height: p1.height
        },
        {
            x: p2.x,
            y: p2.y,
            width: p2.width,
            height: p2.height
        }];
    this.tween=[];
    this.toggleAction=toggleAction;
    //return container
}

moveAndZoomSprite.prototype.setTween = function (tw, id) {
    this.transition[id] = tw;
    this.initializeTweens();
}

// create transitions between x,y,width,height 
moveAndZoomSprite.prototype.initializeTweens = function () {
    const sprite = this.container;
    const createTransitionTween = (t1, t2) => {
        const tween = PIXI.tweenManager.createTween(sprite);

        const p1 = this.transition[t1];
        tween.from({
            x: p1.x,
            y: p1.y,
            width: p1.width,
            height: p1.height,
        })
        const p2 = this.transition[t2];
        tween.to({
            x: p2.x,
            y: p2.y,
            width: p2.width,
            height: p2.height,
        })

        tween.easing = PIXI.tween.Easing.outSine();
        tween.time = 500;
        return tween;
    }

    // setup transition tweens
    this.tween[0] = createTransitionTween(0, 1)
    this.tween[1] = createTransitionTween(1, 0)
}

moveAndZoomSprite.prototype.toggle = function () {
    if (!this.tween[0]) this.initializeTweens();
    if (this.toggleAction) this.toggleAction(this.toggleState);
    if (this.toggleState) {
        this.tween[0].start()
        this.tween[1].reset()
    } else {
        this.tween[1].start()
        this.tween[0].reset()
    }
    this.toggleState = !this.toggleState
}

module.exports = moveAndZoomSprite
