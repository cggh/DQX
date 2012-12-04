define(["jquery", "DQX/Msg"],
    function ($, Msg) {
        //Inject DQX into the global namespace so that click handlers can find it
        DQX = {};

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

        DQX.highlightText = function(data, search) {
            function preg_quote(str) { return (str + '').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1"); }
            return data.replace(new RegExp("(" + preg_quote(search) + ")", 'gi'), '<span class="DQXHighlight">$1</span>');
        }


        DQX.Gui = {};
        DQX.Gui.GuiComponent = function (iid, args) {
            var that = {};
            that.myID = iid;

            that.getSubId = function (ext) { return that.myID + ext; }

            if ($('#' + that.myID).length == 0) throw "Invalid Gui component " + iid;
            that.rootelem = $('#' + that.myID);

            that.handleResize = function () {
                if ('onResize' in that) {
                    if ((that.rootelem.width() > 5) && (that.rootelem.height() > 5))
                        that.onResize();
                }
            }

            //that.rootelem.resize(_handleOnResize);

            return that;
        }

        DQX.timeoutRetry = 10000;
        DQX.timeoutAjax = 15000;

        //A namespace for drawing helper utilities
        DQX.DrawUtil = {};

        DQX.Text = function (snippetID) {
            return $('#Snippets').children('#' + snippetID).html();
        }

        DQX.hasMember = function (tryobj, membername) {
            if (typeof (tryobj) != 'object') return false;
            return membername in tryobj;
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


        //A helper function that can be called to throw an error if an object does not have a specific member
        DQX.assertPresence = function (obj, memb) {
            if (!(memb in obj))
                throw "Expected member '" + memb + "'";
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
            lst = JSON.parse(resp);
            return lst;
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
            }, 100);
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

        //converts a html color string to a DQX.Color
        DQX.parseColorString = function (colorstring, faildefault) {
            var parts = colorstring.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            if ((parts) && (parts.length >= 2) && (parts[1].length > 0) && (parts[2].length > 0) && (parts[3].length > 0))
                return DQX.Color(parseFloat(parts[1]) / 255.0, parseFloat(parts[2]) / 255.0, parseFloat(parts[3]) / 255.0);
            if (typeof faildefault != 'undefined')
                return faildefault;
        }

        DQX.hslToRgb = function(h, s, l){
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

            return [r * 255, g * 255, b * 255];
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
                throw "Object was not added to DQX.ObjectMapper";
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



        //------------------------------------------------


        //Use this to get screen mouse positions at any moment
        DQX.mousePosX = 0;
        DQX.mousePosY = 0;

        DQX._mouseEventReceiverList = [];


        /////////////////////////////////////////////////////////////////////////////////////
        // The global DQX startup function
        /////////////////////////////////////////////////////////////////////////////////////

        DQX.Init = function () {

            DQX.scrollBarWidth = getScrollBarWidth();

            $.ajaxSetup({
                timeout: DQX.timeoutAjax
            });

            $(document).mouseup(DQX._handleMouseUp);
            $(document).mousemove(DQX._handleMouseMove);
            $(document).mousemove(function (e) {
                DQX.mousePosX = e.pageX; DQX.mousePosY = e.pageY;
            });

            $(document).keydown(DQX._handleKeyDown);
        }

        //Show a help box corresponding to a help id item in the DOM
        DQX.showHelp = function (id) {
            if ($('#' + id).length == 0) throw "Broken help link " + id;
            var helpcontent = $('#' + id).html();
            DQX.CreateFloatBox("Help", helpcontent, "Help");
        }



        /////////////////////////////////////////////////////////////////////////////////////
        //This function should be called *after* the creation of all initial dynamic html
        /////////////////////////////////////////////////////////////////////////////////////

        DQX.initPostCreate = function () {

            // Initialise functionality for tabbed environments NOTE: this is likely to be depreciated, since this is handled in the framework
            /*    
            $('.DQXTabSet').each(function (idx, tabset) {
    
            var id = tabset.id;
    
            $(tabset).find('.DQXTabContent').css('display', 'none');
    
    
            var activeid = 'C' + $(tabset).find('.DQXTabActive').attr('id');
            $(tabset).find('#' + activeid).css('display', 'inline');
    
    
            $(tabset).children('.DQXTabs').children('.DQXTab').click(function () {
            $(tabset).children('.DQXTabs').children('.DQXTab').removeClass('DQXTabActive');
            $(tabset).children('.DQXTabs').children('.DQXTab').addClass('DQXTabInactive');
            $(this).addClass("DQXTabActive");
            $(this).removeClass("DQXTabInactive");
    
            $(tabset).children('.DQXTabBody').children('.DQXTabContent').css('display', 'none');
            var content_show = 'C' + $(this).attr("id");
            $(tabset).find("#" + content_show).css('display', 'inline');
    
            Msg.send({ type: 'ClickTab', id: id }, this.id);
    
            });
    
            });
            */

            // Initialise functionality for help buttons
            $('.DQXInfoButton').each(function (idx, tabset) {
                var id = $(this).html();
                $(this).html('<img src="Bitmaps/info.png" alt="info"/>');
                $(this).click(function () { DQX.showHelp(id); return false; });
            });

            // Fill in the include sections
            $('.DQXInclude').each(function (idx, tabset) {
                var id = $(this).html();
                if ($('#' + id).length == 0) throw "Broken include link " + id;
                $(this).html($('#' + id).html());
            });

        }

        DQX._keyReceivers = {};

        DQX._handleKeyDown = function (ev) {
            for (var id in DQX._keyReceivers)
                if (DQX._keyReceivers[id])
                    if (DQX._keyReceivers[id](ev)) {
                        return false;
                    }
        }

        DQX.setKeyDownReceiver = function (elemID, fn) {
            var theElem = elemID;
            $('#' + elemID).mouseover(function (ev) {
                DQX._registerKeyReceiver(theElem, fn);
            });
            $('#' + elemID).mouseout(function (ev) {
                DQX._unregisterKeyReceiver(theElem);
            });
        }

        DQX.getMouseWheelDelta = function (ev) {
            var delta = 0;
            if (ev.wheelDelta) { delta = ev.wheelDelta / 120; }
            if (ev.detail) { delta = -ev.detail / 3; }
            return delta;
        }


        DQX._registerKeyReceiver = function (theElem, fn) {
            DQX._keyReceivers[theElem] = fn;
        }

        DQX._unregisterKeyReceiver = function (theElem) {
            delete DQX._keyReceivers[theElem];
        }



        DQX.addMouseEventReceiver = function (obj) {
            this._mouseEventReceiverList.push(obj);
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

            return bestjump;
        }

        //Draws a tooltip in a canvas drawing context
        DQX.DrawUtil.DrawChannelToolTip = function (context, _toolTipInfo) {
            var xp = _toolTipInfo.xp + 0.5;
            var yp = _toolTipInfo.yp + 1 + 0.5;

            //Determine x size
            context.font = 'bold 12px sans-serif';
            context.textBaseline = 'top';
            context.textAlign = 'left';
            var xlen = 10;
            for (var linenr in _toolTipInfo.lines)
                xlen = Math.max(xlen, context.measureText(_toolTipInfo.lines[linenr].Text).width);
            xlen += 2;
            var ylen = _toolTipInfo.lines.length * 16 + 6;

            var dff = 20;
            context.globalAlpha = 1;
            var backgrad = context.createLinearGradient(0, yp, 0, yp + ylen + dff);
            backgrad.addColorStop(0, "rgb(255,255,160)");
            backgrad.addColorStop(1, "rgb(255,190,80)");

            context.fillStyle = backgrad;

            context.strokeStyle = "rgb(0,0,0)";

            context.beginPath();
            context.moveTo(xp, yp);
            context.lineTo(xp + dff / 2, yp + dff);
            context.lineTo(xp + xlen, yp + dff);
            context.lineTo(xp + xlen, yp + dff + ylen);
            context.lineTo(xp - dff / 2, yp + dff + ylen);
            context.lineTo(xp - dff / 2, yp + dff);
            context.closePath();
            context.shadowColor = "black";
            context.shadowBlur = 10;
            context.fill();
            context.stroke();
            context.shadowColor = "transparent";



            for (var linenr in _toolTipInfo.lines) {
                var line = _toolTipInfo.lines[linenr];
                context.fillStyle = line.Color;
                context.fillText(line.Text, xp - 3, yp + dff + 3 + linenr * 16);
            }
            context.globalAlpha = 1.0;
        }



        ////////////////////////////////////////////////////////////////////////////////////
        // Some html write helper utilities
        ////////////////////////////////////////////////////////////////////////////////////


        DQX.CreateKeyValueTable = function (data) {
            var resp = "<table>";
            for (key in data) {
                resp += "<tr>";
                resp += "<td>" + key + "</td>";
                resp += '<td style="max-width:300px;word-wrap:break-word;">' + data[key] + "</td>";
                resp += "</tr>";
            }
            resp += "</table>"
            return resp;
        }


        DQX.HtmlWriteKeyValuePair = function (KeyName, Content) {
            return "<b>" + KeyName + "</b>= " + Content;
        }


        ////////////////////////////////////////////////////////////////////////////////////
        // Some stuff that allows one to create a draggable floating box
        ////////////////////////////////////////////////////////////////////////////////////


        DQX.CloseFloatBox = function (index) {
            $("#" + index).remove();
        }

        DQX._tabIndex = 0;


        DQX.CreateFloatBox = function (iTitle, iBody, iClassExtension) {

            if (typeof iClassExtension == 'undefined') iClassExtension = '';

            if ($('#DQXFloatBoxHolder').length == 0)
                throw "Document should have a div DQXFloatBoxHolder";

            //we create the float box close to the current cursor
            var posx = DQX.mousePosX + 10;
            var posy = DQX.mousePosY + 10;

            posx = Math.min(posx, $(window).width() - 400);
            posy = Math.min(posy, $(window).height() - 100);


            DQX._tabIndex++;
            var ID = "DQXFlt" + DQX._tabIndex;
            var thebox = DQX.DocEl.Div({ id: ID });
            thebox.setCssClass("DQXFloatBox" + (iClassExtension.length > 0 ? (" DQXFloatBox" + iClassExtension) : ""));
            thebox.addStyle("position", "absolute");
            thebox.addStyle("left", posx + 'px');
            thebox.addStyle("top", posy + 'px');

            var theheader = DQX.DocEl.Div({ id: ID + 'Handler', parent: thebox });
            theheader.setCssClass("DQXFloatBoxHeader" + (iClassExtension.length > 0 ? (" DQXFloatBoxHeader" + iClassExtension) : ""));
            theheader.addElem(iTitle);

            var thebody = DQX.DocEl.Div({ parent: thebox });
            thebody.setCssClass("DQXFloatBoxContent" + (iClassExtension.length > 0 ? (" DQXFloatBoxContent" + iClassExtension) : ""));
            thebody.addElem(iBody);

            var thecloser = DQX.DocEl.JavaScriptBitmaplink("Bitmaps/close.png", "Close", "DQX.CloseFloatBox('" + ID + "')");
            thebox.addElem(thecloser);
            thecloser.addStyle('position', 'absolute');
            thecloser.addStyle('left', '-10px');
            thecloser.addStyle('top', '-10px');


            //    content += '<a href="#" style="font-size:11pt" onclick=DQX.CloseFloatBox("' + ID + '")>[X]</a> '
            /*    content += '<div class="content">';
            content += Body;
            content += "</div>";
            content += "</div>";*/
            var content = thebox.toString();
            $('#DQXFloatBoxHolder').append(content);
            MakeDrag(ID);
            return ID;
        }
        return DQX;
    });
