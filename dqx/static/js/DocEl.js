define( 
    function () {
    
    var DocEl = {};
    
    //The base class for each document element. We use prototypes here, because we don't want to duplicate functions for each instance
    DocEl._Element = function (itype, args) {
        this.myType = itype;
        this.myAttributes = {};
        this.myStyles = {};
        this.myComponents = [];
    
        //do the stuff with the arguments provided
        if (typeof args != 'undefined') {
            if ('id' in args) this.setID(args.id);
            if ('parent' in args) args.parent.addElem(this);
        }
    }
    
    DocEl._Element.prototype.setID = function (iID) {
        this.addAttribute("id", iID);
    }
    
    
    DocEl._Element.prototype.addAttribute = function (id, content) {
        this.myAttributes[id] = '' + content;
        return this;
    }
    
    DocEl._Element.prototype.addStyle = function (id, content) {
        this.myStyles[id] = '' + content.toString();
        return this;
    }
    
    DocEl._Element.prototype.addElem = function (icomp) {
        this.myComponents.push(icomp);
        return this;
    }
    
    DocEl._Element.prototype.getElem = function (nr) {
        return this.myComponents[nr];
    }

    DocEl._Element.prototype.addHint = function (hint) {
        this.addAttribute('title', hint);
        return this;
    }

    
    DocEl._Element.prototype.setCssClass = function (iclss) {
        this.addAttribute('class', iclss);
        return this;
    }
    
    DocEl._Element.prototype.setBackgroundColor = function (icol) {
        this.addStyle('background-color', icol);
        return this;
    }
    
    DocEl._Element.prototype.setColor = function (icol) {
        this.addStyle('color', icol);
        return this;
    }
    
    DocEl._Element.prototype.setWidthPx = function (isize) {
        this.addStyle('width', isize.toString() + 'px');
        return this;
    }
    
    DocEl._Element.prototype.setWidthPc = function (isize) {
        this.addStyle('width', isize.toString() + '%');
        return this;
    }
    
    DocEl._Element.prototype.setWidthFull = function () {
        this.addStyle('width', '100%');
        return this;
    }
    
    DocEl._Element.prototype.setHeightPx = function (isize) {
        this.addStyle('height', isize.toString() + 'px');
        return this;
    }
    
    DocEl._Element.prototype.setShadow = function (dx, dy, sz, col) {
        this.addStyle('box-shadow', dx.toString() + 'px ' + dy.toString() + 'px ' + sz.toString() + 'px ' + col.toString());
        return this;
    }
    
    DocEl._Element.prototype.makeFloatLeft = function () {
        this.addStyle("float", "left");
        return this;
    }
    
    DocEl._Element.prototype.setOnClick = function (st) {
        this.addAttribute("onclick", st);
    }
    
    DocEl._Element.prototype.setOnChange = function (st) {
        this.addAttribute("onchange", st);
    }
    
    DocEl._Element.prototype.setOnKeyUp = function (st) {
        this.addAttribute("onkeyup", st);
    }
    
    
    DocEl._Element.prototype.toString = function () {
        var rs = '<' + this.myType;
    
        for (id in this.myAttributes) {
            rs += ' ';
            rs += id + '="' + this.myAttributes[id] + '"';
            first = false;
        }
    
        if (true) {//todo? only if there are styles present?
            rs += ' style="';
            var first = true;
            for (id in this.myStyles) {
                if (!first) rs += ';';
                rs += id + ":" + this.myStyles[id];
                first = false;
            }
            rs += '"';
        }
        rs += '>';
    
        rs += this.CreateInnerHtml();
    
        rs += '</' + this.myType + '>';
        return rs;
    }
    
    DocEl._Element.prototype.CreateInnerHtml = function () {
        var rs = '';
        for (var compnr=0; compnr<this.myComponents.length; compnr++) {
            rs += this.myComponents[compnr].toString();
        }
        return rs;
    }
    
    
    
    DocEl.Create = function (itype, args) {
        var that = new DocEl._Element(itype,args);
        return that;
    }
    
    
    DocEl.Span = function (args) {
        var that = DocEl.Create("span",args);
        return that;
    }
    
    
    DocEl.Div = function (args) {
        var that = DocEl.Create("div",args);
        return that;
    }
    
    
    DocEl.Select = function (optionlist, selectedvalue,args) {
        var that = DocEl.Create("select",args);
    
        var content = "";
        for (var optnr in optionlist) {
            if (!('id' in optionlist[optnr])) throw "Select option list should have id properties";
            if (!('name' in optionlist[optnr])) throw "Select option list should have name properties";
            content += '<option value="' + optionlist[optnr].id + '"';
            if (selectedvalue == optionlist[optnr].id)
                content += 'selected="selected"';
            content += '>' + optionlist[optnr].name + '</option>';
        }
        that.addElem(content);
    
        that.SetChangeEvent = function (eventhandlerstr) {
            this.addAttribute("onchange", eventhandlerstr);
        }
    
        return that;
    }
    
    
    DocEl.Edit = function(content,args) {
        var that = DocEl.Create("input",args);
        that.addAttribute("type", 'text');
        that.addAttribute("value", content);
        return that;
    }
    
    DocEl.Check = function (args) {
        var that = DocEl.Create("input",args);
        that.addAttribute("type", 'checkbox');
        return that;
    }
    
    DocEl.Label = function (args) {
        var that = DocEl.Create("label", args);
        if ('target' in args)
            that.addAttribute("for", args.target);
        return that;
    }
    
    
    DocEl.JavaScriptlink = function(content, functionstr,args) {
        var that = DocEl.Create("a",args);
        that.addAttribute("href", "javascript:void(0)");
        that.addAttribute("onclick", functionstr);
        that.addElem(content);
        return that;
    }
    
    DocEl.JavaScriptBitmaplinkTransparent = function (imagefile, description, functionstr,args) {
        return DocEl.JavaScriptlink('<IMG SRC="' + imagefile + '" border=0 class="DQXBitmapLinkTransparent" ALT="' + description + '" TITLE="' + description + '">', functionstr, args);
    }
    
    DocEl.JavaScriptBitmaplink = function (imagefile, description, functionstr, args) {
        return DocEl.JavaScriptlink('<IMG SRC="' + imagefile + '" border=0 class="DQXBitmapLink" ALT="' + description + '" TITLE="' + description + '">', functionstr, args);
    }

    
    DocEl.StyledText = function (content, styleclass) {
        var span = DocEl.Span();
        span.setCssClass(styleclass);
        span.addElem(content);
        return span;
    }
    return DocEl;
    });