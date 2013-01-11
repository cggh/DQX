define([DQXSCJQ(), DQXSC("SQL"), DQXSC("Utils"), , DQXSC("base64")],
    function ($, SQL, DQX, DataDecoders, Base64) {
        var DataFetcherFile = {}


        DataFetcherFile.getFile = function (serverUrl, filename, handler) {
            //prepare the url
            var myurl = DQX.Url(serverUrl);
            myurl.addUrlQueryItem("datatype", "getfile");
            myurl.addUrlQueryItem("name", filename);
            var urlstring = myurl.toString();
            $.ajax({
                url: urlstring,
                success: function (resp) {
                    var keylist = DQX.parseResponse(resp);
                    if ("Error" in keylist) {//!!!todo: some error handling
                        return;
                    }
                    handler(Base64.decode(keylist.content));
                },
                error: function (resp) {//!!!todo: some error handling
                    var q = 0;
                }
            });
        }


        return DataFetcherFile;
    });    
    

