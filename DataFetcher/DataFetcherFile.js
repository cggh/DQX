/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/

define(["jquery", "DQX/SQL", "DQX/Utils", "DQX/base64"],
    function ($, SQL, DQX, Base64) {
        var DataFetcherFile = {}


        DataFetcherFile.getFile = function (serverUrl, filename, handler) {
            //prepare the url
            var myurl = DQX.Url(serverUrl);
            //filename=filename.replace(/\./g, "_dot_");
            myurl.addUrlQueryItem("datatype", "getfile");
            myurl.addUrlQueryItem("name", filename);
            var urlstring = myurl.toString();
            $.ajax({
                url: urlstring,
                success: function (resp) {
                    var keylist = DQX.parseResponse(resp);
                    if ("Error" in keylist) {//!!!todo: some error handling
                        DQX.stopProcessing();
                        return;
                    }
                    handler(Base64.decode(keylist.content));
                },
                error: function (resp) {//!!!todo: some error handling
                    DQX.stopProcessing();
                }
            });
        }


        return DataFetcherFile;
    });    
    

