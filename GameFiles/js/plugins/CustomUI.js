(function() {
    function Window_Hint() {
        this.initialize.apply(this, arguments);
    }
    
    Window_Hint.prototype = Object.create(Window_Command.prototype);
    Window_Hint.prototype.constructor = Window_Hint;
    
    Window_Hint.prototype.initialize = function(x, y) {
        Window_Command.prototype.initialize.call(this, x, y);
    };

    Window_Hint.prototype.makeCommandList = function() {
        this.addCommand("Your Hint Here", 'gameHint', true);
    };

    function Scene_Hint() {
        this.initialize.apply(this, arguments);
    }
    
    Scene_Hint.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_Hint.prototype.constructor = Scene_Hint;
    
    Scene_Hint.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };
    
    Scene_Hint.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);

        this._hintWindow = new Window_Hint(0, 0);
        this._hintWindow.setHandler('gameHint', this.popScene.bind(this));

        this.addWindow(this._hintWindow);
    };

    /* ------------------------------------- */

    Window_Options.prototype.addGeneralOptions = function() {
        this.addCommand(TextManager.commandRemember, 'commandRemember');
    };

    Scene_Menu.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createCommandWindow();
    };

    Scene_Menu.prototype.start = function() {
        Scene_MenuBase.prototype.start.call(this);
    };

    Window_MenuCommand.prototype.addOriginalCommands = function() {
        //this.addCommand("Request Hint", 'hint', true);
    };

    Window_MenuCommand.prototype.makeCommandList = function() {
        this.addOriginalCommands();
        this.addOptionsCommand();
        this.addSaveCommand();
        this.addGameEndCommand();
    };

    Scene_Menu.prototype.createCommandWindow = function() {
        this._commandWindow = new Window_MenuCommand(0, 0);
        this._commandWindow.setHandler('hint',      this.hint.bind(this));
        this._commandWindow.setHandler('options',   this.commandOptions.bind(this));
        this._commandWindow.setHandler('save',      this.commandSave.bind(this));
        this._commandWindow.setHandler('gameEnd',   this.commandGameEnd.bind(this));
        this._commandWindow.setHandler('cancel',    this.popScene.bind(this));

        let centerX = Graphics.width / 2;
        let centerY = Graphics.height / 2;

        this._commandWindow.move(centerX - this._commandWindow._width / 2, centerY - this._commandWindow._height / 2, this._commandWindow._width, this._commandWindow._height);

        this.addWindow(this._commandWindow);
    };

    Scene_Menu.prototype.hint = function() {
        SceneManager.push(Scene_Hint);
    };

})();
