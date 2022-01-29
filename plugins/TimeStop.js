/*:
 * @plugindesc Controls the spawning of time-freeze bubbles
 * 
 * @author Dani
 * 
 * @help
 * SCRIPT commands
 *  frs.TimeStop.FreezeArea(x, y);          // Freeze area around the position provided
 *  frs.TimeStop.UnfreezeArea([x, y]);      // Unfreeze are around the position provided. Same shape as the freeze
 *  frs.TimeStop.FreezeSpot(x, y);          // Freeze specific position
 *  frs.TimeStop.UnfreezeSpot([x, y]);      // Unfreeze specific position
 *  frs.TimeStop.Spawn(x, y);               // Internal function: used in event creation to spawn internal logic for a frozen position
 *  frs.TimeStop.Despawn([x, y]);           // Internal function: used to destroy internal logic for frozen positions
 * 
 * Javascript Variables
 *  frs.TimeStop.affectedTiles;             // Array in format { [x0, y0], [x1, y1], ... }. List of all currently frozen tiles
 *  frs.TimeStop.tileEventLookups;          // Array in format { [[x0, y0], EiD0], [[x1, y1], EiD1], ... }. List of all currently frozen tiles and their associated event ID's
 *  frs.TimeStop.lastFrozenArea;            // Array in format { x, y }. Last area frozen by script command
 *  frs.TimeStop.lastFrozenSpot;            // Array in format { x, y }. Last spot frozen by script command
 */

var frs = frs || {}; // Main namespace
frs.TimeStop = {}; // Local namespace

(function() {
    frs.TimeStop.affectedTiles = [];
    frs.TimeStop.tileEventLookups = [];
    frs.TimeStop.lastFrozenArea = [];
    frs.TimeStop.lastFrozenSpot = [];

    // Pattern arbitrary, make sure it is the same pattern as defined in frs.TimeStop.UnfreezeArea
    frs.TimeStop.FreezeArea = function(x, y) {
        frs.TimeStop.FreezeSpot(1, x + 0, y + 0);

        frs.TimeStop.FreezeSpot(1, x + 1, y + 0);
        frs.TimeStop.FreezeSpot(1, x - 1, y + 0);
        frs.TimeStop.FreezeSpot(1, x + 0, y + 1);
        frs.TimeStop.FreezeSpot(1, x + 0, y - 1);

        frs.TimeStop.FreezeSpot(1, x + 1, y + 1);
        frs.TimeStop.FreezeSpot(1, x - 1, y + 1);
        frs.TimeStop.FreezeSpot(1, x + 1, y - 1);
        frs.TimeStop.FreezeSpot(1, x - 1, y - 1);

        frs.TimeStop.lastFrozenArea = [x, y];
    }

    // Make sure same pattern as in frs.TimeStop.FreezeArea
    // Manipulates frs.TimeStop.tileEventLookups and frs.TimeStop.affectedTiles -- don't call while looping through or else you may invalidate an iterator
    frs.TimeStop.UnfreezeArea = function(positionArray) {
        let x = positionArray[0];
        let y = positionArray[1];

        frs.TimeStop.UnfreezeSpot([x + 0, y + 0]);

        frs.TimeStop.UnfreezeSpot([x + 1, y + 0]);
        frs.TimeStop.UnfreezeSpot([x - 1, y + 0]);
        frs.TimeStop.UnfreezeSpot([x + 0, y + 1]);
        frs.TimeStop.UnfreezeSpot([x + 0, y - 1]);

        frs.TimeStop.UnfreezeSpot([x + 1, y + 1]);
        frs.TimeStop.UnfreezeSpot([x - 1, y + 1]);
        frs.TimeStop.UnfreezeSpot([x + 1, y - 1]);
        frs.TimeStop.UnfreezeSpot([x - 1, y - 1]);
    }

    // Doesn't modify frs.TimeStop.affectedTiles. Assumption is that whatever event which freezes tiles will call it on spawn
    frs.TimeStop.FreezeSpot = function(eventType, x, y) {
        Galv.SPAWN.event(eventType, x, y);
        frs.TimeStop.tileEventLookups.push([[x, y], $gameMap._lastSpawnEventId]);
        frs.TimeStop.lastFrozenSpot = [x, y];
    }

    // Modifys frs.TimeStop.affectedTiles and frs.TimeStop.tileEventLookups
    frs.TimeStop.UnfreezeSpot = function(positionArray) {
        frs.TimeStop.tileEventLookups.forEach(eventData => {
            let position = eventData[0];
            let eventID = eventData[1];
            if (position[0] === positionArray[0] && position[1] === positionArray[1]) {
                $gameMap.unspawnEvent(eventID);
                SceneManager._scene._spriteset.unspawnEvent(eventID);
            }
        });
        frs.TimeStop.Despawn(positionArray);
    }

    frs.TimeStop.Spawn = function(x, y) {
        frs.TimeStop.affectedTiles.push([x, y]);
    }

    // Call when you want to destroy a time freeze spot. Not tied to any visuals, purely logic
    frs.TimeStop.Despawn = function(positionArray) {
        frs.TimeStop.affectedTiles = frs.TimeStop.affectedTiles.filter(position => {
            return !(position[0] === positionArray[0] && position[1] === positionArray[1])
        });
        frs.TimeStop.tileEventLookups = frs.TimeStop.tileEventLookups.filter(eventData => {
            return !(eventData[0][0] === positionArray[0] && eventData[0][1] === positionArray[1]);
        });
    }

    // -------------- UPDATE PROTOTYPES --------------
    let Game_CharacterBase_prototype_initMembers = Game_CharacterBase.prototype.initMembers;
    Game_CharacterBase.prototype.initMembers = function() {
        this.frs_inTimeStop = false;
        this.frs_isAffectedByTime = true;
        Game_CharacterBase_prototype_initMembers.call(this);
    };

    let Game_CharacterBase_prototype_update = Game_CharacterBase.prototype.update;
    Game_CharacterBase.prototype.update = function() {
        if (!this.frs_inTimeStop) {
            Game_CharacterBase_prototype_update.call(this);
        }

        if (this.frs_isAffectedByTime) {
            this.frs_inTimeStop = false;
            frs.TimeStop.affectedTiles.forEach(position => {
                let x = position[0];
                let y = position[1];

                if (this._x === x && this._y === y) {
                    this.frs_inTimeStop = true;
                }
            });
        }
    };
})();
