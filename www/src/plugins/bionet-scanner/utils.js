class utils {

    static svgToImage(svg, resolve, reject) {

        if (!Array.isArray(svg)) {
            svg = [svg];
        }

        var blob = new window.Blob(svg, {
            type: 'image/svg+xml;charset=utf-8'
        });

        var DOMURL = window.URL;
        var url = DOMURL.createObjectURL(blob);

        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
            resolve(img);
            DOMURL.revokeObjectURL(url);
        };
        img.onerror = reject;
        img.src = url;
    }

    static svgToImage2(url, resolve, reject) {

        var img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function () {
            resolve(img);
        };
        img.onerror = reject;
        img.src = url;
    }

    static clickSprite(stage, inActiveUrl, activeUrl, x, y, onClick) {

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

    static processPIXITemplate(template, view, cb) {
        const output = Mustache.render(template, view);
        this.svgToImage(output, function (image) {
            const baseImage = new PIXI.BaseTexture(image);
            const texture = new PIXI.Texture(baseImage);
            cb(texture);
        }, function () {
            //console.log(err);
        });
    }

    static processTemplate(game, templateKey, view, cb) {
        var template = game.cache.getText(templateKey);
        var output = Mustache.render(template, view);
        this.svgToImage(output, function (image) {
            //var rect = image.getBoundingClientRect();
            var bm = game.add.bitmapData(image.width, image.height);
            bm.ctx.drawImage(image, 0, 0);
            cb(bm);
        }, function () {
            //console.log(err);
        });
    }


}
export default utils;
