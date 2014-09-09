// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/


define(["require", "jquery", "DQX/Msg", "DQX/DocEl", "handlebars"],
    function (require, $, Msg, DocEl, Handlebars) {
        //Inject DQX into the global namespace so that click handlers can find it
        DQX = {};

        // A class helping the scheduling of functions that execute asynchronously
        DQX.Scheduler = function() {
            var that = {};

            that.scheduledFunctions = [];
            that.completedTokens = {}

            // Add a sceduled function. The execution will only start if all required tokens are marked as completed
            that.add = function(requiredTokens, func) {
                that.scheduledFunctions.push({
                    requiredList: requiredTokens,
                    func: func
                });
            };

            // Call this function to mark a token as being completed
            that.setCompleted = function(token) {
                that.completedTokens[token] = true;
            };

            // Call this function to set a notification function that will be called when all actions are completed
            that.setOnFullyCompleted = function(handler) {
                that._onFullyCompleted = handler;
            }

            that._tryNext = function() {
                var nextAction = null;
                var completed = true;
                $.each(that.scheduledFunctions, function(idx, item) {
                    if (!item.started) {
                        completed = false;
                        var canExecute = true;
                        $.each(item.requiredList, function(idx2, requiredToken) {
                            if (!that.completedTokens[requiredToken])
                                canExecute = false;
                        });
                        if (canExecute)
                            nextAction = item;
                    }
                });

                if (nextAction) {
                    nextAction.started = true;
                    nextAction.func();
                }
                if (!completed)
                    setTimeout(that._tryNext, 50);
                else
                    if (that._onFullyCompleted)
                        that._onFullyCompleted();
            };

            // Start the execution of the scheduled functions
            that.execute = function() {
                that._tryNext();
            }

            return that;
        }



DQX.getRGB = function(r, g, b, alpha) {
		if (r != null && b == null) {
			alpha = g;
			b = r&0xFF;
			g = r>>8&0xFF;
			r = r>>16&0xFF;
		}
        r = Math.round(r);
        g = Math.round(g);
        b = Math.round(b);
		if (alpha == null) {
			return "rgb("+r+","+g+","+b+")";
		} else {
			return "rgba("+r+","+g+","+b+","+alpha+")";
		}
	};

DQX.roundedRect = function(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

DQX.polyStar = function(ctx, x, y, radius, sides, pointSize, angle) {
        ctx.beginPath();
		if (pointSize == null) { pointSize = 0; }
		pointSize = 1-pointSize;
		if (angle == null) { angle = 0; }
		else { angle /= 180/Math.PI; }
		var a = Math.PI/sides;
		
		ctx.moveTo(x+Math.cos(angle)*radius, y+Math.sin(angle)*radius);
		for (var i=0; i<sides; i++) {
			angle += a;
			if (pointSize != 1) {
				ctx.lineTo(x+Math.cos(angle)*radius*pointSize, y+Math.sin(angle)*radius*pointSize);
			}
			angle += a;
			ctx.lineTo(x+Math.cos(angle)*radius, y+Math.sin(angle)*radius);
		}
	    ctx.closePath();
	};


        // Returns a function that wraps around the argument function fn, making sure it is called not more often than delay specifies
        DQX.debounce = function(fn, delay) {
            var timer = null;
            return function () {
                var context = this, args = arguments;
                clearTimeout(timer);
                timer = setTimeout(function () {
                    fn.apply(context, args);
                }, delay);
            };
        };

        DQX.BMP = function (name) {
            return require.toUrl('./Bitmaps/'+name);
        };

        DQX._globalUniqueID = 0;

        DQX.getNextUniqueID = function () {
            DQX._globalUniqueID++;
            return 'UID' + DQX._globalUniqueID;
        }

        DQX.reportError = function (txt) {
            alert("ERROR: " + DQX.interpolate(txt));
            if (_debug_)
                debugger;
            throw txt;
        }


        //Sort helpers
        DQX.ByProperty = function (prop) {
            return function (a, b) {
                if (typeof a[prop] == "number") {
                    return (a[prop] - b[prop]);
                } else {
                    return ((a[prop] < b[prop]) ? -1 : ((a[prop] > b[prop]) ? 1 : 0));
                }
            };
        };
        DQX.ByPropertyReverse = function (prop) {
            return function (b, a) {
                if (typeof a[prop] == "number") {
                    return (a[prop] - b[prop]);
                } else {
                    return ((a[prop] < b[prop]) ? -1 : ((a[prop] > b[prop]) ? 1 : 0));
                }
            };
        };

        //Returns a html string that highlights every occurrence of a specific string in a flat text
        DQX.highlightText = function (data, search) {
            function preg_quote(str) { return (str + '').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1"); }
            return data.replace(new RegExp("(" + preg_quote(search) + ")", 'gi'), '<span class="DQXHighlight">$1</span>');
        }

        DQX.pluralise = function (str, number) {
            if (number != 1) {
                return str + 's';
            }
            return str;
        }



        DQX.truncateString = function (fullStr, strLen, separator) {
            if (fullStr.length <= strLen) return fullStr;

            separator = separator || '...';

            var sepLen = separator.length,
                charsToShow = strLen - sepLen,
                frontChars = Math.ceil(charsToShow/2),
                backChars = Math.floor(charsToShow/2);

            return fullStr.substr(0, frontChars) +
                separator +
                fullStr.substr(fullStr.length - backChars);
        };

        DQX.isStandaloneApp = function () {
            if ('navigator' in window)
                if ('standalone' in window.navigator)
                    return window.navigator.standalone;
            return false;
        }


        DQX.getUrlSearchString = function(token) {
            var tokens = window.location.search.substring(1).split('&');
            for (var tokennr = 0; tokennr < tokens.length; tokennr++) {
                if (tokens[tokennr]) {
                    var tokenpair = tokens[tokennr].split('=');
                    if (tokenpair[0]==token) return tokenpair[1];
                }
            }
            return null;
        }


        DQX.serverDataStore = function(serverUrl, content, callback) {
            $.ajax({
                url: serverUrl+'?datatype=storedata',
                type: "post",
                data: content,
                success: function (resp) {
                    var keylist = DQX.parseResponse(resp);
                    if ("Error" in keylist) {
                        DQX.reportError('Failed to store server data: '+keylist.Error);
                        return;
                    }
                    var id=keylist.id;
                    if (callback) callback(id);
                },
                error: function (resp) {
                    DQX.reportError('Failed to store server data');
                }
            });
        }


        DQX.serverDataStoreLong = function(serverUrl, content, callback) {
            $.ajax({
                url: serverUrl+'?datatype=storedatalong',
                type: "post",
                data: content,
                success: function (resp) {
                    var keylist = DQX.parseResponse(resp);
                    if ("Error" in keylist) {
                        DQX.reportError('Failed to store server data: '+keylist.Error);
                        return;
                    }
                    var id=keylist.id;
                    if (callback) callback(id);
                },
                error: function (resp) {
                    DQX.reportError('Failed to store server data');
                }
            });
        }


        DQX.serverDataFetch = function(serverUrl, id, callback) {
            $.ajax({
                url: serverUrl+'?datatype=fetchstoredata&id='+id,
                success: function (resp) {
                    var keylist = DQX.parseResponse(resp);
                    if ("Error" in keylist) {
                        DQX.reportError('Failed to fetch server data: '+keylist.Error);
                        return;
                    }
                    var content=keylist.content;
                    if (callback) callback(content);
                },
                error: function (resp) {
                    DQX.reportError('Failed to fetch server data');
                }
            });
        }


        DQX.customRequest = function(serverUrl,respmodule,respid,data,callback) {
            var theUrl = serverUrl+'?datatype=custom&respmodule='+respmodule+'&respid='+respid;
            $.each(data,function(id,val) {
                theUrl += '&'+id+'='+val;
            });
            $.ajax({
                url: theUrl,
                success: function (resp) {
                    var keylist = DQX.parseResponse(resp);
                    if (typeof(keylist) !== 'object') {
                        if (resp.indexOf('Authentication')>0)
                            DQX.reportError('Client is not authenticated');
                        DQX.reportError('Invalid server response type');
                    }
                    if ('Error' in keylist) {
                        if (keylist.Error=='NotAuthenticated') {
                            if (confirm('The application is currently not authenticated.\nDo you want to reload now?')) {
                                location.reload();
                                return;
                            }
                                alert('Application has been stopped');
                        }
                        else
                            alert('Error: '+keylist.Error);
                    }
                    if (callback) callback(keylist);
                },
                error: function (resp) {
                    DQX.reportError('Failed to launch request {module} {id}:\n{rsp}'.DQXformat( { module:respmodule, id:respid, rsp:JSON.stringify(resp) } ));
                }
            });
        }


        DQX.timeoutRetry = 30000;
        DQX.timeoutAjax = 120000;

        //A namespace for drawing helper utilities
        DQX.DrawUtil = {};

        DQX.TextOrig = function (snippetID) {
            var elem = $('#Snippets').children('#' + snippetID);
            if (elem.length == 0)
                DQX.reportError('Invalid snippet ID ' + snippetID);
            return elem.html();
        }

        DQX.Text = function (snippetID) {
            return DQX.interpolate(DQX.TextOrig(snippetID));
        }

        //determines if an object has a specific member
        DQX.hasMember = function (tryobj, membername) {
            if (typeof (tryobj) != 'object') return false;
            return membername in tryobj;
        }

        //reports an error if an object does not have a specific member
        DQX.requireMember = function (tryobj, membername) {
            if (typeof (tryobj) != 'object')
                DQX.reportError('variable cannot have a member because it is not an object');
            if (!(membername in tryobj))
                DQX.reportError('Object should have member "{memb}"'.DQXformat({ memb: membername }));
        }

        //reports an error if an object does not have a specific function
        DQX.requireMemberFunction = function (tryobj, membername) {
            DQX.requireMember(tryobj, membername);
            DQX.checkIsFunction(tryobj[membername]);
        }

        //reports an error if the argument is not a string
        DQX.checkIsString = function (value) {
            if (typeof value != 'string') DQX.reportError('Expected string value');
        }

        //reports an error if the argument is not a boolean
        DQX.checkIsBoolean = function (value) {
            if (typeof value != 'boolean') DQX.reportError('Expected boolean value');
        }

        //reports an error if the argument is not a number
        DQX.checkIsNumber = function (value) {
            if (typeof value != 'number') DQX.reportError('Expected number value');
        }

        //reports an error if the argument is not a function
        DQX.checkIsFunction = function (value) {
            if (typeof value != 'function') DQX.reportError('Expected function');
        }

        //A formatter extension for strings
        //usage: "Hello {name}".DQXformat({ name: 'World' })
        String.prototype.DQXformat = function (args) {
            var newStr = this;
            for (var key in args) {
                newStr = newStr.replace('{' + key + '}', args[key]);
            }
            return newStr;
        }


        //A helper function that can be called to report an error if an object does not have a specific member
        DQX.assertPresence = function (obj, memb) {
            if (!(memb in obj))
                DQX.reportError("Expected member '" + memb + "'");
        }


        DQX.ranseed = 0;

        //A random number generator that can be initiated with a predefined seed
        DQX.random = function () {
            DQX.ranseed = (DQX.ranseed * 9301 + 49297) % 233280;
            return DQX.ranseed / (233280.0);
        }

        DQX.Timer = function () {
            var that = {}
            var now = new Date();
            that.ticks0 = now.getTime();
            that.Elapsed = function () {
                var now = new Date();
                return (now.getTime() - that.ticks0) / 1000.0;
            }
            return that;
        }


        DQX.parseResponse = function (resp) {
            //lst = JSON.parse(resp);
            lst = resp;
            return lst;
        }

        DQX._activityList = [];

        DQX._updateActivityStatus = function () {
            if (DQX._activityList.length > 0) {
                if ($('#DQXActivityBox').length == 0) {
                    var DocEl = require("DQX/DocEl");
                    var box = DocEl.Div({ id: 'DQXActivityBox' });
                    box.addStyle("position", "absolute");
                    box.addStyle("left", '0px');
                    box.addStyle("top", '0px');
                    box.addStyle('background-color', 'rgb(255,128,128)');
                    $('#DQXUtilContainer').append(box.toString());
                }
                var content = [];
                $.each(DQX._activityList, function (idx, el) { content += el + '<br>'; });
                $('#DQXActivityBox').html(content);
            }
            else {
                $('#DQXActivityBox').remove();
            }
        }

        DQX.pushActivity = function (msg) {
            DQX._activityList.push(msg);
            DQX._updateActivityStatus();
        }

        DQX.popActivity = function () {
            DQX._activityList.pop();
            DQX._updateActivityStatus();
        }

        DQX.executeActivity = function (msg, activity) {
            DQX.pushActivity(msg);
            activity();
            DQX.popActivity();
        }

        DQX._processingRequestCount = 0;


        //Draws a message on the screen indicating that some processing is being done
        DQX.setProcessing = function (msg) {
            if (DQX._processingRequestCount == 0) {
                var DocEl = require("DQX/DocEl");
                var background = DocEl.Div({ id: 'InfoBoxProcessing' });
                background.addStyle("position", "absolute");
                background.addStyle("left", '0px');
                background.addStyle("top", '0px');
                background.addStyle('width', '100%');
                background.addStyle('height', '100%');
                background.addStyle('cursor', 'wait');
                //background.addStyle('background-color', 'rgba(100,100,100,0.2)');
                background.addStyle('z-index', '9999');
                var box = DocEl.Div({ id: 'Box', parent: background });
                box.addStyle("position", "fixed");
                box.addStyle("top", '50%');
                box.addStyle("left", '50%');
                box.addStyle("margin-top", '-30px');
                box.addStyle("margin-left", '-30px');
                box.addElem('<img src="Bitmaps/ProgressAnimation3.gif" alt="Progress animation" />');
                $('#DQXUtilContainer').append(background.toString());
            }
            DQX._processingRequestCount++;
        }

        //Executes a function and show a processing indication during the execution
        DQX.executeProcessing = function (fnc) {
            DQX.setProcessing();
            setTimeout(function () {
                fnc();
                DQX.stopProcessing();
            }, 20);
        }

        //Removes the processing message
        DQX.stopProcessing = function () {
            if (DQX._processingRequestCount == 1)
                $("#InfoBoxProcessing").remove();
            DQX._processingRequestCount--;
            if (DQX._processingRequestCount < 0)
                DQX._processingRequestCount = 0;
        }

        //Creates a function that reports a failure
        DQX.createFailFunction = function (msg) {
            return function () {
                DQX.stopProcessing();
                alert(msg);
            };
        }

        //Creates a function that reports a failire
        DQX.createMessageFailFunction = function () {
            return function (msg) {
                DQX.stopProcessing();
                alert(msg);
            };
        }

        //A class that encapsulates the creation of an url with query strings
        DQX.Url = function (iname) {
            var that = {};
            that.name = iname;
            that.queryitems = []

            //add a query item to the url
            that.addUrlQueryItem = function (iname, icontent) {
                this.queryitems.push({ name: iname, content: icontent });
            }

            that.delUrlQueryItem = function (iname) {
                $.each(that.queryitems, function(idx, it) {
                    if (it.name==iname)
                        that.queryitems.splice(idx,1);
                });
            }


            that.toString = function () {
                var rs = this.name;
                if (this.queryitems.length > 0) {
                    rs += "?";
                    for (var itemnr in this.queryitems) {
                        if (itemnr > 0) rs += "&";
                        rs += this.queryitems[itemnr].name + "=" + this.queryitems[itemnr].content;
                    }
                }
                return rs;
            }

            return that;
        }

        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // An RGB Color helper class
        //////////////////////////////////////////////////////////////////////////////////////////////////////

        DQX.Color = function (r, g, b, a) {
            var that = {};
            that.r = (typeof r == 'undefined') ? 0 : r;
            that.g = (typeof g == 'undefined') ? 0 : g;
            that.b = (typeof b == 'undefined') ? 0 : b;
            that.a = (typeof a == 'undefined') ? 1 : a;
            that.f = 1.0;

            that.getR = function () { return this.r / this.f; }
            that.getG = function () { return this.g / this.f; }
            that.getB = function () { return this.b / this.f; }
            that.getA = function () { return this.a / this.f; }

            that.toString = function () {
                if (this.a > 0.999)
                    return 'rgb(' + Math.round(this.getR() * 255) + ',' + Math.round(this.getG() * 255) + ',' + Math.round(this.getB() * 255) + ')';
                else
                    return 'rgb(' + this.getR().toFixed(3) + ',' + this.getG().toFixed(3) + ',' + this.getB().toFixed(3) + ',' + this.getA().toFixed(3) + ')';
            }
            that.toStringCanvas = function () {
                if (this.a > 0.999)
                    return 'rgb(' + Math.round(this.getR() * 255) + ',' + Math.round(this.getG() * 255) + ',' + Math.round(this.getB() * 255) + ')';
                else
                    return 'rgba(' + Math.round(this.getR() * 255) + ',' + Math.round(this.getG() * 255) + ',' + Math.round(this.getB() * 255) + ',' + this.getA().toFixed(3) + ')';
            }

            that.toStringHEX = function () {
                return (Math.round(this.getR() * 255)).toString(16) + (Math.round(this.getG() * 255)).toString(16) + (Math.round(this.getB() * 255)).toString(16);
            }

            that.isBlack = function() {
                return (that.r<1.0e-9) && (that.g<1.0e-9) && (that.b<1.0e-9);
            }

            //Returns a darkened version of the color, amount between 0 and 1
            that.darken = function (amount) {
                var fc = 1.0 - amount;
                return DQX.Color(fc * this.r, fc * this.g, fc * this.b, this.a);
            }

            //Returns a lightened version of the color, amount between 0 and 1
            that.lighten = function (amount) {
                var fc = amount;
                return DQX.Color((1 - fc) * this.r + fc, (1 - fc) * this.g + fc, (1 - fc) * this.b + fc, this.a);
            }

            that.changeOpacity = function (opacity) {
                return DQX.Color(this.getR(), this.getG(), this.getB(), opacity);
            }

            return that;
        }

        DQX.HSL2Color = function(h,s,l) {
            var r, g, b;
            if(s == 0){
                r = g = b = l; // achromatic
            }else{
                function hue2rgb(p, q, t){
                    if(t < 0) t += 1;
                    if(t > 1) t -= 1;
                    if(t < 1/6) return p + (q - p) * 6 * t;
                    if(t < 1/2) return q;
                    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                    return p;
                }
                var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                var p = 2 * l - q;
                r = hue2rgb(p, q, h + 1/3);
                g = hue2rgb(p, q, h);
                b = hue2rgb(p, q, h - 1/3);
            }
            return DQX.Color(r,g,b);
        }

        //converts a html color string to a DQX.Color
        DQX.parseColorString = function (colorstring, faildefault) {
            try {
                var parts = colorstring.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
                if ((parts) && (parts.length >= 2) && (parts[1].length > 0) && (parts[2].length > 0) && (parts[3].length > 0))
                    return DQX.Color(parseFloat(parts[1]) / 255.0, parseFloat(parts[2]) / 255.0, parseFloat(parts[3]) / 255.0);
                if (typeof faildefault != 'undefined')
                    return faildefault;
                return DQX.Color(0,0,0);
            }
            catch(err)
            {
                DQX.reportError('Invalid color string: '+colorstring)
            }
        }

        DQX.niceColours = [
            "#204a87",
            "#a40000",
            "#d3d7cf",
            "#5c3566",
            "#ce5c00",
            "#4e9a06",
            "#e9b96e",
            "#c4a000",
            "#729fcf",
            "#2e3436"

        ];

        DQX.standardColors = [
            DQX.Color(0.2,0.2,1.0),
            DQX.Color(1.0,0.3,0.3),
            DQX.Color(0.2,0.6,0.7),
            DQX.Color(0.9,0.5,0.0),
            DQX.Color(0.0,0.8,0.0),
            DQX.Color(0.8,0.2,0.8),
            DQX.Color(0,0,0.7),
            DQX.Color(0.7,0,0),
            DQX.Color(0,0.5,0),
            DQX.Color(0.5,0,0.5),
            DQX.Color(0.3,0.4,0.5),
            DQX.Color(0.5,0.5,0.8),
            DQX.Color(0.8,0.5,0.5),
            DQX.Color(0.7,0.6,0.4),
            DQX.Color(0.4,0.7,0.4),

            DQX.Color(0.3,0.3,0.5),
            DQX.Color(0.5,0.3,0.3),
            DQX.Color(0.5,0.4,0.2),
            DQX.Color(0.2,0.4,0.2),
            DQX.Color(0.5,0.3,0.5),
            DQX.Color(0.3,0.5,0.5),

            DQX.Color(0.6,0.6,0.7),
            DQX.Color(0.7,0.6,0.6),
            DQX.Color(0.7,0.7,0.5),
            DQX.Color(0.7,0.5,0.7),
            DQX.Color(0.5,0.7,0.7),
            DQX.Color(0.5,0.6,0.5),

            DQX.Color(0.6,0.6,0.6)
        ];


        DQX.PersistentAssociator = function(itemCount) {
            var that={};
            that.itemCount = itemCount;
            that.associations = {};

            that.map = function(idlist) {

                var freeItemMap = {};
                for (var i=0; i<that.itemCount; i++) freeItemMap[i]=1;
                $.each(idlist, function(idx, id) {
                    if (idx<that.itemCount) {
                        if (id in that.associations)
                            delete freeItemMap[id];
                    }
                });
                var freeItems=[];
                for (var i=0; i<that.itemCount; i++) {
                    if (freeItemMap[i]==1)
                        freeItems.push(i);
                };
                var freenr = 0;

                var usedItemMap = {};
                $.each(idlist, function(idx, id) {
                    if (idx<that.itemCount) {
                        var missing = false;
                        if (!(id in that.associations))
                            missing = true;
                        else {
                            if (that.associations[id] in usedItemMap)
                                missing = true;
                        }
                        if (missing) {
                            that.associations[id] = freeItems[freenr];
                            freenr++;
                        }
                        usedItemMap[that.associations[id]] = 1;
                    }
                });

                that.mapped = true;
            };

            that.getAssociations = function() {
                return that.associations;
            }

            that.get = function(id) {
                if (!(id in that.associations))
                    return -1;
                else
                    return that.associations[id];
            };

            return that;
        };


        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // A class that shows visual scroll up / down hints on a scrollable div (makes it easier to see what is scrollable on an iPad)
        // scrollableElement: a jQuery-style element rendered in the DOM, representing a scrollable div
        //////////////////////////////////////////////////////////////////////////////////////////////////////

        DQX.scrollHelper = function (scrollableElement) {
            var that = {};
            if (DQX.scrollBarWidth > 2) {//don't need in this case
                that.update = function () { };
                return that;
            }
            var htmlContent = '';
            var scrollUpIndicator = DocEl.Div();
            scrollUpIndicator.setCssClass("ScrollUpIndicator");
            scrollUpIndicator.addStyle("position", "absolute");
            scrollUpIndicator.addStyle("left", "0px");
            scrollUpIndicator.addStyle("top", "0px");
            scrollUpIndicator.addStyle("opacity", "0.4");
            scrollUpIndicator.addStyle("pointer-events", "none");
            scrollUpIndicator.addElem('<img src="' + DQX.BMP("scrollup3.png") + '" />');
            htmlContent += scrollUpIndicator.toString();

            var scrollDownIndicator = DocEl.Div();
            scrollDownIndicator.setCssClass("ScrollDownIndicator");
            scrollDownIndicator.addStyle("position", "absolute");
            scrollDownIndicator.addStyle("left", "0px");
            scrollDownIndicator.addStyle("bottom", "1px");
            scrollDownIndicator.addStyle("opacity", "0.4");
            scrollDownIndicator.addStyle("pointer-events", "none");
            scrollDownIndicator.addElem('<img src="' + DQX.BMP("scrolldown3.png") + '" />');
            htmlContent += scrollDownIndicator.toString();

            $(scrollableElement).parent().append(htmlContent);

            that._adjustScrollFeedback = function () {
                var scrollOffset = $(scrollableElement).scrollTop();
                if (scrollOffset > 0)
                    $(scrollableElement).parent().find('.ScrollUpIndicator').show();
                else
                    $(scrollableElement).parent().find('.ScrollUpIndicator').hide();
                var hh = $(scrollableElement)[0].scrollHeight;
                var hh2 = $(scrollableElement).height();
                if (hh - scrollOffset > hh2)
                    $(scrollableElement).parent().find('.ScrollDownIndicator').show();
                else
                    $(scrollableElement).parent().find('.ScrollDownIndicator').hide();
            }

            that.update = function () {
                if (DQX.scrollBarWidth > 2) return; //don't need in this case
                that._adjustScrollFeedback();
                var scrollElementPos = $(scrollableElement).position();
                var scrollElementWidth = $(scrollableElement).width();
                var scrollElementHeight = $(scrollableElement).height();
                $(scrollableElement).parent().find('.ScrollUpIndicator').css("top", (scrollElementPos.top) + "px");
                $(scrollableElement).parent().find('.ScrollDownIndicator').css("top", (scrollElementPos.top + scrollElementHeight - 16) + "px");
                $(scrollableElement).parent().find('.ScrollUpIndicator').css("left", (scrollElementPos.left + scrollElementWidth / 2 - 20) + "px");
                $(scrollableElement).parent().find('.ScrollDownIndicator').css("left", (scrollElementPos.left + scrollElementWidth / 2 - 20) + "px");
            }


            $(scrollableElement).scroll(that._adjustScrollFeedback);
            that.update();

            return that;
        };


        //////////////////////////////////////////////////////////////////////////////////////////////////////
        // Some helper functions that assist in finding back an object instance using a unique ID
        //////////////////////////////////////////////////////////////////////////////////////////////////////

        DQX.ObjectMapper = {}
        DQX.ObjectMapper.Objects = [];
        DQX.ObjectMapper._idx = 0;
        DQX.ObjectMapper.Add = function (obj) {
            DQX.ObjectMapper.Objects[DQX.ObjectMapper._idx] = obj;
            obj._MapIdx = DQX.ObjectMapper._idx;
            DQX.ObjectMapper._idx++;
        }
        DQX.ObjectMapper.get = function (idx) {
            return DQX.ObjectMapper.Objects[idx];
        }

        //Use this function to generate a html-compatible function call string that calls a function in an object instance
        DQX.ObjectMapper.CreateCallBackFunctionString = function (obj, functionname, arg) {
            if (!('_MapIdx' in obj))
                DQX.reportError("Object was not added to DQX.ObjectMapper");
            var rs = "DQX.ObjectMapper.get(" + obj._MapIdx + ")." + functionname + "(" + arg.toString() + ")";
            return rs;
        }



        ///////////////////////////////////////////////////////////////////
        // Measures the width of a scroll bar, takeb from http://www.alexandre-gomes.com/?p=115
        function getScrollBarWidth() {
            var inner = document.createElement('p');
            inner.style.width = "100%";
            inner.style.height = "200px";

            var outer = document.createElement('div');
            outer.style.position = "absolute";
            outer.style.top = "0px";
            outer.style.left = "0px";
            outer.style.visibility = "hidden";
            outer.style.width = "200px";
            outer.style.height = "150px";
            outer.style.overflow = "hidden";
            outer.appendChild(inner);

            document.body.appendChild(outer);
            var w1 = inner.offsetWidth;
            outer.style.overflow = 'scroll';
            var w2 = inner.offsetWidth;
            if (w1 == w2) w2 = outer.clientWidth;

            document.body.removeChild(outer);

            return (w1 - w2);
        };


        /////////////////////////////////////////////////////////////////////////////////////
        // Aguments a class that handles a html element so that it listens to touch & gesture events
        /////////////////////////////////////////////////////////////////////////////////////

        DQX.augmentTouchEvents = function (that, elemID, handleDrag, handleScale) {

            var _touchMoving = false;

            var getSingleTouchInfo = function (ev) {
                if (!ev.touches) DQX.reportError('No touch event');
                if (ev.touches.length < 1) DQX.reportError('Invalid touch event');
                var touchInfo = ev.touches[0];
                var rs = {
                    elemX: touchInfo.pageX - $('#' + elemID).offset().left,
                    elemY: touchInfo.pageY - $('#' + elemID).offset().top,
                    pageX: touchInfo.pageX,
                    pageY: touchInfo.pageY
                };
                rs.x = rs.elemX;
                rs.y = rs.elemY;
                return rs;
            }

            var _onTouchStart = function (ev) {
                if (ev.touches.length == 1) {
                    _touchMoving = true;
                    var touchInfo = getSingleTouchInfo(ev);
                    if (ev.stopPropagation)
                        ev.stopPropagation();
                    if (ev.preventDefault)
                        ev.preventDefault();
                    if (that.handleTouchStart)
                        that.handleTouchStart(touchInfo, ev);
                    that.touchPositionMoved = false;
                    that.touchStartElemX = touchInfo.elemX;
                    that.touchStartElemY = touchInfo.elemY;
                    that.touchInfoStart = touchInfo;
                }
            }

            var _onTouchMove = function (ev) {
                if ((ev.touches.length == 1) && (_touchMoving)) {
                    var touchInfo = getSingleTouchInfo(ev);
                    if (ev.stopPropagation)
                        ev.stopPropagation();
                    if (ev.preventDefault)
                        ev.preventDefault();
                    if (Math.abs(touchInfo.elemX - that.touchStartElemX) + Math.abs(touchInfo.elemY - that.touchStartElemY) > 10) {
                        that.touchPositionMoved = true;
                        if (that.handleTouchMove)
                            that.handleTouchMove(touchInfo, ev);
                    }

                }
            }

            var _onTouchEnd = function (ev) {
                if (_touchMoving) {
                    _touchMoving = false;
                    if (ev.stopPropagation)
                        ev.stopPropagation();
                    if (ev.preventDefault)
                        ev.preventDefault();
                    if (that.handleTouchEnd)
                        that.handleTouchEnd(ev);
                    if (!that.touchPositionMoved) {
                        if (that.handleTouchClick)
                            that.handleTouchClick(that.touchInfoStart, ev);
                    }
                }
            }

            var _onTouchCancel = function (ev) {
                if (_touchMoving) {
                    _touchMoving = false;
                    if (that.handleTouchEnd)
                        that.handleTouchEnd();
                }
            }

            var _onGestureStart = function (ev) {
                if (ev.preventDefault)
                    ev.preventDefault();
                if (ev.stopPropagation)
                    ev.stopPropagation();
                if (that.handleGestureStart)
                    that.handleGestureStart(ev);
            }

            var _onGestureChange = function (ev) {
                if (ev.preventDefault)
                    ev.preventDefault();
                if (ev.stopPropagation)
                    ev.stopPropagation();
                if (that.handleGestureChange)
                    that.handleGestureChange(ev);
            }

            var _onGestureEnd = function (ev) {
                if (ev.preventDefault)
                    ev.preventDefault();
                if (ev.stopPropagation)
                    ev.stopPropagation();
                if (that.handleGestureEnd)
                    that.handleGestureEnd(ev);
            }

            //var _onMSGestureChange = function (ev) {
            //    that._onGestureChange(ev);
            //}

            var msPointer = window.navigator.msPointerEnabled;

            var element = document.getElementById(elemID);
            if (!element)
                DQX.reportError('Invalid element ' + elemID);
            if (handleDrag) {
                element.addEventListener("touchstart", _onTouchStart, false);
                element.addEventListener("touchmove", _onTouchMove, false);
                element.addEventListener("touchend", _onTouchEnd, false);
                element.addEventListener("touchcancel", _onTouchCancel, false);
            }
            if (handleScale) {
                element.addEventListener("gesturestart", _onGestureStart, false);
                element.addEventListener("gesturechange", _onGestureChange, false);
                element.addEventListener("gestureend", _onGestureEnd, false);
                //if (msPointer) {
                //    element.addEventListener("MSGestureChange", _onMSGestureChange, false);
                //}
            }
        }


        //------------------------------------------------


        //Use this to get screen mouse positions at any moment
        DQX.mousePosX = 0;
        DQX.mousePosY = 0;

        DQX._mouseEventReceiverList = [];



        DQX._onError = function (message, url, lineNumber) {
            var errorTokens = { type: 'JSException', message: message, source: url, linenr: lineNumber, browser: navigator.userAgent };
            if (_debug_) {
                //Display error for testing purposes
                var msg = '';
                $.each(errorTokens, function (key, value) {
                    msg += key + '= ' + value + '\n';
                });
                alert(msg);
            }
            return true;
        };

        /////////////////////////////////////////////////////////////////////////////////////
        // The global DQX startup function
        /////////////////////////////////////////////////////////////////////////////////////

        DQX.Init = function () {


            DQX.scrollBarWidth = getScrollBarWidth();

            jQuery.support.cors = true;

            $.ajaxSetup({
                timeout: DQX.timeoutAjax
            });

            $(document).click(DQX._handleMouseClick);
            $(document).mousedown(DQX._handleMouseDown);
            $(document).mouseup(DQX._handleMouseUp);
            $(document).mousemove(DQX._handleMouseMove);
            $(document).mousemove(function (e) {
                DQX.mousePosX = e.pageX; DQX.mousePosY = e.pageY;
            });

            $(document).keydown(DQX._handleKeyDown);

            //            window.onerror = DQX._onError;
        }

        //Returns a html string that contains a link to a help document
        DQX.createHelpLink = function (docID, content) {
            var span = DocEl.Span({ id: docID });
            span.setCssClass("DQXHelpLink");
            span.addElem(content);
            return span.toString();
        }

        DQX._initInterpolation = function () {
            if (DQX._interpolationInitialised) return;
            //Fetch interpolation strings
            DQX.interpolationStrings = {}
            var origSet = [];
            $('#InterpolationSnippets').children('span').each(function () {
                var id = $(this).attr('id');
                origSet.push(id);
                DQX.interpolationStrings[id] = $(this).html();
            });
            //Create tokens for plurals and start of sentence
            $.each(origSet, function (idx, origID) {
                var origText = DQX.interpolationStrings[origID];
                var idCap = origID.charAt(0).toUpperCase() + origID.slice(1);
                var idPlural = origID + 's';
                var idPluralCap = idCap + 's';
                if (!DQX.interpolationStrings[idCap])
                    DQX.interpolationStrings[idCap] = origText.charAt(0).toUpperCase() + origText.slice(1);
                if (!DQX.interpolationStrings[idPlural])
                    DQX.interpolationStrings[idPlural] = origText + 's';
                if (!DQX.interpolationStrings[idPluralCap]) {
                    var pluralText = DQX.interpolationStrings[idPlural];
                    DQX.interpolationStrings[idPluralCap] = pluralText.charAt(0).toUpperCase() + pluralText.slice(1);
                }
            });
            DQX._interpolationInitialised = true;
        }

        //Replaces tokens of the style [@stringid] with strings fetched from spans in a div with id 'InterpolationSnippets' on the app html page
        //Note: since interpolation snippets may contain other interpolation tokens, we repeat this until there is nothing more replaces
        DQX.interpolate = function (str) {
            DQX.checkIsString(str);
            DQX._initInterpolation();
            for (; true; ) {
                var replaced = false;
                var matchList = str.match(/\[\@.*?\]/g);
                if (matchList) {
                    $.each(matchList, function (idx, match) {
                        var id = match.substring(2, match.length - 1);
                        if (!DQX.interpolationStrings[id]) {
                            if (_debug_)
                                DQX.reportError('Interpolation identifier not found: ' + id);
                        }
                        else {
                            str = str.replace(match, DQX.interpolationStrings[id]);
                            replaced = true;
                        }
                    });
                }
                if (!replaced)
                    return str;
            }
        }

        /////////////////////////////////////////////////////////////////////////////////////
        //This function should be called *after* the creation of all initial dynamic html
        /////////////////////////////////////////////////////////////////////////////////////

        DQX.initPostCreate = function () {

            // Fill in the include sections
            $('.DQXInclude').each(function (idx, tabset) {
                var id = $(this).html();
                if ($('#' + id).length == 0) DQX.reportError("Broken include link " + id);
                $(this).html($('#' + id).html());
            });

        }


        DQX._handleHelpLink = function (ev) {
            var q = 0;
        }

        DQX._globalKeyDownReceiverStack = [];
        DQX._globalKeyDownReceiverIndex = 0;

        DQX.registerGlobalKeyDownReceiver = function (handler, registerID) {
            if (!registerID) {
                DQX._globalKeyDownReceiverIndex++;
                registerID = DQX._globalKeyDownReceiverIndex;
            }

            DQX._globalKeyDownReceiverStack.unshift({ id: registerID, handler: handler });
            return registerID;
        }

        DQX.unRegisterGlobalKeyDownReceiver = function (registerID) {
            for (var i = 0; i < DQX._globalKeyDownReceiverStack.length; i++)
                if (DQX._globalKeyDownReceiverStack[i].id == registerID) {
                    DQX._globalKeyDownReceiverStack.splice(i, 1);
                }
        }

        DQX._onHoverKeyReceivers = {};

        DQX._handleKeyDown = function (ev) {
            if (ev.keyCode == 27)
                ev.isEscape = true;
            if (DQX._globalKeyDownReceiverStack.length > 0) {
                DQX._globalKeyDownReceiverStack[0].handler(ev);
                return;
            }
            for (var id in DQX._onHoverKeyReceivers)
                if (DQX._onHoverKeyReceivers[id])
                    if (DQX._onHoverKeyReceivers[id](ev)) {
                        return false;
                    }
        }


        //Registers a html element (identifier by an ID) to receive keydown events when the mouse is hovering over it. Events are sent to a function provided as argument
        DQX.setOnHoverKeyDownReceiver = function (elemID, fn) {
            if ($('#' + elemID).length == 0)
                DQX.reportError('Unable to register keydown receiver: DOM element ' + elemID + ' not found');
            var theElem = elemID;
            $('#' + elemID).mouseover(function (ev) {
                DQX._onHoverKeyReceivers[theElem] = fn;
            });
            $('#' + elemID).mouseout(function (ev) {
                delete DQX._onHoverKeyReceivers[theElem];
            });
        }

        DQX.getMouseWheelDelta = function (ev) { //Returns the *vertical* delta in a mouse wheel event
            var delta = 0;
            var ev1 = ev;
            if (ev.originalEvent)
                ev1 = ev.originalEvent;
            if ((ev1.wheelDeltaX !== undefined) && (ev1.wheelDelta) ) { // check that we are not scrolling horizontally
                if (Math.abs(ev1.wheelDeltaX) >= Math.abs(ev1.wheelDelta))
                    return 0;
            }
            if (ev1.wheelDelta) { delta = ev1.wheelDelta / 120; }
            else
                if (ev1.detail) { delta = -ev1.detail / 3; }
            return delta;
        }

        DQX.getMouseWheelDeltaX = function (ev) { //Returns the *horizontal* delta in a mouse wheel event
            var ev1 = ev;
            if (ev.originalEvent)
                ev1 = ev.originalEvent;
            if ((ev1.wheelDeltaX !== undefined) && (ev1.wheelDelta) ) { // check that we are scrolling horizontally
                if (Math.abs(ev1.wheelDeltaX) >= Math.abs(ev1.wheelDelta))
                    return ev1.wheelDeltaX / 120;
            }
            return 0;
        }

        DQX.addMouseEventReceiver = function (obj) {
            this._mouseEventReceiverList.push(obj);
        }

        DQX._registerStaticLinkHandlers = function () {
            $('.DQXStaticDocLink').each(function (idx, el) {
                $(this).click(function () {
                    var linkID = ($(this)).attr('href');
                    Msg.send({ type: 'ShowStaticDoc' }, linkID);
                    return false;
                });
            });
        }

        DQX._registerActionLinkHandlers = function () {
            $('.DQXActionLink').each(function (idx, el) {
                $(this).click(function () {
                    var actionID = ($(this)).attr('href');
                    Msg.send({ type: actionID });
                    return false;
                });
            });
        }


        DQX._handleMouseClick = function (ev) {
            var target = ev.target;
            var ct = 0;
            while ((target) && (ct <= 1)) {
                if ((target.className) && ((typeof target.className == 'string'))) {
                    if (target.className.slice(0, 11) == 'DQXHelpLink') {
                        var linkID = ($(target)).attr('href');
                        Msg.send({ type: 'ShowHelp' }, linkID);
                        ev.preventDefault();
                        return false;
                    }
                }
                target = target.parentElement;
                ct++;
            }
        }

        DQX._handleMouseDown = function (ev) {
        }

        DQX._handleMouseUp = function (ev) {
            for (var i in DQX._mouseEventReceiverList) {
                if (DQX._mouseEventReceiverList[i]._mousedown) {
                    DQX._mouseEventReceiverList[i]._onMouseUp(ev);
                    DQX._mouseEventReceiverList[i]._mousedown = false;
                }
            }
        }

        DQX._findMouseEventReceiver = function (iCanvasID) {
            for (var i in DQX._mouseEventReceiverList)
                if (DQX._mouseEventReceiverList[i].myCanvasID == iCanvasID)
                    return DQX._mouseEventReceiverList[i];
            return null;
        }

        DQX._lastMouseHoverTarget = null;

        DQX._handleMouseMove = function (ev) {
            //first try and see if this is a mousedown event
            for (var i in DQX._mouseEventReceiverList) {
                if (DQX._mouseEventReceiverList[i]._mousedown) {
                    DQX._mouseEventReceiverList[i]._onMouseMove(ev);
                    return;
                }
            }
            //if not, handle as a mouse hover event
            var thetarget = DQX._findMouseEventReceiver(ev.target.id);
            if (thetarget != null) {
                thetarget._onMouseHover(ev);
                DQX._lastMouseHoverTarget = thetarget;
            }
            else {
                if (DQX._lastMouseHoverTarget != null)
                    DQX._lastMouseHoverTarget.onLeaveMouse(ev);
                DQX._lastMouseHoverTarget = null;
            }
        }



        //////////////////////////////////////////////////////////////////////////////////
        // This provides a base class for classes that encapsulate a canvas element
        // It provides some basic functionality
        //////////////////////////////////////////////////////////////////////////////////


        // On retina-like devices, this determines the multiplication factor needed for the pixel buffer to get native resolution
        DQX.canvasBackingScale = function() {
            if ('devicePixelRatio' in window) {
                if (window.devicePixelRatio > 1) {
                    return window.devicePixelRatio;
                }
            }
            return 1;
        }

        DQX.CanvasElement = function (iCanvasID) {
            var that = {};
            that.myCanvasID = iCanvasID;
            that.getMyCanvasElement = function () { return $("#" + iCanvasID + "")[0]; }

            //Call this function to register the required handlers for this element
            that.registerHandlers = function (el) {
                DQX.addMouseEventReceiver(this);
                $(el).mousedown($.proxy(this._handleOnMouseDown, this));
            }

            that._handleOnMouseDown = function (ev) {
                this._mousedown = true;
                this._onMouseDown(ev);
                ev.returnValue = false;
                return false;

            }

            //From an event with position information, returns the X position relative to the canvas
            that.getEventPosX = function (ev) {
                return ev.pageX - $(this.getMyCanvasElement()).offset().left;
            }

            //From an event with position information, returns the Y position relative to the canvas
            that.getEventPosY = function (ev) {
                return ev.pageY - $(this.getMyCanvasElement()).offset().top;
            }

            that._onMouseHover = function (ev) { } //you can override this
            that.onLeaveMouse = function (ev) { } //you can override this
            that._onMouseDown = function (ev) { } //Called when the mouse is pressed down (you can override this)
            that._onMouseUp = function (ev) { } //Called when the mouse is released (you can override this)
            that._onMouseMove = function (ev) { } //Called when the mouse is moved *while pressed down* (you can override this)

            return that;
        }



        //////////////////////////////////////////////////////////////////////////////////




        // Produces a minor/major scale tick set that matches the desired minor jump distance as close as possible
        DQX.DrawUtil.getScaleJump = function (DesiredJump1) {
            var JumpPrototypes = [{ Jump1: 1, JumpReduc: 5 }, { Jump1: 2, JumpReduc: 5 }, { Jump1: 5, JumpReduc: 4}];
            var mindist = 1.0e99;
            var bestjump;
            for (JumpPrototypeNr in JumpPrototypes) {
                q = Math.floor(Math.log(DesiredJump1 / JumpPrototypes[JumpPrototypeNr].Jump1) / Math.log(10));
                var TryJump1A = Math.pow(10, q) * JumpPrototypes[JumpPrototypeNr].Jump1;
                var TryJump1B = Math.pow(10, q + 1) * JumpPrototypes[JumpPrototypeNr].Jump1;
                if (Math.abs(TryJump1A - DesiredJump1) < mindist) {
                    mindist = Math.abs(TryJump1A - DesiredJump1);
                    bestjump = { Jump1: TryJump1A, JumpReduc: JumpPrototypes[JumpPrototypeNr].JumpReduc };
                }
                if (Math.abs(TryJump1B - DesiredJump1) < mindist) {
                    mindist = Math.abs(TryJump1B - DesiredJump1);
                    bestjump = { Jump1: TryJump1B, JumpReduc: JumpPrototypes[JumpPrototypeNr].JumpReduc };
                }
            }
            if (!bestjump)
                return -1;

            var frcdigits = -(Math.log(bestjump.Jump1 * bestjump.JumpReduc) / Math.log(10.0));
            bestjump.textDecimalCount = Math.max(0, Math.ceil(frcdigits));

            bestjump.value2String = function(val) {
                if ( (Math.abs(val)>=100000) ) {
                    return val.toExponential();
                }
                else
                    return val.toFixed(this.textDecimalCount);
            }

            return bestjump;
        }

        DQX.getWindowClientW = function () {
            var docW = window.innerWidth;
            if (!docW)
                docW = document.body.clientWidth;
            return docW;
        }

        DQX.getWindowClientH = function () {
            var docH = window.innerHeight;
            if (!docH)
                docH = document.body.clientHeight;
            return docH;
        }



        ////////////////////////////////////////////////////////////////////////////////////
        // Some html write helper utilities
        ////////////////////////////////////////////////////////////////////////////////////


        DQX.CreateKeyValueTable = function (data) {
            var resp = "<table>";
            for (key in data) {
                resp += "<tr>";
                resp += "<td><b>" + key + "</b></td>";
                resp += '<td style="padding-left:5px;max-width:300px;word-wrap:break-word;">' + data[key] + "</td>";
                resp += "</tr>";
            }
            resp += "</table>"
            return resp;
        }

        ////////////////////////////////////////////////////////////////////////////////////
        // Some functional programming helpers
        ////////////////////////////////////////////////////////////////////////////////////
        DQX.identity = function (x) {
            return x;
        };
        DQX.return_arg = function (arg_number) {
            return function () {
                return arguments[arg_number];
            }
        }
        DQX.functor = function (v) {
            return typeof v === "function" ? v : function () {
                return v;
            };
        };
        DQX.chain = function () {
            var args = arguments;
            return function (v) {
                var val = v;
                for (var i = 0; i < args.length; i++) {
                    val = args[i](val);
                }
                return val;
            };
        };
        DQX.attr = function (v) {
            return function (obj) {
                return obj[v];
            }
        };
        DQX.comp_attr = function (attr, comparator) {
            return function (a, b) {
                return comparator(a[attr], b[attr]);
            }
        };
        DQX.attrMap = function (array, attribute) {
            var out = {};
            array.forEach(function(entry) {
                out[entry[attribute]] = entry;
            });
            return out;
        }
        DQX.ratelimit = function (fn, delay) {
            var last = (new Date()).getTime();
            var timer = null;
            return (function (arg) {
                var now = (new Date()).getTime();
                if (now - last > delay) {
                    last = now;
                    clearTimeout(timer);
                    fn(arg);
                }
                else {
                    clearTimeout(timer);
                    timer = setTimeout(function () {
                        fn(arg);
                    }, delay + (delay * .15));
                }
            });
        };
        DQX.canvas_smoothing = function (ctx, state) {
            ctx.webkitImageSmoothingEnabled = state;
            ctx.mozImageSmoothingEnabled = state;
            ctx.imageSmoothingEnabled = state;
        };
        DQX.canvas_smooth_scaling_only = function () {
            if (DQX._canvas_smooth_scaling_only == undefined) {
                var buffer1 = document.createElement('canvas');
                //Draw two pixels - one black, one white
                buffer1.width = 2;
                buffer1.height = 1;
                var ctx = buffer1.getContext('2d');
                var imageData = ctx.createImageData(buffer1.width, buffer1.height);
                var data = imageData.data;
                [255, 255, 255, 255, 0, 0, 0, 255].forEach(function (val, i) {
                    data[i] = val;
                });
                ctx.putImageData(imageData, 0, 0);
                //Now draw those two pixels stretched onto 3...
                var buffer2 = document.createElement('canvas');
                buffer2.width = 3;
                buffer2.height = 1;
                ctx = buffer2.getContext('2d');
                //Set the transform matrix to stretch
                ctx.setTransform(buffer2.width / buffer1.width, 0, 0, 1, 0, 0);
                //Do our best to turn off smoothing
                DQX.canvas_smoothing(ctx, false);
                //Draw the two pixels streched
                ctx.drawImage(buffer1, 0, 0);
                data = ctx.getImageData(0, 0, buffer2.width, buffer2.height).data;
                //Pixel must not be grey!
                var pixel = data[5] + data[6] + data[7];
                DQX._canvas_smooth_scaling_only = !(pixel == 255 * 3 || pixel == 0);
            }
            return DQX._canvas_smooth_scaling_only;

        };
        DQX.vendorPropName = function (style, name) {
            name = $.camelCase(name);
            var cssPrefixes = ["Webkit", "O", "Moz", "ms"];

            // shortcut for names that are not vendor prefixed
            if (name in style) {
                return name.replace(/([A-Z])/g, function ($1) { return "-" + $1.toLowerCase(); });
            }

            // check for vendor prefixed names
            var capName = name.charAt(0).toUpperCase() + name.slice(1),
                origName = name,
                i = cssPrefixes.length;

            while (i--) {
                name = cssPrefixes[i] + capName;
                if (name in style) {
                    var result = name.replace(/([A-Z])/g, function ($1) { return "-" + $1.toLowerCase(); });
                    if (cssPrefixes[i] == 'ms') {
                        return '-' + result;
                    }
                    else {
                        return result
                    }

                }
            }
            return origName.replace(/([A-Z])/g, function ($1) { return "-" + $1.toLowerCase(); });
        };

        DQX.vendor_name = function (tag, style) {
            DQX.vendor_name_cache = DQX.vendor_name_cache || {};
            if (tag + style in DQX.vendor_name_cache)
                return DQX.vendor_name_cache[tag + style];
            else {
                var elem = document.createElement(tag);
                return DQX.vendor_name_cache[tag + style] = DQX.vendorPropName(elem.style, style);
            }
        };


        DQX.JD2DateTime = function(JD) {
            return new Date((JD-2440587.5)*24*60*60*1000);
        }

        DQX.DateTime2JD = function(date) {
            return date.getTime()/(24.0*60*60*1000) + 2440587.5;
        }

        //For a given template return a list of the fields actually used - note only supports shallow objects
        Handlebars.fields_used = function(template, possible_fields) {
            var hb = Handlebars.create();
            hb.registerHelper('if', function(conditional, options){
                if (conditional)
                    conditional();
                options.fn(this);
                options.inverse(this);
            });
            hb.registerHelper('with', function(context, options){
                if (context)
                    context();
            });
            hb.registerHelper('each', function(context, options){
                if (context)
                    context();
            });
            var compiled = hb.compile(template);
            var tracers = {};
            var used_fields = [];
            $.each(possible_fields, function(idx, field) {
                tracers[field] = function() {
                    used_fields.push(field)
                };
            });
            compiled(tracers);
            return _.unique(used_fields);
        };

        // test

//        var dt = new Date(2014,4,12,1,0,0);
//
//        var pad = function(n) {return n<10 ? '0'+n : n};
//        var str = dt.getUTCFullYear()
//            + '-' + pad( dt.getUTCMonth() + 1 )
//            + '-' + pad( dt.getUTCDate() );
//
//        var year = parseInt(str.substring(0,4));
//        var month = parseInt(str.substring(5,7));
//        var day = parseInt(str.substring(8,10));
//
//        var jd = DQX.DateTime2JD(new Date(year, month-1, day));
//
//        var dt2 = DQX.JD2DateTime(jd);

        return DQX;
    });
