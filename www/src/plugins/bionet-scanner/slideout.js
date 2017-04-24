const PIXI = require('pixi.js')

const slideoutApi = function (resourceUrl, x, y, x2, y2, slideoutButton, stage, visible) {

  this.x = x
  this.y = y
  this.x2 = x2
  this.y2 = y2
  this.toggleState = false
  this.visible = visible
  this.slideoutButton = slideoutButton

  const container = new PIXI.Sprite.fromImage(resourceUrl);
  container.x = x;
  container.y = y;
  if (visible !== undefined) container.visible = visible
  stage.addChild(container)
  this.container = container

  // open slideout tween
  const tweenOpen = PIXI.tweenManager.createTween(container);
  this.tweenOpen = tweenOpen
  tweenOpen.easing = PIXI.tween.Easing.outSine();
  tweenOpen.time = 500;
  tweenOpen.from({
    x: x,
    y: y
  })
  tweenOpen.to({
    x: x2,
    y: y2
  })

  // close slideout tween
  const tweenClose = PIXI.tweenManager.createTween(container);
  this.tweenClose = tweenClose
  tweenClose.easing = PIXI.tween.Easing.inSine();
  tweenClose.time = 500;
  tweenClose.from({
    x: x2,
    y: y2
  })
  tweenClose.to({
    x: x,
    y: y
  })

  slideoutButton.interactive = true
  slideoutButton.on('mousedown', this.toggle.bind(this))
  slideoutButton.on('touchstart', this.toggle.bind(this))
  container.addChild(slideoutButton)

  //return container
}

slideoutApi.prototype.open = function () {
  this.tweenOpen.start()
  this.tweenClose.reset()
}

slideoutApi.prototype.close = function () {
  this.tweenClose.start()
  this.tweenOpen.reset()
}

slideoutApi.prototype.toggle = function () {
  if (this.toggleState) {
    this.close()
  } else {
    this.open()
  }
  this.toggleState = !this.toggleState
}

module.exports = slideoutApi
