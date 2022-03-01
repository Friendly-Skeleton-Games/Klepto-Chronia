/*:
 * @plugindesc Controls the spawning of time-freeze bubbles
 * 
 * @author Dani
 * 
 * @help
 * SCRIPT commands
 *  frs.TimeStop.isFrozen(eventID);         // Returns whether or not this event is in a time freeze zone
 *  frs.TimeStop.FreezeArea(x, y);          // Freeze area around the position provided
 *  frs.TimeStop.UnfreezeArea([x, y]);      // Unfreeze are around the position provided. Same shape as the freeze
 *  frs.TimeStop.FreezeSpot(x, y);          // Freeze specific position
 *  frs.TimeStop.UnfreezeSpot([x, y]);      // Unfreeze specific position
 *  frs.TimeStop.Spawn(x, y);               // Internal function: used in event creation to spawn internal logic for a frozen position
 *  frs.TimeStop.Despawn([x, y]);           // Internal function: used to destroy internal logic for frozen positions
 * 
 * Javascript Variables
 *  frs.TimeStop.affectedTiles;             // Array in format { [x0, y0], [x1, y1], ... }. List of all currently frozen tiles
 *  frs.TimeStop.lastFrozenArea;            // Array in format { x, y }. Last area frozen by script command
 *  frs.TimeStop.lastFrozenSpot;            // Array in format { x, y }. Last spot frozen by script command
 */

var frs = frs || {}; // Main namespace
frs.TimeStop = {}; // Local namespace

