/*
* dragndrop
* version: 1.0.0 (05/13/2009)
* @ jQuery v1.2.*
*
* Licensed under the GPL:
*   http://gplv3.fsf.org
*
* Copyright 2008, 2009 Jericho [ thisnamemeansnothing[at]gmail.com ] 
*  usage:
*  
*/

/*
function getCss (el,key) {
var v = parseInt(el.css(key));
if (isNaN(v))
return false;
return v;
}

function OnDragMouseMove(e) {
var dragData = e.data.dragData;
var target = dragData.target;
target.css({
left: dragData.left + e.pageX - dragData.offLeft,
top: dragData.top + e.pageY - dragData.offTop
});
return false;
}

function OnDragMouseUp(e) {
var dragData = e.data.dragData;
dragData.target.css(dragData.oldCss);
dragData.handler.css('cursor', dragData.oldCss.cursor);
$(document).unbind('mousemove', OnDragMouseMove)
$(document).unbind('mouseup', OnDragMouseUp);
}


function OnDragMouseDown(ev) {

var targetid = $(ev.target).attr('id');
var ID = targetid.split('Handler')[0];
if (ID.length > 0) {
var target = $('#' + ID);
var handler = $('#' + ID + "Handler")

var oldCss = {};
target.position(oldCss);

var dragData = {
left: oldCss.left || getCss(target, 'left') || 0,
top: oldCss.top || getCss(target, 'top') || 0,
width: target.width() || getCss(target, 'width'),
height: target.height() || getCss(target, 'height'),
offLeft: ev.pageX,
offTop: ev.pageY,
oldCss: oldCss,
handler: handler,
target: target
}

$(document).bind('mousemove', { dragData: dragData }, OnDragMouseMove)
$(document).bind('mouseup', { dragData: dragData }, OnDragMouseUp);
}
}

function MakeDrag(ID) {
$('#' + ID).mousedown(OnDragMouseDown);
}
*/

FloatMaxZindex = 99;

//(function($) {
$.extend($.fn, {
    getCss: function (key) {
        var v = parseInt(this.css(key));
        if (isNaN(v))
            return false;
        return v;
    }
});
$.fn.Drags = function (opts) {
    var ps = $.extend({
        zIndex: 20,
        opacity: .5,
        handler: null,
        onMove: function () { },
        onDrop: function () { }
    }, opts);
    var dragndrop = {
        drag: function (e) {
            var dragData = e.data.dragData;
            dragData.target.css({
                left: dragData.left + e.pageX - dragData.offLeft,
                top: dragData.top + e.pageY - dragData.offTop
            });
            //                dragData.handler.css({ cursor: 'move' });
            //                dragData.target.css({ cursor: 'move' });
            dragData.onMove(e);
            return false;
        },
        drop: function (e) {
            var dragData = e.data.dragData;
            dragData.target.css(dragData.oldCss); //.css({ 'opacity': '' });
            dragData.handler.css('cursor', dragData.oldCss.cursor);
            dragData.onDrop(e);
            $(document).unbind('mousemove', dragndrop.drag)
            $(document).unbind('mouseup', dragndrop.drop);
        }
    }
    return this.each(function () {
        var me = this;
        var handler = $('#' + opts.ID + "Handler"); //<= own modification
        handler.bind('mousedown', { e: me }, function (s) {
            var target = $(s.data.e);
            var oldCss = {};
            if (target.css('position') != 'absolute') {
                try {
                    target.position(oldCss);
                } catch (ex) { }
                target.css('position', 'absolute');
            }
            //oldCss.cursor = target.css('cursor') || 'default';
            oldCss.cursor = 'move';
            oldCss.opacity = target.getCss('opacity') || 1;
            var dragData = {
                left: oldCss.left || target.getCss('left') || 0,
                top: oldCss.top || target.getCss('top') || 0,
                width: target.width() || target.getCss('width'),
                height: target.height() || target.getCss('height'),
                offLeft: s.pageX,
                offTop: s.pageY,
                oldCss: oldCss,
                onMove: ps.onMove,
                onDrop: ps.onDrop,
                handler: handler,
                target: target
            }
            target.css('opacity', ps.opacity);
            target.css('cursor', 'move');
            $(document).bind('mousemove', { dragData: dragData }, dragndrop.drag)
            $(document).bind('mouseup', { dragData: dragData }, dragndrop.drop);

            FloatMaxZindex++;
            $('#' + opts.ID).css('z-index', FloatMaxZindex);

            return false;
        });
    });
}
//})(jQuery);


function MakeDrag(ID) {
    $('#' + ID).Drags({
        ID: ID,
        handler: '.handler',
        onMove: function (e) {
            //$('.content').html('current pos:(Left:' + e.pageX + ' ,Top:' + e.pageY + ')');
        },
        onDrop: function (e) {
            //$('.content').html('box dropped! <br />current pos:(Left:<strong>' + e.pageX + '</strong> ,Top:<strong>' + e.pageY + '</strong>)');
        }
    });
    FloatMaxZindex++;
    $('#' + ID).css('z-index', FloatMaxZindex);
}
