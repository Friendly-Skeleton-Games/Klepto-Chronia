var frs = frs || {}; // Main namespace

frs.gardenColour = 0xa30b1d;
frs.foyerColour = 0xf2ce00;
frs.labColour = 0xf2ce00;

frs.visionLines = new Map();
frs.tileSize = 48;
frs.visionConeBaseSize = 0.1;
frs.missedVisionCalls = 0;
frs.lastRenderTime = Date.now();
frs.attemptedRestartCount = 0;
frs.coneColour = frs.gardenColour;
frs.coneOpacity = 0.4;

(function() {
    frs.drawDetectionArea = function(detectorEvent, range) {
        let incrementDirection = [0, 0];
        let distanceOffest = 0;
        switch (detectorEvent._direction) {
            case 8:
                incrementDirection = [0, -1];
                distanceOffest = detectorEvent._realY - Math.floor(detectorEvent._realY);
                break;
            case 6:
                incrementDirection = [1, 0];
                distanceOffest = Math.ceil(detectorEvent._realX) - detectorEvent._realX;
                break;
            case 2:
                incrementDirection = [0, 1];
                distanceOffest = Math.ceil(detectorEvent._realY) - detectorEvent._realY;
                break;
            case 4:
                incrementDirection = [-1, 0];
                distanceOffest = detectorEvent._realX - Math.floor(detectorEvent._realX);
                break;
            default:
                break;
        };
    
        let hitEvent = null;
        let currentTile = [detectorEvent._x, detectorEvent._y];
        let distance = 0;
        for (distance = 0; distance < range; distance++) {
            currentTile[0] += incrementDirection[0];
            currentTile[1] += incrementDirection[1];

            if (Galv.DETECT.isBlock(currentTile[0], currentTile[1])) {
                $gameMap.eventsXy(currentTile[0], currentTile[1]).forEach(function(event) {
                    if (event instanceof Game_CharacterBase) {
                        hitEvent = event;
                    }
                });
                break;
            }
        }

        if (hitEvent) {
            let movingOffset = 0;
            switch (hitEvent._direction) {
                case 8:
                    movingOffset = hitEvent._realY - Math.floor(hitEvent._realY);
                    break;
                case 6:
                    movingOffset = Math.ceil(hitEvent._realX) - hitEvent._realX;
                    break;
                case 2:
                    movingOffset = Math.ceil(hitEvent._realY) - hitEvent._realY;
                    break;
                case 4:
                    movingOffset = hitEvent._realX - Math.floor(hitEvent._realX);
                    break;
                default:
                    break;
            };

            if (
                    (hitEvent._direction === 8 && detectorEvent._direction === 8) || (hitEvent._direction === 2 && detectorEvent._direction === 2) ||
                    (hitEvent._direction === 4 && detectorEvent._direction === 4) || (hitEvent._direction === 6 && detectorEvent._direction === 6)
                ) {
                // in same direction
                distanceOffest -= movingOffset;
            } else if (
                (hitEvent._direction === 8 && detectorEvent._direction === 2) || (hitEvent._direction === 2 && detectorEvent._direction === 8) ||
                (hitEvent._direction === 4 && detectorEvent._direction === 6) || (hitEvent._direction === 6 && detectorEvent._direction === 4)
                ) {
                // in opposite direction
                distanceOffest += movingOffset;
            }
        }

        let origin = [
            (incrementDirection[0] * 0.5 + detectorEvent._realX) * frs.tileSize + frs.tileSize / 2,
            (incrementDirection[1] * 0.5 + detectorEvent._realY) * frs.tileSize + frs.tileSize / 2
        ];

        frs.visionLines.set(detectorEvent._eventId, [origin, detectorEvent._direction, distance + distanceOffest]);
        frs.missedVisionCalls = 0;
    };

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

        guardVisionTriangles.beginFill(frs.coneColour, frs.coneOpacity);
        frs.visionLines.forEach(lineData => {
            let origin = lineData[0];
            let direction = lineData[1];
            let distance = lineData[2];

            let p0 = [];
            let p1 = [];
            let p2 = [];
            let p3 = [];

            switch (direction) {
                case 8:
                    p0 = [origin[0] + frs.visionConeBaseSize * frs.tileSize, origin[1]];
                    p1 = [origin[0] - frs.visionConeBaseSize * frs.tileSize, origin[1]];
                    p2 = [origin[0] - 0.5 * frs.tileSize, origin[1] - distance * frs.tileSize];
                    p3 = [origin[0] + 0.5 * frs.tileSize, origin[1] - distance * frs.tileSize];
                    break;
                case 6:
                    p0 = [origin[0], origin[1] + frs.visionConeBaseSize * frs.tileSize];
                    p1 = [origin[0], origin[1] - frs.visionConeBaseSize * frs.tileSize];
                    p2 = [origin[0] + distance * frs.tileSize, origin[1] - 0.5 * frs.tileSize];
                    p3 = [origin[0] + distance * frs.tileSize, origin[1] + 0.5 * frs.tileSize];
                    break;
                case 2:
                    p0 = [origin[0] + frs.visionConeBaseSize * frs.tileSize, origin[1]];
                    p1 = [origin[0] - frs.visionConeBaseSize * frs.tileSize, origin[1]];
                    p2 = [origin[0] - 0.5 * frs.tileSize, origin[1] + distance * frs.tileSize];
                    p3 = [origin[0] + 0.5 * frs.tileSize, origin[1] + distance * frs.tileSize];
                    break;
                case 4:
                    p0 = [origin[0], origin[1] + frs.visionConeBaseSize * frs.tileSize];
                    p1 = [origin[0], origin[1] - frs.visionConeBaseSize * frs.tileSize];
                    p2 = [origin[0] - distance * frs.tileSize, origin[1] - 0.5 * frs.tileSize];
                    p3 = [origin[0] - distance * frs.tileSize, origin[1] + 0.5 * frs.tileSize];
                    break;
                default: break;
            }

            guardVisionTriangles.drawPolygon(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
        });
        guardVisionTriangles.endFill();

        graphics._renderer.render(guardVisionTriangles, frs.postProcessingRenderTexture, false);

        let finalImage = PIXI.Sprite.from(frs.postProcessingRenderTexture);
        graphics._renderer.render(finalImage);

        if (frs.missedVisionCalls++ === 5) {
            frs.visionLines = new Map();
        }

        frs.lastRenderTime = Date.now();
        frs.attemptedRestartCount = 0;
    }

    // Copied from rpg_core.js line 1871: just replaces rendering to canvas to rendering to texture, and then calls our post processing function
    Graphics.render = function(stage) {
        if ((Date.now() - frs.lastRenderTime) / 1000 >= 0.5) {
            // the rendering has ceased. Attempt to restart the renderer
            if (frs.postProcessingRenderTexture) {
                frs.postProcessingRenderTexture.destroy();
            }
            frs.postProcessingRenderTexture = PIXI.RenderTexture.create(Graphics.width, Graphics.height);
            this._skipCount = 0;
            frs.missedVisionCalls = 0;
            frs.visionLines = new Map();
            frs.attemptedRestartCount = frs.attemptedRestartCount + 1;
            console.log("Attempting to restart renderer (" + frs.attemptedRestartCount + " attempts)");
        }

        if (!frs.postProcessingRenderTexture) {
            // Graphic width/height never changes so we never need to destroy this: will be garbage collected
            frs.postProcessingRenderTexture = PIXI.RenderTexture.create(Graphics.width, Graphics.height);
        }

        if (this._skipCount === 0) {
            var startTime = Date.now();
            if (stage) {
                // If we attempted to restart the renderer 10 frames in a row and we still dont have results, fallback to old rendering
                if (frs.attemptedRestartCount >= 10) {
                    this._renderer.render(stage);
                }
                // Still render to render-texture just in case we somehow recover. Double rendering but not too slow
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