(function() {
    frs.TimeStop.timeFreezeVariable = 3;
    frs.TimeStop.timeCrystalVariable = 4;
    frs.TimeStop.timeStopCommonEvent = 3;

    // In format [xOffset, yOffset, eventID]
    frs.TimeStop.timeStopVisualEvents = [
        [0, 2, 8],
    ];

    frs.TimeStop.affectedTiles = [];
    frs.TimeStop.visualTiles = new Map();
    frs.TimeStop.lastFrozenArea = [];
    frs.TimeStop.lastFrozenSpot = [];

    // index is the count of time crystals from 0-2
    frs.TimeStop.patterns = [
        [],
        [
            [ 0,  0],

            [ 1,  0],
            [-1,  0],
            [ 0,  1],
            [ 0, -1],

            [ 1,  1],
            [-1,  1],
            [ 1, -1],
            [-1, -1],

            [ 2,  0],
            [-2,  0],
            [ 0,  2],
            [ 0, -2]
        ],
        [
            [ 0,  0],

            [ 1,  0],
            [-1,  0],
            [ 0,  1],
            [ 0, -1],

            [ 1,  1],
            [-1,  1],
            [ 1, -1],
            [-1, -1],

            [-2, -1],
            [-2,  0],
            [-2,  1],

            [ 2, -1],
            [ 2,  0],
            [ 2,  1],

            [-1,  2],
            [ 0,  2],
            [ 1,  2],

            [-1, -2],
            [ 0, -2],
            [ 1, -2],
        ],
        [
            [ 0,  0],

            [ 1,  0],
            [-1,  0],
            [ 0,  1],
            [ 0, -1],

            [ 1,  1],
            [-1,  1],
            [ 1, -1],
            [-1, -1]
        ]
    ];

    // Map R2 -> R so we can use it in a hashmap
    frs.TimeStop.cantorPairing = function(x, y) {
        // convert fron Z -> N
        let xLessThanZero = x < 0;
        let yLessThanZero = y < 0;

        // 2n if n > 0, otherwise 2n + 1 if n < 0. aka all negatives to odds, all positives to evens
        let xNatural = 2 * x * (1 - xLessThanZero) + (-2 * x - 1) * xLessThanZero;
        let yNatural = 2 * y * (1 - yLessThanZero) + (-2 * y - 1) * yLessThanZero;

        // Use the cantor pairing function to map natural pairs of numbers to a single natural
        let cantor = 0.5 * (xNatural + yNatural) * (xNatural + yNatural + 1) + yNatural;

        return cantor;
    }

    frs.TimeStop.isFrozen = function(eventID) {
        let event = $gameMap.event(eventID);
        if (event instanceof Game_CharacterBase) {
            return event.frs_inTimeStop;
        }
        return false;
    }

    // Pattern arbitrary, make sure it is the same pattern as defined in frs.TimeStop.UnfreezeArea
    frs.TimeStop.FreezeArea = function(x, y) {
        x = Math.round(x); y = Math.round(y);
        frs.TimeStop.patterns[$gameVariables.value(frs.TimeStop.timeCrystalVariable)].forEach(offset => {
            frs.TimeStop.FreezeSpot(x + offset[0], y + offset[1]);
        });
        
        frs.TimeStop.SpawnVisualBubble(x, y);
        frs.TimeStop.lastFrozenArea = [x, y];
    }

    frs.TimeStop.FreezeAreaSquare = function(x, y) {
        x = Math.round(x); y = Math.round(y);
        frs.TimeStop.patterns[$gameVariables.value(3)].forEach(offset => {
            frs.TimeStop.FreezeSpot(x + offset[0], y + offset[1]);
        });
    }

    frs.TimeStop.UnfreezeAreaSquare = function(positionArray) {
        let x = positionArray[0];
        let y = positionArray[1];

        frs.TimeStop.patterns[$gameVariables.value(3)].forEach(offset => {
            frs.TimeStop.UnfreezeSpot([x + offset[0], y + offset[1]]);
        });
    }

    // Make sure same pattern as in frs.TimeStop.FreezeArea
    // Manipulates frs.TimeStop.affectedTiles -- don't call while looping through or else you may invalidate an iterator
    frs.TimeStop.UnfreezeArea = function(positionArray) {
        let x = positionArray[0];
        let y = positionArray[1];

        frs.TimeStop.patterns[$gameVariables.value(frs.TimeStop.timeCrystalVariable)].forEach(offset => {
            frs.TimeStop.UnfreezeSpot([x + offset[0], y + offset[1]]);
        });

        frs.TimeStop.DespawnVisualBubble(x, y);
    }

    frs.TimeStop.SpawnVisualBubble = function(x, y) {
        let associatedEvents = [];
        frs.TimeStop.timeStopVisualEvents.forEach(visualSpot => {
            let xOffset = visualSpot[0];
            let yOffset = visualSpot[1];
            let eventID = visualSpot[2];

            Galv.SPAWN.event(eventID, x + xOffset, y + yOffset);
            associatedEvents.push($gameMap._lastSpawnEventId);
        });
        frs.TimeStop.visualTiles.set(frs.TimeStop.cantorPairing(x, y), associatedEvents);
    };

    frs.TimeStop.DespawnVisualBubble = function(x, y) {
        let associatedEvents = frs.TimeStop.visualTiles.get(frs.TimeStop.cantorPairing(x, y));
        associatedEvents.forEach(eventID => {
            $gameMap.unspawnEvent(eventID);
            SceneManager._scene._spriteset.unspawnEvent(eventID);
        });
    };

    // Doesn't modify frs.TimeStop.affectedTiles. Assumption is that whatever event which freezes tiles will call it on spawn
    frs.TimeStop.FreezeSpot = function(x, y) {
        frs.TimeStop.Spawn(x, y);
        frs.TimeStop.lastFrozenSpot = [x, y];
    }

    // Modifys frs.TimeStop.affectedTiles
    frs.TimeStop.UnfreezeSpot = function(positionArray) {
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
    }
    
    frs.TimeStop.playerHandleTimestopEnter = function(player) {
        
    }

    frs.TimeStop.playerHandleTimestopLeave = function(player) {
        if ($gameVariables.value(frs.TimeStop.timeCrystalVariable) === 1 && $gameVariables.value(frs.TimeStop.timeFreezeVariable) === 1) {
            $gameSwitches.setValue(50,true);
            $gameMap._interpreter.setup($dataCommonEvents[frs.TimeStop.timeStopCommonEvent].list, frs.TimeStop.timeStopCommonEvent);
        }
    }

    frs.TimeStop.handleTimestopEnter = function(object) {
        if (object === $gamePlayer) {
            frs.TimeStop.playerHandleTimestopEnter(object);
        }

        if (object instanceof Game_Event && !(object instanceof Game_SpawnEvent)) { // only worry about game_events, not GALV spawn events
            let objectEvent = $dataMap.events[object._eventId];
            // Although this is duplicated code, kept explicit cases in event that we need to expand logic for one.
            if (objectEvent.meta.frs_isGuard) {
                $gameSelfSwitches.setValue([$gameMap.mapId(), object._eventId, objectEvent.meta.frs_isGuard], true);
            }
            if (objectEvent.meta.frs_isButton) {
                let buttonMetaInfo = objectEvent.meta.frs_isButton.split(',');

                let selfSwitchOn = buttonMetaInfo[0];
                let selfSwitchOff = buttonMetaInfo[1];
                let onConditionSelfSwitch = buttonMetaInfo[2];

                let isOff = $gameSelfSwitches.value([$gameMap.mapId(), object._eventId, onConditionSelfSwitch]);

                let selfSwitch = selfSwitchOn;
                if (isOff) {
                    selfSwitch = selfSwitchOff;
                }

                object.frs_freezeState.isOffOnFreeze = isOff;

                $gameSelfSwitches.setValue([$gameMap.mapId(), object._eventId, selfSwitch], true);
            }
            if (objectEvent.meta.frs_isDoor) {
                // RPG maker tags are strings, so we split the tag into an array and parse the array
                let doorMetaInfo = objectEvent.meta.frs_isDoor.split(',');

                let selfSwitchOpen = doorMetaInfo[0];
                let selfSwitchClosed = doorMetaInfo[1];
                let openConditionSwitch = parseInt(doorMetaInfo[2]);

                let isOpen = $gameSwitches._data[openConditionSwitch];

                let selfSwitch = selfSwitchOpen;
                if (!isOpen) {
                    selfSwitch = selfSwitchClosed;
                }

                // Remember the state on frozen so we can toggle the correct state on timestop leave
                object.frs_freezeState.isOpenOnFreeze = isOpen;

                $gameSelfSwitches.setValue([$gameMap.mapId(), object._eventId, selfSwitch], true);
            }
        }
    }

    frs.TimeStop.handleTimestopLeave = function(object) {
        if (object === $gamePlayer) {
            frs.TimeStop.playerHandleTimestopLeave(object);
        }

        if (object instanceof Game_Event && !(object instanceof Game_SpawnEvent)) { // only worry about game_events, not GALV spawn events
            let objectEvent = $dataMap.events[object._eventId];
            // Although this is duplicated code, kept explicit cases in event that we need to expand logic for one.
            if (objectEvent.meta.frs_isGuard) {
                $gameSelfSwitches.setValue([$gameMap.mapId(), object._eventId, objectEvent.meta.frs_isGuard], false);
            }
            if (objectEvent.meta.frs_isButton) {
                let buttonMetaInfo = objectEvent.meta.frs_isButton.split(',');

                let selfSwitchOn = buttonMetaInfo[0];
                let selfSwitchOff = buttonMetaInfo[1];

                let isOff = object.frs_freezeState.isOffOnFreeze;

                let selfSwitch = selfSwitchOn;
                if (isOff) {
                    selfSwitch = selfSwitchOff;
                }

                $gameSelfSwitches.setValue([$gameMap.mapId(), object._eventId, selfSwitch], false);
            }
            if (objectEvent.meta.frs_isDoor) {
                // RPG maker tags are strings, so we split the tag into an array and parse the array
                let doorMetaInfo = objectEvent.meta.frs_isDoor.split(',');

                let selfSwitchOpen = doorMetaInfo[0];
                let selfSwitchClosed = doorMetaInfo[1];

                let isOpen = object.frs_freezeState.isOpenOnFreeze;
                let selfSwitch = selfSwitchOpen;
                if (!isOpen) {
                    selfSwitch = selfSwitchClosed;
                }

                $gameSelfSwitches.setValue([$gameMap.mapId(), object._eventId, selfSwitch], false);
            }
        }
    }

    // -------------- UPDATE PROTOTYPES --------------
    let Game_CharacterBase_prototype_initMembers = Game_CharacterBase.prototype.initMembers;
    Game_CharacterBase.prototype.initMembers = function() {
        try {
            this.frs_inTimeStop = false;
            this.frs_isAffectedByTime = true;
            this.frs_freezeState = {}; // object for any meta info we need for this event during/post timestop
            Game_CharacterBase_prototype_initMembers.call(this); 
        } catch (error) { }
    };

    let Game_CharacterBase_prototype_update = Game_CharacterBase.prototype.update;
    Game_CharacterBase.prototype.update = function() {
        let inTimeStopBefore = this.frs_inTimeStop;
        if (!this.frs_isAffectedByTime || !this.frs_inTimeStop || (this.frs_inTimeStop && this.isMoving())) {
            Game_CharacterBase_prototype_update.call(this);
        }

        this.frs_inTimeStop = false;
        frs.TimeStop.affectedTiles.forEach(position => {
            let x = position[0];
            let y = position[1];

            if (Math.round(this._x) === x && Math.round(this._y) === y) {
                this.frs_inTimeStop = true;
            }
        });

        if (this.frs_inTimeStop && !inTimeStopBefore) {
            frs.TimeStop.handleTimestopEnter(this);
        } else if (!this.frs_inTimeStop && inTimeStopBefore) {
            frs.TimeStop.handleTimestopLeave(this);
        }
    };
})();
