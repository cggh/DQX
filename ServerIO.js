
define(["require", "DQX/Framework", "DQX/Popup", "DQX/Msg", "DQX/Utils", "DQX/DocEl", "DQX/Controls"],
    function (require, Framework, Popup, Msg, DQX, DocEl, Controls) {


        var ServerIO = {

            waitForCompletion : function(calculationid, onCompleted, initialResponse) {
                var popupid = Popup.create('Processing','Server is processing. This may take a while!<p><div id="calculationprogressbox" style="min-width:400px"></div><p>', null, {canClose: false} );
                var poll = function() {
                    data = {};
                    DQX.customRequest(MetaData.serverUrl, 'uploadtracks', 'querycalculation', { calculationid: calculationid }, function(resp) {
                        if (resp.failed) {
                            alert(resp.status);
                            DQX.ClosePopup(popupid);
                        }
                        else {
                            if (resp.completed) {
                                DQX.ClosePopup(popupid);
                                if (onCompleted)
                                    onCompleted(initialResponse);
                            }
                            else {
                                var str = resp.status;
                                if (resp.progress)
                                    str+=' ('+(100*resp.progress).toFixed(0)+'%)';
                                $('#calculationprogressbox').html('<h3>'+str+'</h3>');
                                setTimeout(poll, 2000);
                            }
                        }
                    });
                };
                poll();
            },

            customAsyncRequest : function(serverUrl, respmodule, request, data, onCompleted) {
                DQX.customRequest(serverUrl, respmodule, request, data, function(resp) {
                    waitForCompletion(resp.calculationid, onCompleted, resp);
                });
            }
        }


        return ServerIO;
    });