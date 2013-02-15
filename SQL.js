define([DQXSCJQ(), DQXSC("DocEl"), DQXSC("base64")],
    function ($, DocEl, Base64) {

        var SQL = {};


        //////////////////////////////////////////////////////////////////////////////////////
        // Encapsulates information about an SQL table column
        //////////////////////////////////////////////////////////////////////////////////////

        SQL.DataTypes = ['String', 'Float', 'Integer', 'MultiChoiceInt'];

        SQL.TableColInfo = function (iID, iname, idatatype, ichoicelist) {
            var that = {};
            that.ID = iID;
            that.name = iname;
            that.datatype = idatatype;
            that.choicelist = ichoicelist;

            //returns true if this column is of numerical type
            that.isNumerical = function () {
                return (this.datatype == "Float") || (this.datatype == "Integer");
            }

            //returns true of this column contains multiple choice values
            that.isMultipleCoice = function () {
                return (this.datatype == "MultiChoiceInt");
            }
            return that;
        }


        //////////////////////////////////////////////////////////////////////////////////////
        // A set of component classes that can be used to build an sql single table where clause
        // and encode it to an url-friendly string
        //////////////////////////////////////////////////////////////////////////////////////

        SQL.WhereClause = {};

        //A list of all comparison operators that act on a field
        SQL.WhereClause._fieldComparisonOperators = [
            { ID: '=', name: 'Equals',
                String: true, Float: true, Integer: true, MultiChoiceInt: true,
                Create: function () { return SQL.WhereClause.CompareFixed('', '=', '') }
            },
            { ID: '<>', name: 'Differs from',
                String: true, Float: true, Integer: true, MultiChoiceInt: true,
                Create: function () { return SQL.WhereClause.CompareFixed('', '<>', '') }
            },
            { ID: '<', name: '<',
                Float: true, Integer: true,
                Create: function () { return SQL.WhereClause.CompareFixed('', '<', '') }
            },
            { ID: '>', name: '>',
                Float: true, Integer: true,
                Create: function () { return SQL.WhereClause.CompareFixed('', '>', '') }
            },
            { ID: '<=', name: '<=',
                Float: true, Integer: true,
                Create: function () { return SQL.WhereClause.CompareFixed('', '<=', '') }
            },
            { ID: '>=', name: '>=',
                Float: true, Integer: true,
                Create: function () { return SQL.WhereClause.CompareFixed('', '>=', '') }
            },
            { ID: 'CONTAINS', name: 'Contains',
                String: true,
                Create: function () { return SQL.WhereClause.CompareFixed('', 'CONTAINS', '') }
            },
            { ID: 'NOTCONTAINS', name: 'Does not contain',
                String: true,
                Create: function () { return SQL.WhereClause.CompareFixed('', 'NOTCONTAINS', '') }
            },
            { ID: 'STARTSWITH', name: 'Starts with',
                String: true,
                Create: function () { return SQL.WhereClause.CompareFixed('', 'STARTSWITH', '') }
            },
            { ID: 'LIKE', name: 'Like',
                String: true,
                Create: function () { return SQL.WhereClause.CompareFixed('', 'LIKE', '') }
            },
            { ID: 'ISPRESENT', name: 'Is present', MultiChoiceInt: true,
                String: true, Float: true, Integer: true,
                Create: function () { return SQL.WhereClause.IsPresent() }
            },
            { ID: 'ISABSENT', name: 'Is absent', MultiChoiceInt: true,
                String: true, Float: true, Integer: true,
                Create: function () { return SQL.WhereClause.IsAbsent() }
            },
            { ID: '=FIELD', name: 'Equals field', MultiChoiceInt: true, //test the equality with another database field
                String: true, Float: true, Integer: true,
                Create: function () { return SQL.WhereClause.EqualsField() }
            },
            { ID: '<>FIELD', name: 'Differs from field', MultiChoiceInt: true, //test the difference with another database field
                String: true, Float: true, Integer: true,
                Create: function () { return SQL.WhereClause.DiffersField() }
            },
            { ID: '<FIELD', name: '< Field', //Performs a < operation with a linear function of another field
                Float: true, Integer: true,
                Create: function () { return SQL.WhereClause.CompareField('<FIELD') }
            },
            { ID: '>FIELD', name: '> Field', //Performs a > operation with a linear function of another field
                Float: true, Integer: true,
                Create: function () { return SQL.WhereClause.CompareField('>FIELD') }
            }
        ];

        //Returns the field comparison operator that corresponds to a specific id
        SQL.WhereClause.getFieldComparisonOperatorInfo = function (ID) {
            for (var nr in SQL.WhereClause._fieldComparisonOperators) {
                var op = SQL.WhereClause._fieldComparisonOperators[nr];
                if (op.ID == ID)
                    return op;
            }
            DQX.reportError("Invalid field comparison operator id " + ID);
        }

        //Returns a list of all field operators that are compatible with an SQL column data type (as defined in SQL.DataTypes)
        SQL.WhereClause.getCompatibleFieldComparisonOperators = function (datatype) {
            var lst = [];
            for (var nr in SQL.WhereClause._fieldComparisonOperators) {
                var op = SQL.WhereClause._fieldComparisonOperators[nr];
                if (op[datatype])
                    lst.push(op);
            }
            return lst;
        }

        //A class that encapsulates the comparison of a field to a fixed value
        SQL.WhereClause.CompareFixed = function (icolname, icomptype, ivalue) {
            var that = {};
            var fnd = false;
            for (var opnr = 0; opnr < SQL.WhereClause._fieldComparisonOperators.length; opnr++)
                if (SQL.WhereClause._fieldComparisonOperators[opnr].ID == icomptype)
                    fnd = true;
            if (!fnd)
                DQX.reportError("Invalid comparison where clause statement: " + icompoundtype);
            that.isCompound = false;
            that.ColName = icolname;
            that.Tpe = icomptype;
            that.CompValue = ivalue;

            //Creates the associated controls in the querybuilder GUI
            that._buildStatement = function (ID, elem, querybuilder) {

                if (!querybuilder.hasColumn(this.ColName))
                    return;

                var mycol = querybuilder.getColumn(this.ColName);
                if (mycol.isMultipleCoice()) {
                    var ctrl_choices = DocEl.Select(mycol.choicelist, this.CompValue);
                    ctrl_choices.setID(querybuilder.getControlID(ID, "Content"));
                    ctrl_choices.setWidthPx(150);
                    ctrl_choices.setCssClass('DQXQBQueryboxControl');
                    querybuilder.decorateQueryStatementControl(ctrl_choices, ID);
                    elem.addElem(ctrl_choices);
                    return;
                }

                var compcontent = DocEl.Edit(this.CompValue);
                compcontent.setID(querybuilder.getControlID(ID, "Content"));
                compcontent.setWidthPx(140);
                compcontent.setCssClass('DQXQBQueryboxControl');
                querybuilder.decorateQueryStatementControl(compcontent, ID);
                elem.addElem(compcontent);
            }

            //Fetches the content of this statement from the controls in the querybuilder GUI
            that._fetchStatementContent = function (ID, querybuilder) {
                if ($("#" + querybuilder.getControlID(ID, "Content")).length > 0) {
                    this.CompValue = $("#" + querybuilder.getControlID(ID, "Content")).val();
                }
            }

            return that;
        }

        //A class that Encapsulates the equality comparison of a field to another field
        SQL.WhereClause.EqualsField = function () {
            var that = {};
            that.isCompound = false;
            that.ColName = "";
            that.ColName2 = "";
            that.Tpe = "=FIELD";


            //Creates the associated controls in the querybuilder GUI
            that._buildStatement = function (ID, elem, querybuilder) {

                var thecols = [];
                for (var colnr = 0; colnr < querybuilder.myColumns.length; colnr++)
                    if (querybuilder.myColumns[colnr].ID != this.ColName)
                        thecols.push({ id: querybuilder.myColumns[colnr].ID, name: querybuilder.myColumns[colnr].name });
                var ctrl_otherfield = DocEl.Select(thecols, this.ColName2);
                ctrl_otherfield.setID(querybuilder.getControlID(ID, "OtherField"));
                ctrl_otherfield.setWidthPx(150);
                ctrl_otherfield.setCssClass('DQXQBQueryboxControl');
                querybuilder.decorateQueryStatementControl(ctrl_otherfield, ID);
                elem.addElem(ctrl_otherfield);
            }

            //Fetches the content of this statement from the controls in the querybuilder GUI
            that._fetchStatementContent = function (ID, querybuilder) {
                if ($("#" + querybuilder.getControlID(ID, "OtherField")).length > 0) {
                    this.ColName2 = $("#" + querybuilder.getControlID(ID, "OtherField")).val();
                }
            }

            return that;
        }



        //A class that Encapsulates the differential comparison of a field to another field
        SQL.WhereClause.DiffersField = function () {
            var that = {};
            that.isCompound = false;
            that.ColName = "";
            that.ColName2 = "";
            that.Tpe = "<>FIELD";


            //Creates the associated controls in the querybuilder GUI
            that._buildStatement = function (ID, elem, querybuilder) {

                var thecols = [];
                for (var colnr = 0; colnr < querybuilder.myColumns.length; colnr++)
                    if (querybuilder.myColumns[colnr].ID != this.ColName)
                        thecols.push({ id: querybuilder.myColumns[colnr].ID, name: querybuilder.myColumns[colnr].name });
                var ctrl_otherfield = DocEl.Select(thecols, this.ColName2);
                ctrl_otherfield.setID(querybuilder.getControlID(ID, "OtherField"));
                ctrl_otherfield.setWidthPx(150);
                ctrl_otherfield.setCssClass('DQXQBQueryboxControl');
                querybuilder.decorateQueryStatementControl(ctrl_otherfield, ID);
                elem.addElem(ctrl_otherfield);
            }

            //Fetches the content of this statement from the controls in the querybuilder GUI
            that._fetchStatementContent = function (ID, querybuilder) {
                if ($("#" + querybuilder.getControlID(ID, "OtherField")).length > 0) {
                    this.ColName2 = $("#" + querybuilder.getControlID(ID, "OtherField")).val();
                }
            }

            return that;
        }


        //A class that Encapsulates the numerical comparison of a field to another field
        SQL.WhereClause.CompareField = function (icomptype) {
            var that = {};
            that.isCompound = false;
            that.ColName = "";
            that.ColName2 = "";
            that.Tpe = icomptype;
            that.Factor = 1.0;
            that.Offset = 0.0;


            //Creates the associated controls in the querybuilder GUI
            that._buildStatement = function (ID, elem, querybuilder) {
                var ctrl_factor = DocEl.Edit(this.Factor);
                ctrl_factor.setID(querybuilder.getControlID(ID, "Factor"));
                ctrl_factor.setWidthPx(50);
                ctrl_factor.setCssClass('DQXQBQueryboxControl');
                querybuilder.decorateQueryStatementControl(ctrl_factor, ID);
                elem.addElem(ctrl_factor);

                elem.addElem(" x ");

                var thecols = [];
                for (var colnr = 0; colnr < querybuilder.myColumns.length; colnr++)
                    if (querybuilder.myColumns[colnr].isNumerical())
                        if (querybuilder.myColumns[colnr].ID != this.ColName)
                            thecols.push({ id: querybuilder.myColumns[colnr].ID, name: querybuilder.myColumns[colnr].name });
                var ctrl_otherfield = DocEl.Select(thecols, this.ColName2);
                ctrl_otherfield.setID(querybuilder.getControlID(ID, "OtherField"));
                ctrl_otherfield.setWidthPx(150);
                ctrl_otherfield.setCssClass('DQXQBQueryboxControl');
                querybuilder.decorateQueryStatementControl(ctrl_otherfield, ID);
                elem.addElem(ctrl_otherfield);

                elem.addElem(" + ");

                var ctrl_offset = DocEl.Edit(this.Offset);
                ctrl_offset.setID(querybuilder.getControlID(ID, "Offset"));
                ctrl_offset.setWidthPx(50);
                ctrl_offset.setCssClass('DQXQBQueryboxControl');
                querybuilder.decorateQueryStatementControl(ctrl_offset, ID);
                elem.addElem(ctrl_offset);

            }

            //Fetches the content of this statement from the controls in the querybuilder GUI
            that._fetchStatementContent = function (ID, querybuilder) {
                if ($("#" + querybuilder.getControlID(ID, "Factor")).length > 0) {
                    this.Factor = $("#" + querybuilder.getControlID(ID, "Factor")).val();
                    this.Offset = $("#" + querybuilder.getControlID(ID, "Offset")).val();
                    this.ColName2 = $("#" + querybuilder.getControlID(ID, "OtherField")).val();
                }
            }

            return that;
        }



        //A class that checks for presence of the value
        SQL.WhereClause.IsPresent = function () {
            var that = {};
            that.isCompound = false;
            that.Tpe = "ISPRESENT";
            that._buildStatement = function (ID, elem, querybuilder) {
            }
            that._fetchStatementContent = function (ID, querybuilder) {
            }
            return that;
        }


        //A class that checks for absence of the value
        SQL.WhereClause.IsAbsent = function () {
            var that = {};
            that.isCompound = false;
            that.Tpe = "ISABSENT";
            that._buildStatement = function (ID, elem, querybuilder) {
            }
            that._fetchStatementContent = function (ID, querybuilder) {
            }
            return that;
        }


        //A class that Encapsulates the absence of a where clause
        SQL.WhereClause.Trivial = function () {
            var that = {};
            that.isCompound = false;
            that.Tpe = "";
            return that;
        }

        //A class that Encapsulates a query that should return nothing
        SQL.WhereClause.None = function () {
            var that = {};
            that.isCompound = false;
            that.Tpe = "None";
            that.isNone = true;
            return that;
        }



        //A class that Encapsulates a compound statement
        SQL.WhereClause.Compound = function (icompoundtype, components) {
            if ((icompoundtype != 'AND') && (icompoundtype != 'OR'))
                DQX.reportError("Invalid compound where clause statement: " + icompoundtype);
            var that = {};
            that.isCompound = true;
            that.Tpe = icompoundtype;
            that.Components = components;
            if (that.Components == null) that.Components = [];
            that.addComponent = function (icomp) {
                this.Components.push(icomp);
            }
            that.getComponentCount = function () { return this.Components.length; }
            return that;
        }

        //A class that Encapsulates an AND statement
        SQL.WhereClause.AND = function (components) {
            return SQL.WhereClause.Compound("AND", components);
        }

        //A class that Encapsulates an OR statement
        SQL.WhereClause.OR = function (components) {
            return SQL.WhereClause.Compound("OR", components);
        }




        //Encodes a whereclause object to an url-friendly string
        SQL.WhereClause.encode = function (whc) {
            var jsonstring = JSON.stringify(whc);
            var st = Base64.encode(jsonstring);
            st = st.replace(/\+/g, "-");
            st = st.replace(/\//g, "_");
            //st = st.replace(/=/g, "*");!!! this should be added in client& server code
            return st;
        }


        //////////////////////////////////////////////////////////////////////////////////////
        // Encapsulates a sql sort statement
        //////////////////////////////////////////////////////////////////////////////////////

        SQL.TableSort = function (icollist) {
            var that = {};
            that.columnList = icollist;

            that.getPrimaryColumnID = function () {
                return this.columnList[this.columnList.length - 1];
            }

            that.toString = function () {
                var rs = "";
                for (var i in this.columnList) {
                    if (i > 0) rs += "~";
                    rs += this.columnList[i];
                }
                return rs;
            }
            return that;
        }
        return SQL;
    });
