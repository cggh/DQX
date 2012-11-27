define(["DQX/Framework", "DQX/HistoryManager", "DQX/DocEl", "GenomeBrowser"],
    function (Framework, HistoryManager, DocEl, GenomeBrowser) {
        var Page;
        var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

        Page = (function() {
            function Page() {

                this.METHOD = __bind(this.METHOD, this);

                this.frameRoot = Framework.FrameGroupVert('');
                this.frameRoot.myID = 'myroot';
                this.frameRoot.setMargins(0);
                this.frameGenome = this.frameRoot.addMemberFrame(Framework.FrameGroupHor('Genome', 1)).setMargins(10);
                this.genomeBrowser = new GenomeBrowser(this.frameGenome);
            }
            Page.prototype.METHOD = function() {
                //METHOD
                var a=1;
            };
            return Page;

        })();
        return Page;
    }
);
