define(["DQX/Utils], 
    function (DQX) {
    var SVG = {};
    
    SVG.PieChart = function () {
        var that = {};
        that.myCallbackObject = null;
        that.myParts = [];
    
        that.addPart = function (ifrac, icolor, iid) {
            that.myParts.push({ frac: ifrac, color: icolor, id: iid });
        }
    
        that.render = function (x0, y0, rd) {
    
            var sum = 0;
            for (var i = 0; i < this.myParts.length; i++) sum += this.myParts[i].frac;
            if (sum <= 0) return;
            var sumpart = 0;
            var data = '<g>';
    
            for (var i = 0; i < this.myParts.length; i++) {
                var sumpart2 = sumpart + this.myParts[i].frac;
                data += this._renderPie(x0, y0,
                    sumpart / sum * 2 * Math.PI,
                    sumpart2 / sum * 2 * Math.PI, rd - 1,
                    this.myParts[i].color, i);
                sumpart = sumpart2;
            }
            data += '</g>';
            return data;
        }
    
        that._renderPie = function (x0, y0, ang1, ang2, rd, color, id) {
            var rs = '<path class="piepart" d="';
            var stx0 = x0.toFixed(1);
            var sty0 = y0.toFixed(1);
            var strd = rd.toFixed(1);
            var stpx1 = (x0 + rd * Math.cos(ang1)).toFixed(1);
            var stpy1 = (y0 + rd * Math.sin(ang1)).toFixed(1);
            var stpx2 = (x0 + rd * Math.cos(ang2)).toFixed(1);
            var stpy2 = (y0 + rd * Math.sin(ang2)).toFixed(1);
            var lenflag = ((ang2 - ang1) > Math.PI) ? 1 : 0;
            rs += 'M' + stx0 + ',' + sty0 + ' ';
            rs += 'L' + stpx1 + ',' + stpy1 + ' ';
            rs += 'A' + strd + ',' + strd + ' 0 ' + lenflag + ',1 ' + stpx2 + ',' + stpy2 + ' ';
            rs += 'Z" style="fill:' + color.toString() + '; "';
    
            if (this.myCallbackObject)
                rs += 'onclick="{fn}"'.DQXformat({ fn: DQX.ObjectMapper.CreateCallBackFunctionString(this.myCallbackObject, 'pieClick', id) });
    
            rs += '/>';
            return rs;
        }
    
    
        return that;
    }
    return SVG;
    });


