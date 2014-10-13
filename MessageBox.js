// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

/************************************************************************************************************************************
 *************************************************************************************************************************************


 *************************************************************************************************************************************
 *************************************************************************************************************************************/

define(["jquery", "DQX/Utils", "DQX/DocEl", "DQX/Msg", "DQX/Controls", "DQX/Popup" ],
    function ($, DQX, DocEl, Msg, Controls, Popup) {
        var MessageBox = {};


        MessageBox.confirmationBox = function(content, onConfirm) {
            var str = '<div style="padding:10px;min-width: 330px">';
            str += '<span class="fa fa-question-circle" style="font-size: 36px; color:rgb(150,150,150);float:left;padding-right:10px;padding-bottom:10px"></span>'
            str += content;
            str += '<p>';
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon: 'fa-check', content: 'OK', width:100, height:35 }).setOnChanged(function() {
                Popup.closeIfNeeded(popupid);
                if (onConfirm)
                    onConfirm();
            });
            str += bt.renderHtml();
            str += '&nbsp;&nbsp;';
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon: 'fa-close', content: 'Cancel', width:100, height:35 }).setOnChanged(function() {
                Popup.closeIfNeeded(popupid);
            });
            str += bt.renderHtml();
            str += '</div>';
            var popupid = Popup.create('Confirmation', str, null, {canClose: false});
        }

        MessageBox.errorBox = function(title, content) {
            var str = '<div style="padding:10px">';
            str += '<span class="fa fa-exclamation-triangle" style="font-size: 36px; color:rgb(150,0,0);float:left;padding-right:10px;padding-bottom:10px"></span>'
            str += content;
            str += '<p>';
            var bt = Controls.Button(null, { buttonClass: 'DQXToolButton2', icon: 'fa-close', content: 'Close', width:120, height:35 }).setOnChanged(function() {
                Popup.closeIfNeeded(popupid);
            });
            str += bt.renderHtml();
            str += '</div>';
            var popupid = Popup.create(title, str, null, {canClose: false});
        }


        return MessageBox;
    });
