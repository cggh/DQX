

///////////////////////////////////////////////////////////////////////////////////////////////////
// The query builder class
///////////////////////////////////////////////////////////////////////////////////////////////////
// iDivID = the id of the div that serves as a container for the htnl elements

DQX.QueryBuilder = function (iDivID) {
    if (!(this instanceof arguments.callee)) throw "Should be called as constructor!";

    DQX.ObjectMapper.Add(this);
    this.myDivID = iDivID;
    this.myColumns = []; //list of DQX.SQL.TableColInfo objects
    this.bSepX = 20;
    this.spacerH1 = 20; // 30;
    this.spacerH2 = 15; // 20;
    this.borderSize = 0;
    this._globalcontentnr = 10;
    this._compid = 0;

    this.notifyModified = function () { } //attach another function here to get notification whenever the query was changed

    if ($('#' + this.myDivID).length == 0)
        throw "Unable to find query builder div element " + this.myDivID;

    //create an individual statement
    //this is a wrapper object that contains a DQX.SQL.WhereClause - type thing
    this._createNewStatement = function (parent) {
        this._globalcontentnr++;
        var newcomp = {};
        newcomp.isCompound = false;
        newcomp.myOperator = DQX.SQL.WhereClause.CompareFixed(this.myColumns[0].ID, "=", "");
        parent.myComponents.push(newcomp);
    }

    //create an OR branch
    this._createCompOR = function () {
        var comp = {};
        comp.isCompound = true;
        comp.Tpe = "OR";
        comp.myComponents = [];
        return comp;
    }

    //create an AND branch
    this._createCompAND = function () {
        var comp = {};
        comp.isCompound = true;
        comp.Tpe = "AND";
        comp.myComponents = [];
        return comp;
    }

    //the one and only root element
    //The query is maintained as a tree from this root
    this.root = this._createCompAND();

    //adds a new column definition to the query tool. this should be of type DQX.SQL.TableColInfo
    this.addTableColumn = function (icolinfo) {
        this.myColumns.push(icolinfo);
    }

    //determines if a column with a specific id is present
    this.hasColumn = function (icolid) {
        for (var i in this.myColumns)
            if (this.myColumns[i].ID == icolid)
                return true;
        return false;
    }

    //returns a column by id
    this.getColumn = function (icolid) {
        for (var i in this.myColumns)
            if (this.myColumns[i].ID == icolid)
                return this.myColumns[i];
        throw "Invalid column id " + icolid;
    }


    //Internal function: this removes all unnecessary items from the tree
    this._cleanUp = function (comp) {
        var modified = false;
        if (comp.isCompound) {
            for (var compnr in comp.myComponents) {
                if (this._cleanUp(comp.myComponents[compnr]))
                    modified = true;
            }
            var compnr = 0;
            while (compnr < comp.myComponents.length) {
                var trycomp = comp.myComponents[compnr];
                var todelete = false;
                if (trycomp.isCompound) {
                    if (trycomp.Tpe == comp.Tpe) {
                        for (var subcompnr in trycomp.myComponents)
                            comp.myComponents.splice(compnr + 1 + subcompnr, 0, trycomp.myComponents[subcompnr]);
                        trycomp.myComponents = [];
                        modified = true;
                    }
                    if (trycomp.myComponents.length == 0) {
                        todelete = true;
                        modified = true;
                    }
                    if (trycomp.myComponents.length == 1) {
                        comp.myComponents[compnr] = trycomp.myComponents[0];
                        modified = true;
                    }
                }
                if (todelete)
                    comp.myComponents.splice(compnr, 1);
                else
                    compnr++;
            }
        }
        return modified;
    }

    //Called when, for a a field comparison statement, the field control was modified
    this._ReactChangeField = function (id) {
        this._reRender(); //todo: optimise this by only building single statement?
        this.notifyModified();
    }

    //Called when, for a a field comparison statement, the comparison type control was modified
    this._ReactChangeCompType = function (id) {
        this._reRender(); //todo: optimise this by only building single statement?
        this.notifyModified();
    }

    //Called when, for a a field comparison statement, a content control was modified
    this._ReactStatementModified = function (id) {
        this.notifyModified();
    }

    //Called when a statement should be deleted
    this._ReactDel = function (id) {
        if (compmap[id].myParent == null)
            throw "no parent";
        var parentcomp = compmap[id].myParent;
        var childid = -1;
        for (var i in parentcomp.myComponents)
            if (parentcomp.myComponents[i].ID == id)
                childid = i;
        if (childid < 0) throw "???";
        parentcomp.myComponents.splice(childid, 1);
        this._reRender();
        this.notifyModified();
    }

    //Add a new components in an existing and chain
    this._ReactAddAnd = function (id) {
        this._createNewStatement(compmap[id]);
        this._reRender();
        this.notifyModified();
    }

    //Add a nw component in an existing or chain
    this._ReactAddOr = function (id) {
        this._createNewStatement(compmap[id]);
        this._reRender();
        this.notifyModified();
    }

    //Create a new or chain at the point of an individual statement
    this._ReactCreateOr = function (id) {
        var parentcomp = compmap[id].myParent;
        var childid = -1;
        for (var i in parentcomp.myComponents)
            if (parentcomp.myComponents[i].ID == id)
                childid = i;
        if (childid < 0) throw "???";
        var orcomp = this._createCompOR();
        parentcomp.myComponents[childid] = orcomp;
        orcomp.myComponents.push(compmap[id]);
        this._createNewStatement(orcomp);
        this._reRender();
        this.notifyModified();
    }

    //Create new or chain at the root of the query
    this._ReactCreateRootOr = function () {
        var oldroot = this.root;
        this.root = this._createCompAND();
        var orcomp = this._createCompOR();
        this.root.myComponents.push(orcomp);
        orcomp.myComponents.push(oldroot);
        this._createNewStatement(orcomp);
        this._reRender();
        this.notifyModified();
    }


    //Create a new and chain at the point of an individual statement
    this._ReactCreateAnd = function (id) {
        var parentcomp = compmap[id].myParent;
        var childid = -1;
        for (var i in parentcomp.myComponents)
            if (parentcomp.myComponents[i].ID == id)
                childid = i;
        if (childid < 0) throw "???";
        var orcomp = this._createCompAND();
        parentcomp.myComponents[childid] = orcomp;
        orcomp.myComponents.push(compmap[id]);
        this._createNewStatement(orcomp);
        this._reRender();
        this.notifyModified();
    }

    this._ReactUpdateQuery = function (id) {
        this.updateQuery();
    }


    //Calculates the minimum required horizontal space for a component
    this._calcMinSizeX = function (comp) {
        if (comp.isCompound) {
            if (comp.Tpe == 'AND') {
                var minsizex = 0;
                for (var compnr in comp.myComponents) {
                    this._calcMinSizeX(comp.myComponents[compnr]);
                    minsizex = Math.max(minsizex, comp.myComponents[compnr].MinSizeX);
                }
                comp.MinSizeX = minsizex;
            }
            if (comp.Tpe == 'OR') {
                var minsizex = 0;
                for (var compnr in comp.myComponents) {
                    this._calcMinSizeX(comp.myComponents[compnr]);
                    minsizex += comp.myComponents[compnr].MinSizeX;
                }
                comp.MinSizeX = minsizex + (comp.myComponents.length - 1) * this.bSepX;
            }
        }
        else {
            comp.MinSizeX = 200;
        }
    }

    //determines the actual horizontal size of a component, adapting to the given available siwe
    this._calcSizeX = function (comp, availsizex) {
        if (comp.isCompound) {
            if (comp.Tpe == 'AND') {
                for (var compnr in comp.myComponents)
                    this._calcSizeX(comp.myComponents[compnr], availsizex);
                comp.sizeX = availsizex;
            }
            if (comp.Tpe == 'OR') {
                var extrasizex = availsizex - (comp.myComponents.length - 1) * this.bSepX;
                for (var compnr in comp.myComponents)
                    extrasizex -= comp.myComponents[compnr].MinSizeX;
                extrasizex = Math.floor(extrasizex / comp.myComponents.length);
                for (var compnr in comp.myComponents) {
                    this._calcSizeX(comp.myComponents[compnr], comp.myComponents[compnr].MinSizeX + extrasizex);
                }
                comp.sizeX = availsizex;
            }
        }
        else {
            comp.sizeX = availsizex;
        }
    }

    //creates a string literal that calls a react calback function
    this._createReactFunctionString = function (itype, iid) {
        return DQX.ObjectMapper.CreateCallBackFunctionString(this, itype, iid);
    }

    //or blocks get a color variation to stand them out more. this calculates the color based on the level of nested or's
    this._createBlockColor = function (level) {
        return DQX.parseColorString($('#' + this.myDivID).css("background-color"), DQX.Color(0.9, 0.9, 0.9)).lighten(0.1 * level);
    }

    //returns the identifier for a control in an individual statement
    this.getControlID = function (statementID, aspect) {
        return "DQXQbldStmnt" + this.myDivID + statementID + aspect;
    }

    //adds some extra required stuff around every control that appears in an query statement
    this.decorateQueryStatementControl = function (ctrl, ID) {
        ctrl.setOnChange(this._createReactFunctionString('_ReactStatementModified', ID));
        ctrl.setOnKeyUp(this._createReactFunctionString('_ReactStatementModified', ID));
    }





    //render an individual comparison statement
    //theComponentStatement= query statement, containing a  DQX.SQL.WhereClause - thing
    //theComponentElement= html element to render it in
    this._buildStatement = function (theComponentStatement, theComponentElement) {
        var myOperator = theComponentStatement.myOperator; //the DQX.SQL.WhereClause - thing
        var sizex = theComponentStatement.sizeX;
        var addor = (theComponentStatement.myParent.Tpe != 'OR');
        var addand = (theComponentStatement.myParent.Tpe != 'AND');
        theComponentElement.setCssClass('DQXQBQuerybox');
        theComponentElement.addStyle('float', 'left');
        theComponentElement.setWidthPx(sizex - 2 * this.borderSize);
        theComponentElement.addStyle('position', 'relative');

        var elem0 = DQX.DocEl.Div({ parent: theComponentElement });
        elem0.addStyle('text-align', 'center').addStyle('padding-top', '10px').addStyle('padding-bottom', '10px').addStyle('padding-left', '8px').addStyle('padding-right', '8px');

        var elem = DQX.DocEl.Span({ parent: elem0 });

        elem.addElem(" ");

        var thecols = [];
        for (var colnr in this.myColumns) {
            thecols.push({ id: this.myColumns[colnr].ID, name: this.myColumns[colnr].name });
        }
        var fieldlist = DQX.DocEl.Select(thecols, myOperator.ColName);
        fieldlist.setID(this.getControlID(theComponentStatement.ID, "Field"));
        fieldlist.setWidthPx(150);
        fieldlist.setCssClass('DQXQBQueryboxControl');
        fieldlist.SetChangeEvent(this._createReactFunctionString('_ReactChangeField', theComponentStatement.ID));
        elem.addElem(fieldlist);

        elem.addElem(" ");

        var compatops = DQX.SQL.WhereClause.getCompatibleFieldComparisonOperators(this.getColumn(myOperator.ColName).datatype);
        var cmpselectlist = [];
        var foundinlist = false;
        for (var operatornr in compatops) {
            var op = compatops[operatornr];
            cmpselectlist.push({ id: op.ID, name: op.name });
            if (myOperator.Tpe == op.ID) foundinlist = true;
        }
        if (!foundinlist) {
            myOperator.Tpe = cmpselectlist[0].id;
            this._needRebuild = true;
        }
        var comptype = DQX.DocEl.Select(cmpselectlist, myOperator.Tpe);
        comptype.setID(this.getControlID(theComponentStatement.ID, "Type"));
        comptype.setWidthPx(150);
        comptype.setCssClass('DQXQBQueryboxControl');
        comptype.SetChangeEvent(this._createReactFunctionString('_ReactChangeCompType', theComponentStatement.ID));
        elem.addElem(comptype);

        elem.addElem(" ");

        myOperator._buildStatement(theComponentStatement.ID, elem, this);

        var subel = DQX.DocEl.JavaScriptBitmaplinkTransparent("Bitmaps/close.png", "Delete this condition", this._createReactFunctionString('_ReactDel', theComponentStatement.ID));
        subel.addStyle('position', 'absolute');
        subel.addStyle('left', '-8px');
        subel.addStyle('top', '-12px');
        elem0.addElem(subel);

        if (addor) {
            var subel = DQX.DocEl.JavaScriptBitmaplinkTransparent("Bitmaps/addright.png", "Create an alternative condition (OR)", this._createReactFunctionString('_ReactCreateOr', theComponentStatement.ID));
            subel.addStyle('position', 'absolute');
            subel.addStyle('right', '-10px');
            subel.addStyle('top', '-14px');
            elem0.addElem(subel);
        }
        if (addand) {
            var subel = DQX.DocEl.JavaScriptBitmaplinkTransparent("Bitmaps/adddown.png", "Create an extra condition (AND)", this._createReactFunctionString('_ReactCreateAnd', theComponentStatement.ID))
            subel.addStyle('position', 'absolute');
            subel.addStyle('left', (sizex / 2 + 8) + 'px');
            subel.addStyle('bottom', '-16px');
            elem0.addElem(subel);
        }
    }

    this._buildElement = function (theQueryComponent, theQueryParentComponent, orlevel) {
        var sizex = theQueryComponent.sizeX;
        theQueryComponent.myParent = theQueryParentComponent;
        this._compid++;
        var mycompid = this._compid;
        var theComponentElement = DQX.DocEl.Div();
        theQueryComponent.ID = this._compid;
        compmap[this._compid] = theQueryComponent;
        theComponentElement.addAttribute('id', this.getControlID(theQueryComponent.ID, ''));
        theComponentElement.addStyle('float', 'left');
        theComponentElement.setWidthPx(sizex);
        theComponentElement.setBackgroundColor(this._createBlockColor(orlevel));

        if (theQueryComponent.isCompound) {

            if (theQueryComponent.Tpe == 'AND') {
                theComponentElement.addStyle('background-image', 'url(Bitmaps/arrowdown.png)');
                theComponentElement.addStyle('background-position', 'center');
                theComponentElement.addStyle('background-repeat', 'repeat-y');
                theComponentElement.addStyle('position', 'relative');
                for (var compnr in theQueryComponent.myComponents) {
                    var needspacer = (compnr > 0); // && (compnr < theQueryComponent.myComponents.length-1);
                    if (needspacer) {
                        var spacer = DQX.DocEl.Div();
                        spacer.addStyle('float', 'left');
                        spacer.setWidthPx(sizex);
                        spacer.setHeightPx(this.spacerH1);
                        theComponentElement.addElem(spacer);
                    }
                    var subcomp = this._buildElement(theQueryComponent.myComponents[compnr], theQueryComponent, orlevel);
                    theComponentElement.addElem(subcomp);
                }

                //create the "add" button
                var subel = DQX.DocEl.JavaScriptBitmaplinkTransparent("Bitmaps/adddown.png", "Create an extra condition (AND)", this._createReactFunctionString('_ReactAddAnd', mycompid));
                subel.addStyle('position', 'absolute');
                subel.addStyle('left', (sizex / 2 + 10) + 'px');
                subel.addStyle('bottom', '-16px');
                theComponentElement.addElem(subel);
            }


            if (theQueryComponent.Tpe == 'OR') {
                orlevel++;
                var subsize = (sizex - (theQueryComponent.myComponents.length - 1) * DQX.QueryBuilder.bSepX) / theQueryComponent.myComponents.length - 2;
                var subcomps = [];
                for (var compnr in theQueryComponent.myComponents) {
                    var subcomp = this._buildElement(theQueryComponent.myComponents[compnr], theQueryComponent, orlevel)
                    subcomps.push(subcomp);
                }

                //start point
                var spacer = DQX.DocEl.Div();
                spacer.addStyle('float', 'left');
                spacer.setWidthPx(sizex);
                spacer.setHeightPx(15);
                spacer.setBackgroundColor('rgb(140,140,140)');
                spacer.addStyle('text-align', 'center');
                spacer.addStyle('position', 'relative');
                spacer.addStyle('border-top-left-radius', '15px');
                spacer.addStyle('border-top-right-radius', '15px');
                spacer.addElem("Alternative paths (OR)")
                var subel = DQX.DocEl.JavaScriptBitmaplinkTransparent("Bitmaps/addright.png", "Add another alternative condition (OR)", this._createReactFunctionString('_ReactAddOr', mycompid));
                subel.addStyle('position', 'absolute');
                subel.addStyle('right', '15px');
                subel.addStyle('top', '-8px');
                spacer.addElem(subel);
                theComponentElement.addElem(spacer);

                var subcompcontainer = DQX.DocEl.Div();
                subcompcontainer.setBackgroundColor(this._createBlockColor(orlevel));
                subcompcontainer.addStyle('float', 'left');
                subcompcontainer.setCssClass('DQXOrContainer'); //###

                for (compnr in subcomps) {
                    if (compnr > 0) {
                        var spacer = DQX.DocEl.Div();
                        spacer.addStyle('float', 'left');
                        spacer.setHeightPx(3);
                        spacer.setWidthPx(this.bSepX);
                        subcompcontainer.addElem(spacer);
                    }

                    var subcompholder = DQX.DocEl.Div();

                    subcompholder.addStyle('float', 'left');
                    subcompholder.addStyle('height', '100%');
                    subcompholder.addStyle('background-image', 'url(Bitmaps/arrowdown.png)');
                    subcompholder.addStyle('background-position', 'center');
                    subcompholder.addStyle('background-repeat', 'repeat-y');
                    subcompholder.addStyle('padding-top', this.spacerH2 + 'px');
                    subcompholder.addStyle('padding-bottom', this.spacerH2 + 'px');

                    subcompholder.addElem(subcomps[compnr]);
                    subcompcontainer.addElem(subcompholder);
                }

                theComponentElement.addElem(subcompcontainer);

                //end point
                var spacer = DQX.DocEl.Div();
                spacer.addStyle('float', 'left');
                spacer.setWidthPx(sizex);
                spacer.setHeightPx(15);
                spacer.setBackgroundColor('rgb(140,140,140)');
                spacer.addStyle('border-bottom-left-radius', '15px');
                spacer.addStyle('border-bottom-right-radius', '15px');
                theComponentElement.addElem(spacer);
            }

        }
        else
            this._buildStatement(theQueryComponent, theComponentElement);

        return theComponentElement;
    }


    this.render = function () {
        this._compid = 0;
        compmap = {};
        while (this._cleanUp(this.root));

        var sizex = $('#' + this.myDivID).width() - 30;

        if (sizex <= 1) sizex = 600; //an elementary safety measure to avoid silly things if this is rendered to an invisible component

        this._calcMinSizeX(this.root);
        if (this.root.MinSizeX < sizex) {
            this.root.MinSizeX = sizex;
        }
        sizex = this.root.MinSizeX;
        this._calcSizeX(this.root, this.root.MinSizeX);


        var container = DQX.DocEl.Div();
        container.addStyle('float', 'left');
        container.setWidthPx(sizex);

        var createstartendpoint = function (txt) {
            var spacer = DQX.DocEl.Div();
            spacer.addStyle('position', 'relative');
            spacer.addStyle('float', 'left');
            spacer.addStyle('text-align', 'center');
            spacer.setWidthPx(sizex);
            spacerel = DQX.DocEl.Span({ parent: spacer });
            spacerel.setBackgroundColor(DQX.Color(0.5, 0.5, 0.5));
            spacerel.setColor(DQX.Color(0.9, 0.9, 0.9));
            spacerel.addStyle('border-radius', '18px');
            spacerel.addStyle('text-align', 'center');
            spacerel.addStyle('padding-top', '10px');
            spacerel.addStyle('padding-bottom', '10px');
            spacerel.addStyle('display', 'block');
            spacerel.addStyle('font-weight', 'bold');
            spacerel.addStyle('font-size', '9pt');
            spacerel.addElem(txt);
            spacerel.addStyle('margin-left', 'auto');
            spacerel.addStyle('margin-right', 'auto');
            spacerel.addStyle('position', 'relative');
            spacerel.addStyle('color', 'rgb(200,230,255)');
            spacerel.setHeightPx(16);
            spacerel.setWidthPx(230);
            return spacer;
        }

        {//start point
            var spacer = createstartendpoint('Full data set');
            var addor = this.root.myComponents.length > 1;
            if (addor) {
                var subel = DQX.DocEl.JavaScriptBitmaplinkTransparent("Bitmaps/addright.png", "Create an alternative condition (OR)", this._createReactFunctionString('_ReactCreateRootOr', -1));
                subel.addStyle('position', 'absolute');
                subel.addStyle('right', '-12px');
                subel.addStyle('top', '5px');
                spacer.getElem(0).addElem(subel);
            }
            container.addElem(spacer);


        }
        {//spacer with arrow
            var spacer = DQX.DocEl.Div();
            spacer.addStyle('background-image', 'url(Bitmaps/arrowdown.png)');
            spacer.addStyle('background-position', 'center');
            spacer.addStyle('background-repeat', 'repeat-y');
            spacer.addStyle('float', 'left');
            spacer.setWidthPx(sizex);
            spacer.setHeightPx(this.spacerH1);
            container.addElem(spacer);
        }

        //the actual query
        container.addElem(this._buildElement(this.root, null, 0));

        {//spacer with arrow
            var spacer = DQX.DocEl.Div();
            spacer.addStyle('background-image', 'url(Bitmaps/arrowdown.png)');
            spacer.addStyle('background-position', 'center');
            spacer.addStyle('background-repeat', 'repeat-y');
            spacer.addStyle('float', 'left');
            spacer.setWidthPx(sizex);
            spacer.setHeightPx(this.spacerH1);
            container.addElem(spacer);
        }

        var spacer = createstartendpoint('Filtered data set');
        spacerel.addElem(DQX.DocEl.JavaScriptBitmaplinkTransparent("Bitmaps/addright.png", "Update query", this._createReactFunctionString('_ReactUpdateQuery', -1)));
        container.addElem(spacer);

        var rs = container.toString();


        $('#' + this.myDivID).html(rs);

        //Post pass: make sure that the columns in each OR block have the same height (so hat the down arrow is shown over the entire stretch)
        $('.DQXOrContainer').each(
            function (idx0, rootel) {
                var maxh = 1;
                $(rootel).children().each(
                    function (idx, el) {
                        maxh = Math.max(maxh, $(el).height());
                    }
                );
                $(rootel).children().each(
                    function (idx, el) {
                        $(el).height(maxh);
                    }
                );
            }
        );

    }

    //fetches the content of all comparison statements in a query component
    this._fetchStatementContent = function (theQueryComponent) {
        if (theQueryComponent.isCompound) {
            for (var compnr in theQueryComponent.myComponents) {
                this._fetchStatementContent(theQueryComponent.myComponents[compnr]);
            }
        }
        else {
            if ("ID" in theQueryComponent) {
                var mytype = $("#" + this.getControlID(theQueryComponent.ID, "Type")).val();
                theQueryComponent.myOperator = DQX.SQL.WhereClause.getFieldComparisonOperatorInfo(mytype).Create();
                theQueryComponent.myOperator.ColName = $("#" + this.getControlID(theQueryComponent.ID, "Field")).val();
                theQueryComponent.myOperator._fetchStatementContent(theQueryComponent.ID, this);
            }
        }
    }

    //Forces a recreation of the UI
    this._reRender = function () {
        this._needRebuild = false;
        //we first fetch the current status of the content
        this._fetchStatementContent(this.root);
        this.render();
        if (this._needRebuild) {
            this._fetchStatementContent(this.root);
            this.render();
        }
    }

    //returns a DQX.SQL.WhereClause - thing for a query component
    this._extractQueryContent = function (theQueryComponent) {
        if (theQueryComponent.isCompound) {
            var rs = DQX.SQL.WhereClause.Compound(theQueryComponent.Tpe);
            for (var compnr in theQueryComponent.myComponents)
                rs.addComponent(this._extractQueryContent(theQueryComponent.myComponents[compnr]));
            return rs;
        }
        else {
            return theQueryComponent.myOperator;
        }
    }

    //returns the query defined by this builder, as a class tree defined with DQX.SQL.WhereClause things
    this.getQuery = function () {
        this._fetchStatementContent(this.root);
        if (this.root.myComponents.length == 0)
            return DQX.SQL.WhereClause.Trivial();
        return this._extractQueryContent(this.root);
    }
}




//////////////////////////////////////////////////////////////////////////////////////////
// Interactive query builder GUI component
//////////////////////////////////////////////////////////////////////////////////////////

DQX.Gui.QueryBuilder = function (iid, args) {
    var that = DQX.Gui.GuiComponent(iid, args);

    that.myBuilder = new DQX.QueryBuilder(iid);

    that.onResize = function () {
        this.myBuilder._reRender();
    }

    return that;
}
