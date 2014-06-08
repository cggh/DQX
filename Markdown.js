// This file is part of DQX - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
// This program is free software licensed under the GNU Affero General Public License.
// You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

define(["DQX/lib/markdown"],
    function (markdown) {
        return function(markdown_text) {
            return markdown.toHTML(markdown_text);
        }
    });
