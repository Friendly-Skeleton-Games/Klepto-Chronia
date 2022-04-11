//=============================================================================
// Variable Mix Manager
// Jay_VariableMix.js
// Version 1.0.2
//=============================================================================

var Imported = Imported || {};
Imported.Jay_VariableMix = true;

var Jay = Jay || {};
Jay.VariableMix = Jay.VariableMix || {};

//=============================================================================
 /*:
 * @plugindesc Allows for variable mixes to be played.
 *
 * @author Jason R. Godding
 *
 * @help To keep playing the music from the same position as the current
 * track, call the plugin command some time BEFORE you need it:
 *
 * LoadVariableMixBGM nameOfTrack [ratio] [volume] [pan]
 *
 * "ratio" should be the ratio between the tempo of the two tracks. The ratio
 * should be current track to the replacement track. Fractions are allowed!
 * So if the current track is half the speed of the replacement, set this
 * to 1/2 or 0.5. If the replacement is half as fast, go with 2. If they
 * are the same speed, either put 1, or just don't put any extra parameters at 
 * all (if you don't need to define volume or pan.)
 *
 * If volume and pan are not defined, they'll use the same values as the
 * track that is currently playing. For technical reasons, pitch is not used; you
 * should always use Pitch 100 when using variable mixes.
 *
 * And then, later, to actually play the track, call
 *
 * PlayVariableMixBGM
 *
 * You should call LoadVariableMixBGM in advance, so the replacement track has
 * some time to load.
 *
 * ====================================
 *
 * Version 1.0.2 - Small robustness fix most people won't even notice.
 *
 * Version 1.0.1 - Fixed a game-crashing bug if you saved after loading a variable
 * track, but before playing it.
 *
 * Version 1.0 - First version.
 *
 * This plugin is free for non-commercial and commercial use, but please credit 
 * Jason R. Godding if you use it. Thank you.
 *
 */

Jay.VariableMix.pluginCommand = Game_Interpreter.prototype.pluginCommand;
Game_Interpreter.prototype.pluginCommand = function(command, args) {
	if (command === 'LoadVariableMixBGM') {
		this.loadVariableMixBGM(args);
	}
	if (command === 'PlayVariableMixBGM') {
		AudioManager.playVariableBgm();
	}
	Jay.VariableMix.pluginCommand.call(this, command, args);
}

Game_Interpreter.prototype.loadVariableMixBGM = function(args) {
	var oldBgm = AudioManager._currentBgm;
	var bgm = {
		name: args[0],
		volume: Number(args[2]) || oldBgm.volume,
		pitch: oldBgm.pitch,
		pan: Number(args[3]) || oldBgm.pan,
		tempoRatio: args[1] || 1.0
	}
	AudioManager.loadVariableBgm(bgm);
}

AudioManager.loadVariableBgm = function(bgm) {
	this._variableBuffer = this.createBuffer('bgm', bgm.name);
	$gameParty._saveVariableBgm = bgm;
	this._variableTrack = bgm;
}

AudioManager.playVariableBgm = function() {
	var bgm = this._variableTrack;
	if(!this._variableBuffer) {
		return;
	}
	var bgmPos = AudioManager.saveBgm();
	this._bgmBuffer.fadeOut(0.2);
	if(this._spareBuffer) {
		this._spareBuffer.stop();
	}
	this._spareBuffer = this._bgmBuffer;
	var currentPos = bgmPos.pos * eval(bgm.tempoRatio);
	var loops = Math.floor((currentPos - this._variableBuffer._loopStart) / this._variableBuffer._loopLength);
	if(this._variableBuffer._loopStart + this._variableBuffer._loopLength < currentPos) {
		currentPos -= this._variableBuffer._loopLength * loops;
	}
	if (!this._meBuffer) {
		this._variableBuffer.play(true, currentPos);
	}
	this._bgmBuffer = this._variableBuffer;
	this._variableBuffer = null;
	this.updateBgmParameters(bgm);
	this._bgmBuffer.fadeIn(0.2);
	this.updateCurrentBgm(bgm, currentPos);
}

Jay.VariableMix.load = DataManager.loadGame;
DataManager.loadGame = function(savefileId) {
	var returnValue = Jay.VariableMix.load.call(this, savefileId);
	if($gameParty._saveVariableBgm) {
		AudioManager.loadVariableBgm($gameParty._saveVariableBgm);
	}
	return returnValue;
}