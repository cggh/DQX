require(["jquery", "DQX/Framework", "DQX/Msg", "DQX/HistoryManager", "DQX/Utils", "Page"],
    function($,     Framework,       Msg,       HistoryManager,       DQX,         Page) {
        $(function () {
    
        //Global initialisation of utilities
        DQX.Init();
    
        var thePage = new Page();
    
        //Render frames
        Framework.render(thePage.frameRoot, 'Div1');
    
        //Create the panels
        //thePage.createPanels();
    
        //Some generic stuff after creation of the html
        DQX.initPostCreate();
        });
});
