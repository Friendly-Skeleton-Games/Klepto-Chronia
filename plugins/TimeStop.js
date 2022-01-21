/*:
 * @plugindesc Controls the spawning of time-freeze bubbles
 * 
 * @author Dani
 * 
 * @help
 * SCRIPT commands
 *  KiS.TimeStop.FreezeArea(x, y);          // Freeze area around the position provided
 *  KiS.TimeStop.UnfreezeArea([x, y]);      // Unfreeze are around the position provided. Same shape as the freeze
 *  KiS.TimeStop.FreezeSpot(x, y);          // Freeze specific position
 *  KiS.TimeStop.Spawn(x, y);               // Internal function: used in event creation to spawn internal logic for a frozen position
 *  KiS.TimeStop.Despawn([x, y]);           // Internal function: used to destroy internal logic for frozen positions
 * 
 * Javascript Variables
 *  KiS.TimeStop.affectedTiles;             // Array in format { [x0, y0], [x1, y1], ... }. List of all currently frozen tiles
 *  KiS.TimeStop.tileEventLookups;          // Array in format { [[x0, y0], EiD0], [[x1, y1], EiD1], ... }. List of all currently frozen tiles and their associated event ID's
 *  KiS.TimeStop.lastFrozenArea;            // Array in format { x, y }. Last area frozen by script command
 *  KiS.TimeStop.lastFrozenSpot;            // Array in format { x, y }. Last spot frozen by script command
 */

var KiS = KiS || {}; // Main namespace
KiS.TimeStop = {}; // Local namespace

(function() {
    KiS.TimeStop.affectedTiles = [];
    KiS.TimeStop.tileEventLookups = [];
    KiS.TimeStop.lastFrozenArea = [];
    KiS.TimeStop.lastFrozenSpot = [];

    // Pattern arbitrary, make sure it is the same pattern as defined in KiS.TimeStop.UnfreezeArea
    KiS.TimeStop.FreezeArea = function(x, y) {
        KiS.TimeStop.FreezeSpot(1, x, y);

        KiS.TimeStop.FreezeSpot(1, x + 1, y + 0);
        KiS.TimeStop.FreezeSpot(1, x - 1, y + 0);
        KiS.TimeStop.FreezeSpot(1, x + 0, y + 1);
        KiS.TimeStop.FreezeSpot(1, x + 0, y - 1);

        KiS.TimeStop.FreezeSpot(1, x + 1, y + 1);
        KiS.TimeStop.FreezeSpot(1, x - 1, y + 1);
        KiS.TimeStop.FreezeSpot(1, x + 1, y - 1);
        KiS.TimeStop.FreezeSpot(1, x - 1, y - 1);

        KiS.TimeStop.lastFrozenArea = [x, y];
    }

    // Make sure same pattern as in KiS.TimeStop.FreezeArea
    // Manipulates KiS.TimeStop.tileEventLookups and KiS.TimeStop.affectedTiles -- don't call while looping through or else you may invalidate an iterator
    KiS.TimeStop.UnfreezeArea = function(positionArray) {
        let x = positionArray[0];
        let y = positionArray[1];

        KiS.TimeStop.tileEventLookups.forEach(eventData => {
            let position = eventData[0];
            let eventID = eventData[1];

            // Really really ugly way to do this. ToDo: Change into simple loop
            if ((position[0] === x + 0 && positionArray[1] === y + 0) ||
                (position[0] === x + 1 && positionArray[1] === y + 0) ||
                (position[0] === x - 1 && positionArray[1] === y + 0) ||
                (position[0] === x + 0 && positionArray[1] === y + 1) ||
                (position[0] === x + 0 && positionArray[1] === y - 1) ||
                (position[0] === x + 1 && positionArray[1] === y + 1) ||
                (position[0] === x - 1 && positionArray[1] === y + 1) ||
                (position[0] === x + 1 && positionArray[1] === y - 1) ||
                (position[0] === x - 1 && positionArray[1] === y - 1)
            ) {
                $gameMap.unspawnEvent(eventID);
                SceneManager._scene._spriteset.unspawnEvent(eventID);
            }
        });

        KiS.TimeStop.Despawn([x + 0, y + 0]);
        KiS.TimeStop.Despawn([x + 1, y + 0]);
        KiS.TimeStop.Despawn([x - 1, y + 0]);
        KiS.TimeStop.Despawn([x + 0, y + 1]);
        KiS.TimeStop.Despawn([x + 0, y - 1]);
        KiS.TimeStop.Despawn([x + 1, y + 1]);
        KiS.TimeStop.Despawn([x - 1, y + 1]);
        KiS.TimeStop.Despawn([x + 1, y - 1]);
        KiS.TimeStop.Despawn([x - 1, y - 1]);
    }

    // Doesn't modify KiS.TimeSpot.affectedTiles. Assumption is that whatever event which freezes tiles will call it on spawn
    KiS.TimeStop.FreezeSpot = function(eventType, x, y) {
        Galv.SPAWN.event(eventType, x, y);
        KiS.TimeStop.tileEventLookups.push([[x, y], $gameMap._lastSpawnEventId]);
        KiS.TimeStop.lastFrozenSpot = [x, y];
    }

    KiS.TimeStop.Spawn = function(x, y) {
        KiS.TimeStop.affectedTiles.push([x, y]);
    }

    // Call when you want to destroy a time freeze spot. Not tied to any visuals, purely logic
    KiS.TimeStop.Despawn = function(positionArray) {
        KiS.TimeStop.affectedTiles = KiS.TimeStop.affectedTiles.filter(eventData => eventData[0] === positionArray[0] && eventData[0] === positionArray[1]);
        KiS.TimeStop.tileEventLookups = KiS.TimeStop.tileEventLookups.filter(eventData => eventData[0][0] === positionArray[0] && eventData[0][0] === positionArray[1]);
    }

    // -------------- UPDATE PROTOTYPES --------------
    let Game_CharacterBase_prototype_initMembers = Game_CharacterBase.prototype.initMembers;
    Game_CharacterBase.prototype.initMembers = function() {
        this.KiS_inTimeStop = false;
        this.KiS_isAffectedByTime = true;
        Game_CharacterBase_prototype_initMembers.call(this);
    };

    let Game_CharacterBase_prototype_update = Game_CharacterBase.prototype.update;
    Game_CharacterBase.prototype.update = function() {
        if (!this.KiS_inTimeStop) {
            Game_CharacterBase_prototype_update.call(this);
        }

        if (this.KiS_isAffectedByTime) {
            this.KiS_inTimeStop = false;
            KiS.TimeStop.affectedTiles.forEach(position => {
                let x = position[0];
                let y = position[1];

                if (this._x === x && this._y === y) {
                    this.KiS_inTimeStop = true;
                }
            });
        }
    };
})();
