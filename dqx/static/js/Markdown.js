define(["DQX/lib/markdown"],
    function (markdown) {
        return function(markdown_text) {
            return markdown.toHTML(markdown_text);
        }
    });
