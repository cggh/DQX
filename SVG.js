/************************************************************************************************************************************
*************************************************************************************************************************************



*************************************************************************************************************************************
*************************************************************************************************************************************/

define([DQXSC("Utils")],
    function (DQX) {
        var SVG = {};

        SVG.PieChart = function () {
            var that = {};
            that.myCallbackObject = null;
            that.myParts = [];

            that.addPart = function (ifrac, icolor, iid, ihint) {
                that.myParts.push({ frac: ifrac, color: icolor, id: iid, hint: ihint });
            }

            that.render = function (x0, y0, rd) {

                var sum = 0;
                for (var i = 0; i < this.myParts.length; i++) sum += this.myParts[i].frac;
                if (sum <= 0) return;
                var sumpart = 0;
                var data = '<g>';

                for (var i = 0; i < this.myParts.length; i++) {
                    var sumpart2 = sumpart + this.myParts[i].frac;
                    if (this.myParts[i].frac > 0) {
                        data += this._renderPie(x0, y0,
                            sumpart / sum * 2 * Math.PI,
                            sumpart2 / sum * 2 * Math.PI, rd - 1,
                            this.myParts[i].color, i, this.myParts[i].hint);
                        sumpart = sumpart2;
                    }
                }
                data += '</g>';
                return data;
            }

            that._renderPie = function (x0, y0, ang1, ang2, rd, color, id, hint) {
                if (ang2 - ang1 >= 2 * Math.PI - 0.0001) {
                    var rs = '<circle class="piepart" cx="{cx}" cy="{cy}" r="{rd}"'.DQXformat({ cx: x0, cy: y0, rd: rd });
                    var elemName = 'circle';
                }
                else {
                    var elemName = 'path';
                    var rs = '<path class="piepart" d="';
                    var stx0 = x0.toFixed(3);
                    var sty0 = y0.toFixed(3);
                    var strd = rd.toFixed(3);
                    var stpx1 = (x0 + rd * Math.cos(ang1)).toFixed(3);
                    var stpy1 = (y0 + rd * Math.sin(ang1)).toFixed(3);
                    var stpx2 = (x0 + rd * Math.cos(ang2)).toFixed(3);
                    var stpy2 = (y0 + rd * Math.sin(ang2)).toFixed(3);
                    var lenflag = ((ang2 - ang1) > Math.PI) ? 1 : 0;
                    rs += 'M' + stx0 + ',' + sty0 + ' ';
                    rs += 'L' + stpx1 + ',' + stpy1 + ' ';
                    rs += 'A' + strd + ',' + strd + ' 0 ' + lenflag + ',1 ' + stpx2 + ',' + stpy2 + ' ';
                    rs += 'Z"';
                }
                rs += ' style="fill:' + color.toString() + '; "';
                if (this.myCallbackObject)
                    rs += 'onclick="{fn}"'.DQXformat({ fn: DQX.ObjectMapper.CreateCallBackFunctionString(this.myCallbackObject, 'pieClick', id) });
                rs += '>';
                if (hint)
                    rs += "<title>"+hint+"</title>";
                rs += '</' + elemName + '>';
                return rs;
            }


            return that;
        };

        SVG.translate = function(selection, x, y) {
            selection.attr("transform", function(data, index) {
                return "translate(" + (DQX.functor(x)(data, index)) + "," + DQX.functor(y)(data, index) + ")";
            });
        };

        SVG.length = function(selection, attr, scale) {
            selection.attr(attr, function(data, index) {
                return scale(data[attr]) - scale(0);
            });
        };
        SVG.clamp_scale = function(scale, min, max) {
            var dom = scale.domain();
            if (dom[0] <= min && dom[1] >= max)
                scale.domain([min,max]);
            else {
                var dt = dom[1] - dom[0];
                if (dom[0] < min) {
                    dom[0] = min;
                    dom[1] = dom[0] + dt;
                    if (dom[1] > max)
                        dom[1] = max;
                }
                if (dom[1] > max) {
                    dom[1] = max;
                    dom[0] = dom[1] - dt;
                    if (dom[0] < min)
                        dom[0] = min;
                }
                scale.domain(dom);
            }
        };
        SVG.scale_min_width = function(scale, min_width) {
            var dom = scale.domain();
            var width = dom[1] - dom[0];
            if (width < min_width){
                dom[0] -= (min_width-width)/2;
                dom[1] += (min_width-width)/2;
                scale.domain(dom);
            }
        };
        SVG.scale_integer_step = function(scale) {
            var step = scale(1)-scale(0);
            var dom = scale.domain();
            var range = scale.range();
            if (step > 1) {
                step = Math.ceil(step);
                scale.range([range[0], range[0]+(step*(dom[1]-dom[0]))]);
            }
        };

        SVG.update_zoom = function(scale, zoom, min, max, canvas_left, canvas_right) {
            var dom = scale.domain();
            var new_scale = (max - min) / (dom[1] - dom[0]);
            var unmoved_scale = d3.scale.linear().domain([min, max]).range([canvas_left, canvas_right]);
            zoom.scale(new_scale).translate([canvas_left+(-unmoved_scale(dom[0])*new_scale),0]);
        };
        SVG.transition = function(selection, transition_time) {
            return (transition_time > 0 ? selection.transition().duration(transition_time) : selection)
        };
        SVG.hue_to_rgb = function(m1, m2, hue) {
            var v;
            if (hue < 0)
                hue += 1;
            else if (hue > 1)
                hue -= 1;

            if (6 * hue < 1)
                v = m1 + (m2 - m1) * hue * 6;
            else if (2 * hue < 1)
                v = m2;
            else if (3 * hue < 2)
                v = m1 + (m2 - m1) * (2/3 - hue) * 6;
            else
                v = m1;

            return 255 * v;
        }
        SVG.hsl_to_rgb = function(h, s, l) {
            var m1, m2, hue;
            var r, g, b;
            s /=100;
            l /= 100;
            if (s == 0)
                r = g = b = (l * 255);
            else {
                if (l <= 0.5)
                    m2 = l * (s + 1);
                else
                    m2 = l + s - l * s;
                m1 = l * 2 - m2;
                hue = h / 360;
                r = SVG.hue_to_rgb(m1, m2, hue + 1/3);
                g = SVG.hue_to_rgb(m1, m2, hue);
                b = SVG.hue_to_rgb(m1, m2, hue - 1/3);
            }
            return {r: r, g: g, b: b};
        };
        SVG.genotype_rgb = function(ref, alt, alt_color) {
            var tot, light, hue;
            if (alt_color == null) alt_color = false;
            tot = ref + alt;
            if (alt_color) {
                light = Math.max(100 - (tot * 2.5), 75);
            } else {
                light = Math.max(100 - (tot * 5), 50);
            }
            if (tot > 0) {
                if (alt_color) {
                    hue = Math.round(118 - ((alt / tot) * 65));
                } else {
                    hue = Math.round(231 + ((alt / tot) * 121));
                }
            } else {
                hue = 0;
            }
            return SVG.hsl_to_rgb(hue, 100, light);
        };

        var buffer = document.createElement('canvas');
        buffer.height = 1;
        var scaled_buffer = document.createElement('canvas');
        scaled_buffer.height = 1;
        SVG.data_uri_from_genotypes = function(genotypes) {
            if (genotypes.length > 0) {
                buffer.width = genotypes.length;
                var c = buffer.getContext('2d');
                var imageData = c.createImageData(buffer.width, buffer.height);
                var data = imageData.data;
                genotypes.forEach(function (genotype, i) {
                    var index = i*4;
                    var col = SVG.genotype_rgb(genotype.ref, genotype.alt);
                    data[index] = col.r;
                    data[index+1] = col.g;
                    data[index+2] = col.b;
                    data[index+3] = 255;

                });
                c.putImageData(imageData,0,0);
                //Now we have to scale everything up due to a chrome bug.... https://bugs.webkit.org/show_bug.cgi?id=40881
//                scaled_buffer.width = genotypes.length*50;
//                c = scaled_buffer.getContext('2d');
//                c.webkitImageSmoothingEnabled = false;
//                c.mozImageSmoothingEnabled = false;
//                c.scale(50,1);
//                c.drawImage(buffer, 0, 0);
                return buffer.toDataURL('image/png');
            } else {
                return "data:,"
            }

        };

        return SVG;
    });


