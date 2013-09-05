
/**************************************************************************************************************************************************************
***************************************************************************************************************************************************************

Message bus system

A message contains two elements
(1) scope: object with string key-value pairs
    this is used to identify what listeners receive what message: all values in the scope filter of the listener have to match those in the message scope
(2) content: any object

***************************************************************************************************************************************************************
**************************************************************************************************************************************************************/

define(
    function () {
        var Msg = {};

        Msg._listeners = [];
        Msg._listeneridmap = {};

        //Broadcasts a message (does not put any constraints on the number of recipients receiving the message)
        Msg.broadcast = function (scope, content) {
            var receiverCount = 0
            for (var lnr = 0; lnr < Msg._listeners.length; lnr++) {
                var lscope = Msg._listeners[lnr].scopeFilter;
                var covered = true;
                for (var scopekey in lscope) {
                    if (!(scopekey in scope)) covered = false;
                    else if (lscope[scopekey] != scope[scopekey]) covered = false;
                    if (!covered) break;
                }
                if (covered) {
                    Msg._listeners[lnr].callbackFunction.call(Msg._listeners[lnr].context, scope, content);
                    receiverCount++;
                }
            }
            return receiverCount;
        }

        //Send a message (requires the message to be received by exactly one recipient)
        Msg.send = function (scope, content) {
            var receiverCount = Msg.broadcast(scope, content);
            if (receiverCount > 1)
                DQX.reportError("Message was processed by more than one recipient");
            if (receiverCount == 0)
                DQX.reportError("Message was not processed by any recipient");
        }

        //Registers an event listener
        //eventid: optional unique identifier to avoid duplicate entry of the same listener
        //scopeFilter: see introduction
        //callbackFunction: handler function, receiving the message scope and message context
        Msg.listen = function (eventid, scopeFilter, callbackFunction, context) {
            if (typeof (eventid) != 'string')
                DQX.reportError('Listener event id not provided');
            if (!callbackFunction)
                DQX.reportError('No callback function provided for event listener');
            if ((eventid != '') && (eventid in Msg._listeneridmap)) {
                var idx = Msg._listeneridmap[eventid];
                Msg._listeners[idx].scopeFilter = scopeFilter;
                Msg._listeners[idx].callbackFunction = callbackFunction;
                Msg._listeners[idx].context = context;
                return;
            }
            if (eventid != '')
                Msg._listeneridmap[eventid] = Msg._listeners.length;
            Msg._listeners.push({ eventid: eventid, scopeFilter: scopeFilter, callbackFunction: callbackFunction, context: context });
        }

        Msg.delListener = function(eventid) {
            if (eventid in Msg._listeneridmap) {
                var idx = Msg._listeneridmap[eventid];
                Msg._listeners.splice(idx,1);
                delete Msg._listeneridmap[eventid];
            }
        }

        return Msg
    });
