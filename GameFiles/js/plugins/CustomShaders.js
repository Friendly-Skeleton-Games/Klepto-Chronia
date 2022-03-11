var frs = frs || {}; // Main namespace
frs.visionLines = [];
frs.tileSize = 48;

(function() {
    frs.visionFragShader =
`
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
void main() {
    gl_FragColor = texture2D(uSampler, vTextureCoord);
}
`;
    frs.visionShader = new PIXI.Filter('', frs.visionFragShader);

    frs.postProcessing = function(graphics) {
        let guardVisionTriangles = new PIXI.Graphics();
        guardVisionTriangles.filters = [frs.visionShader];

        guardVisionTriangles.beginFill(0xFFFFFF, 1.0);
        frs.visionLines.forEach(lineData => {
            let origin = lineData[0];
            let direction = lineData[1];
            let distance = lineData[2];

            let p0 = origin;
            let p1 = [];
            let p2 = [];

            switch (direction) {
                case 8:
                    p1 = [p0[0] - frs.tileSize / 2, p0[1] - distance * frs.tileSize];
                    p2 = [p0[0] + frs.tileSize / 2, p0[1] - distance * frs.tileSize];
                    break;
                case 6:
                    p1 = [p0[0] + distance * frs.tileSize, p0[1] - frs.tileSize / 2];
                    p2 = [p0[0] + distance * frs.tileSize, p0[1] + frs.tileSize / 2];
                    break;
                case 2:
                    p1 = [p0[0] - frs.tileSize / 2, p0[1] + distance * frs.tileSize];
                    p2 = [p0[0] + frs.tileSize / 2, p0[1] + distance * frs.tileSize];
                    break;
                case 4:
                    p1 = [p0[0] - distance * frs.tileSize, p0[1] - frs.tileSize / 2];
                    p2 = [p0[0] - distance * frs.tileSize, p0[1] + frs.tileSize / 2];
                    break;
                default: break;
            }

            guardVisionTriangles.drawPolygon(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1]);
        });
        guardVisionTriangles.endFill();

        graphics._renderer.render(guardVisionTriangles, frs.postProcessingRenderTexture, false);

        let finalImage = PIXI.Sprite.from(frs.postProcessingRenderTexture);
        graphics._renderer.render(finalImage);

        frs.visionLines = [];
    }

    // Copied from rpg_core.js line 1871: just replaces rendering to canvas to rendering to texture, and then calls our post processing function
    Graphics.render = function(stage) {
        if (!frs.postProcessingRenderTexture) {
            // Graphic width/height never changes so we never need to destroy this: will be garbage collected
            frs.postProcessingRenderTexture = PIXI.RenderTexture.create(Graphics.width, Graphics.height);
        }

        if (this._skipCount === 0) {
            var startTime = Date.now();
            if (stage) {
                this._renderer.render(stage, frs.postProcessingRenderTexture);
                if (this._renderer.gl && this._renderer.gl.flush) {
                    this._renderer.gl.flush();
                }
            }
            frs.postProcessing(this);
            var endTime = Date.now();
            var elapsed = endTime - startTime;
            this._skipCount = Math.min(Math.floor(elapsed / 15), this._maxSkip);
            this._rendered = true;
        } else {
            this._skipCount--;
            this._rendered = false;
        }
        this.frameCount++;
    };
})();