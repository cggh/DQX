define(
    function () {
        var Msg = {};

        Msg._listeners = [];
        Msg._listeneridmap = {};

        //Broadcast does not put any constraints on the number of recipients receiving the message
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

        //Send requires the message to be received by exactly one recipient
        Msg.send = function (scope, content) {
            var receiverCount = Msg.broadcast(scope, content);
            if (receiverCount > 1)
                throw "Message was processed by more than one recipient";
            if (receiverCount == 0)
                throw "Message was not processed by any recipient";
        }


        Msg.listen = function (eventid, scopeFilter, callbackFunction, context) {
            if (typeof (eventid) != 'string')
                throw ('Listener event id not provided');
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
        return Msg
    });
