// table.js

let table;
let columnsVisible = true;

document.addEventListener('DOMContentLoaded', function() {
    addBackButton();
    initializeTable();

    document.getElementById("sort-select").addEventListener("change", function(e) {
        updateGrouping(e.target.value);
    });

    document.getElementById("refresh-button").addEventListener("click", function() {
        refreshData();
    });

    document.getElementById("toggle-columns").addEventListener("click", function() {
        toggleColumns();
    });

    window.addEventListener('resize', function() {
        if (table) {
            adjustColumnWidths();
        }
    });
});

function addBackButton() {
    const controls = document.querySelector('.controls');
    const backButton = document.createElement('button');
    backButton.id = 'back-to-Project_Content';
    backButton.className = 'back-button';
    backButton.innerHTML = '← Back to Project Content';
    backButton.addEventListener('click', async function() {
        try {
            const response = await eel.switch_page('Project_Content')();
            if (response.success) {
                window.location.href = response.page;
            }
        } catch (error) {
            console.error('Error switching to Project_Content:', error);
        }
    });
    
    // Insert the back button as the first child of controls
    controls.insertBefore(backButton, controls.firstChild);

    // Add styles for the back button
    const style = document.createElement('style');
    style.textContent = `
        .back-button {
            background-color: #5680c2;
            color: #e0e0e0;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.3s;
            margin-right: 10px;
        }
        
        .back-button:hover {
            background-color: #4a6ea8;
        }
    `;
    document.head.appendChild(style);
}

function initializeTable() {
    eel.get_object_data()(function(data) {
        createTable(JSON.parse(data));
    });
}

function createTable(objectData) {
    let columns = [
        {title: "Object Name", field: "name", headerFilter: true, resizable: true},
        {title: "Category", field: "category", headerFilter: true, resizable: true},
        {title: "Work Package", field: "wp", headerFilter: true, resizable: true},
        {title: "MN", field: "mn", headerFilter: true, resizable: true},
        {title: "Row", field: "row", headerFilter: true, resizable: true},
        {title: "Column 1", field: "col1", editor: "input", resizable: true},
        {title: "Column 2", field: "col2", editor: "input", resizable: true},
        {title: "Column 3", field: "col3", editor: "input", resizable: true},
        {title: "Column 4", field: "col4", editor: "input", resizable: true}
    ];

    table = new Tabulator("#object-table", {
        data: formatObjectData(objectData),
        columns: columns,
        layout: "fitDataFill",
        groupBy: "name",
        dataTreeStartExpanded: false,
        selectable: true,
        tooltips: true,
        responsiveLayout: "hide",
        pagination: "local",
        paginationSize: 20,
        paginationSizeSelector: [10, 20, 50, 100],
        movableColumns: false,
        initialSort: [{column: "name", dir: "asc"}],
        rowFormatter: function(row) {
            if (row.getData().category === "Main Equipment") {
                row.getElement().style.color = "#2980b9";
            } else if (row.getData().category === "Tools") {
                row.getElement().style.color = "#27ae60";
            } else if (row.getData().category === "Auxiliary Equipment") {
                row.getElement().style.color = "#d35400";
            }
        },
        tableBuilt: function() {
            adjustColumnWidths();
        }
    });

    document.getElementById("search-input").addEventListener("input", function(e) {
        applySearch(e.target.value);
    });
}

function adjustColumnWidths() {
    if (table) {
        let tableWidth = document.getElementById("object-table").offsetWidth;
        let columns = table.getColumns();
        let visibleColumns = columns.filter(column => column.isVisible());
        let totalFlexGrow = visibleColumns.length;
        let availableWidth = tableWidth;

        visibleColumns.forEach(column => {
            let columnWidth = Math.floor(availableWidth / totalFlexGrow);
            column.setWidth(columnWidth);
            availableWidth -= columnWidth;
            totalFlexGrow--;
        });
    }
}

function toggleColumns() {
    columnsVisible = !columnsVisible;
    const columnsToToggle = ["name", "category", "wp", "mn", "row"];
    columnsToToggle.forEach(field => {
        table.toggleColumn(field);
    });
    document.getElementById("toggle-columns").innerHTML = columnsVisible ? "↔" : "↔";
    adjustColumnWidths();
}

function applySearch(value) {
    if (table) {
        table.setFilter(function(data) {
            return data.name.toLowerCase().includes(value.toLowerCase()) ||
                   data.mn.toLowerCase().includes(value.toLowerCase()) ||
                   data.category.toLowerCase().includes(value.toLowerCase()) ||
                   data.wp.toLowerCase().includes(value.toLowerCase());
        });
    }
}

function formatObjectData(objectData) {
    let formattedData = [];
    objectData.forEach(obj => {
        Object.entries(obj.properties).forEach(([rowKey, rowData]) => {
            formattedData.push({
                name: obj.name,
                category: obj.category,
                wp: obj.wp,
                mn: obj.mn,
                row: rowKey,
                col1: rowData.col1 || '',
                col2: rowData.col2 || '',
                col3: rowData.col3 || '',
                col4: rowData.col4 || ''
            });
        });
    });
    return formattedData;
}

function updateGrouping(groupBy) {
    if (table) {
        if (groupBy === "wp") {
            table.setGroupBy(["wp", "name"]);
        } else if (groupBy === "category") {
            table.setGroupBy(["category", "name"]);
        } else if (groupBy === "mn") {
            table.setGroupBy(["mn", "name"]);
        } else {
            table.setGroupBy("name");
        }
    }
}

function refreshData() {
    eel.get_object_data()(function(data) {
        table.setData(formatObjectData(JSON.parse(data)));
        adjustColumnWidths();
    });
}

eel.expose(updateTable);
function updateTable(newData) {
    if (table) {
        let parsedData = JSON.parse(newData);
        table.setData(formatObjectData(parsedData));
        adjustColumnWidths();
    }
}