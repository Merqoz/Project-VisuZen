const TabularManager = {
    createTable(containerId, sectionId, tableNumber, initialData) {
        const tableName = initialData?.name || `Table ${tableNumber}`;
        const table = new Tabulator(`#${containerId}`, {
            data: initialData?.data || this.getInitialData(),
            layout: "fitColumns",
            movableRows: true,
            columns: [
                {
                    title: "Step", 
                    formatter: "rownum",
                    width: 60,
                    headerSort: false,
                    hozAlign: "center",
                    vertAlign: "middle"
                },
                {
                    title: "Description", 
                    field: "description", 
                    editor: "input", 
                    widthGrow: 3,
                    headerSort: false,
                    hozAlign: "left",
                    vertAlign: "middle"
                },
                {
                    title: "Initials", 
                    field: "initials", 
                    editor: "input", 
                    widthGrow: 1,
                    headerSort: false,
                    hozAlign: "center",
                    vertAlign: "middle"
                },
                
                {
                    title: "Delete",
                    formatter: function(cell, formatterParams, onRendered) {
                        return '<button class="delete-row">🗑️</button>';
                    },
                    width: 80,
                    headerSort: false,
                    hozAlign: "center",
                    vertAlign: "middle",
                    cellClick: function(e, cell) {
                        cell.getRow().delete();
                        TabularManager.saveTableData(sectionId, tableNumber, table);
                    }
                }
            ],
            rowMoved: function(row) {
                this.saveTableData(sectionId, tableNumber);
            },
            dataChanged: function(data) {
                this.saveTableData(sectionId, tableNumber);
            },
            height: "auto",
            footerElement: '<button class="add-row-button">Add Row</button>'
        });

        // Add table name display
        const tableNameElement = document.createElement('div');
        tableNameElement.className = 'table-name';
        tableNameElement.textContent = tableName;
        table.element.parentNode.insertBefore(tableNameElement, table.element);

        // Add event listener for the "Add Row" button
        table.on("tableBuilt", function(){
            const addRowButton = table.element.querySelector(".add-row-button");
            addRowButton.addEventListener("click", function(){
                table.addRow({description: "", initials: ""}, false)
                    .then(function(){
                        TabularManager.saveTableData(sectionId, tableNumber, table);
                    });
            });
        });

        return table;
    },

    getInitialData() {
        return [
            {description: "", initials: ""},
            {description: "", initials: ""},
            {description: "", initials: ""}
        ];
    },

    saveTableData(sectionId, tableNumber, table) {
        const tableData = table.getData();
        const tableName = table.element.previousSibling.textContent;
        SectionManager.saveTableData(sectionId, tableNumber, { data: tableData, name: tableName });
    }
};