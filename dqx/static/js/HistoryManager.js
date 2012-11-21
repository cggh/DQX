define(["jquery"], 
    function ($) {
    var HistoryManager = {
    
        stateKeys: null,
        globalLoadState: null, //needs to be attached by the consumer page
    
        updateState: function () {
            if (this.globalLoadState == null)
                throw 'globalLoadState is not defined';
            this.globalLoadState(this.stateKeys);
        },
    
    
        setState: function (stateKeys) {
            this.stateKeys = stateKeys;
            var str = '';
            for (key in stateKeys) {
                if (str.length > 0) str += '&';
                str += key;
                if (stateKeys[key] != null)
                    str += '=' + stateKeys[key];
            }
            this.updateState();
            window.location.hash = str;
        },
    
        onChanged: function () {
            var newstateKeys = {};
            var tokens = window.location.hash.substring(1).split('&');
            for (var tokennr = 0; tokennr < tokens.length; tokennr++) {
                var tokenpair = tokens[tokennr].split('=');
                newstateKeys[tokenpair[0]] = tokenpair[1];
            }
    
            var issame = true;
            if (this.dstateKeys == null)
                issame = false;
            else {
                for (var k in newstateKeys)
                    if ((!(k in this.stateKeys)) || (newstateKeys[k] != this.stateKeys[k]))
                        issame = false;
                for (var k in this.stateKeys)
                    if ((!(k in newstateKeys)) || (this.stateKeys[k] != newstateKeys[k]))
                        issame = false;
            }
    
            if (!issame) {
                this.stateKeys = newstateKeys;
                this.updateState();
            }
        }
    
    }
    window.onhashchange = $.proxy(HistoryManager.onChanged, HistoryManager);
    return HistoryManager;
    });
