
define(["require", "DQX/Framework", "DQX/Popup", "DQX/Msg", "DQX/Utils", "DQX/DocEl", "DQX/Controls", "DQX/base64"],
    function (require, Framework, Popup, Msg, DQX, DocEl, Controls, Base64) {


        var ServerIO = {};

        ServerIO.waitForCompletion = function(serverUrl, calculationid, onCompleted, initialResponse) {
            var popupid = Popup.create('Processing','Server is processing. This may take a while!<p><div id="calculationprogressbox" style="min-width:400px"></div><p>', null, {canClose: false} );
            var poll = function() {
                data = {};
                DQX.customRequest(serverUrl, 'uploadtracks', 'querycalculation', { calculationid: calculationid }, function(resp) {
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
            setTimeout(poll, 1000);
        };

        ServerIO.customAsyncRequest = function(serverUrl, respmodule, request, data, onCompleted) {
            DQX.customRequest(serverUrl, respmodule, request, data, function(resp) {
                ServerIO.waitForCompletion(serverUrl, resp.calculationid, onCompleted, resp);
            });
        };

        ServerIO.showLog = function(serverUrl, logid) {
            //!!! todo: move server side out of uploadtracks and into DQXServer
            DQX.customRequest(serverUrl, 'uploadtracks','getcalculationlog',{ id: logid },function(resp) {
                if (resp.Error)
                    Popup.create('Calculation log', 'No log data present');
                else {
                    var div = DocEl.Div();
                    div.setCssClass('DQXLogReport');
                    var content = '';
                    var indent = -1;
                    var isDataDump = false;
                    var origcontent = resp.Content;
                    var lines = origcontent.split('\n');
                    $.each(lines, function(idx, line) {
                        var linediv = DocEl.Div();
                        var addLine = true;
                        linediv.setCssClass('DQXLogReportLine');
                        if (line.substring(0,3) == '==>') {
                            linediv.setCssClass('DQXLogReportHeader');
                            line = line.substring(3);
                            indent += 1;
                        }
                        if (line.substring(0,3) == '-->') {
                            linediv.setCssClass('DQXLogReportHeaderSub');
                            line = line.substring(3);
                            indent += 1;
                        }
                        if (line.substring(0,3) == 'DD>') {
                            indent += 1;
                            addLine = false;
                            isDataDump = true;
                        }


                        linediv.addStyle('margin-left',30*Math.max(0,indent)+'px')


                        if (line.substring(0,3) == '<==') {
                            indent -= 1;
                            linediv.setCssClass('DQXLogReportFooter');
                            line = line.substring(3);
                        }
                        if (line.substring(0,3) == '<--') {
                            indent -= 1;
                            linediv.setCssClass('DQXLogReportFooterSub');
                            line = line.substring(3);
                        }
                        if (line.substring(0,3) == '<DD') {
                            indent -= 1;
                            addLine = false;
                            isDataDump = false;
                        }


                        if (line.substring(0,8) == 'COMMAND:') {
                            linediv.setCssClass('DQXLogReportCommand');
                            line = line.substring(8);
                        }
                        if (line.substring(0,4) == 'SQL:') {
                            linediv.setCssClass('DQXLogReportCommand');
                            line = line.substring(4);
                        }
                        if (line.substring(0,6) == 'ERROR:') {
                            linediv.setCssClass('DQXLogReportError');
                        }
                        if (line.substring(0,8) == 'WARNING:') {
                            linediv.setCssClass('DQXLogReportWarning');
                        }
                        if (line.substring(0,2) == '[<') {
                            addLine = false;
                        }
                        if (line.substring(0,3) == '@@@') {
                            addLine = false;
                        }
                        if (addLine) {
                            if (isDataDump) {
                                line = line.replace(/ /g,'&nbsp;')
                                line = '<div class="DQXLogReportDataDump">' + line +'</div>';
                            }
                            linediv.addElem(line);
                            content += linediv.toString();
                        }
                    });

                    div.addElem(content)
                    Popup.create('Calculation log '+logid, div.toString() );
                }
            });
        };



        return ServerIO;
    });