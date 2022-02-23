var frs = frs || {}; // Main namespace
frs.XHRAudioCache = new Map(); // Local namespace
frs.XHRDataCache = new Map();

(function() {
    // Run through all of our files and cache the ones we want cached
    frs.cacheRelevantFiles = function() {
        DataManager.loadDataFile("$dataMap", "Map003.json", true);
    }

    frs.onAudioDecode = function(buffer) {
        this._buffer = buffer;
        this._totalTime = buffer.duration;
        if (this._loopLength > 0 && this._sampleRate > 0) {
            this._loopStart /= this._sampleRate;
            this._loopLength /= this._sampleRate;
        } else {
            this._loopStart = 0;
            this._loopLength = this._totalTime;
        }
        this._onLoad();
    }

    /*
        I ripped the definitions of these functions from the engine
        overwrote their definitions and just inserted the ability to
        cache the relevant audio/json files
    */

    // Ripped from rpg_core.js line 8163
    WebAudio.prototype._load = function(url) {
        if (frs.XHRAudioCache.has(url)) {
            (frs.onAudioDecode.bind(this))(frs.XHRAudioCache.get(url));
        } else {
            if (WebAudio._context) {
                var xhr = new XMLHttpRequest();
                if(Decrypter.hasEncryptedAudio) url = Decrypter.extToEncryptExt(url);
                xhr.open('GET', url);
                xhr.responseType = 'arraybuffer';
                xhr.onload = function() {
                    if (xhr.status < 400) {
                        this._onXhrLoad(xhr, url);
                    }
                }.bind(this);
                xhr.onerror = this._loader || function(){this._hasError = true;}.bind(this);
                xhr.send();
            }
        }
    }

    // Ripped from rpg_core.js line 8184
    WebAudio.prototype._onXhrLoad = function(xhr, url) {
        var array = xhr.response;
        if(Decrypter.hasEncryptedAudio) array = Decrypter.decryptArrayBuffer(array);
        this._readLoopComments(new Uint8Array(array));
        WebAudio._context.decodeAudioData(array, function(buffer) {
            frs.XHRAudioCache.set(url, buffer);
            (frs.onAudioDecode.bind(this))(buffer);
        }.bind(this));
    }

    // Ripped from rpg_managers.js line 78
    DataManager.loadDataFile = function(name, src, justLoadAndCache = false) {
        console.log(name, src);
        if (frs.XHRDataCache.has(src)) {
            window[name] = frs.XHRDataCache.get(src);
            DataManager.onLoad(window[name]);
        } else {
            var xhr = new XMLHttpRequest();
            var url = 'data/' + src;
            xhr.open('GET', url);
            xhr.overrideMimeType('application/json');
            xhr.onload = function() {
                if (xhr.status < 400) {
                    let result = JSON.parse(xhr.responseText);
                    frs.XHRDataCache.set(src, result);

                    if (!justLoadAndCache) {
                        window[name] = result
                        DataManager.onLoad(window[name]);
                    }
                }
            };
            xhr.onerror = this._mapLoader || function() {
                DataManager._errorUrl = DataManager._errorUrl || url;
            };

            if (!justLoadAndCache) {
                window[name] = null;
            }
            xhr.send();
        }
    };
})();