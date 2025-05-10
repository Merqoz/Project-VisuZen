const EditorManager = {
    editors: {},
    
    async initEditor(containerId, editorData = {}) {
        // Destroy existing editor instance if it exists
        if (this.editors[containerId]) {
            await this.editors[containerId].destroy();
            delete this.editors[containerId];
        }

        try {
            const editor = new EditorJS({
                holder: containerId,
                tools: {
                    header: {
                        class: Header,
                        inlineToolbar: ['link']
                    },
                    list: {
                        class: List,
                        inlineToolbar: true
                    },
                    checklist: {
                        class: Checklist,
                        inlineToolbar: true
                    },
                    quote: {
                        class: Quote,
                        inlineToolbar: true,
                        config: {
                            quotePlaceholder: 'Enter a quote',
                            captionPlaceholder: 'Quote\'s author',
                        },
                    },
                    delimiter: Delimiter,
                    inlineCode: {
                        class: InlineCode,
                        shortcut: 'CMD+SHIFT+M',
                    },
                    code: {
                        class: CodeTool,
                        placeholder: 'Enter code here...'
                    },
                    table: {
                        class: Table,
                        inlineToolbar: true,
                        config: {
                            rows: 2,
                            cols: 3,
                        },
                    },
                    marker: {
                        class: Marker,
                        shortcut: 'CMD+SHIFT+M',
                    },
                    warning: Warning,
                },
                data: editorData,
                placeholder: 'Let\'s write an awesome story!',
                onReady: () => {
                    console.log('Editor ready', containerId);
                },
                onChange: async (api, event) => {
                    // Automatically save content changes
                    const [sectionId, editorNumber] = this.parseContainerId(containerId);
                    if (sectionId && editorNumber) {
                        const content = await editor.save();
                        this.saveEditorContent(sectionId, editorNumber, containerId, content);
                    }
                }
            });

            await editor.isReady;
            this.editors[containerId] = editor;
            return editor;
        } catch (error) {
            console.error('Error initializing editor:', error);
            return null;
        }
    },

    parseContainerId(containerId) {
        // Parse editor-{sectionId}-{editorNumber}
        const match = containerId.match(/editor-(\d+)-(\d+)/);
        return match ? [parseInt(match[1]), parseInt(match[2])] : [null, null];
    },

    async addEditor(sectionId, editorNumber, initialData = {}) {
        const sectionContent = document.querySelector(`#section-content-${sectionId}`);
        if (!sectionContent) return null;

        const editorWrapper = document.createElement('div');
        editorWrapper.className = 'editor-wrapper';
        
        const editorTitle = document.createElement('div');
        editorTitle.className = 'editor-title';
        editorTitle.textContent = initialData.name || `Rich Text Editor ${editorNumber}`;
        editorTitle.contentEditable = true;
        editorTitle.addEventListener('blur', () => {
            this.updateEditorName(sectionId, editorNumber, editorTitle.textContent);
        });
        
        const editorContainer = document.createElement('div');
        const editorId = `editor-${sectionId}-${editorNumber}`;
        editorContainer.id = editorId;
        editorContainer.className = 'editor-container';

        // Build the toolbar
        const editorToolbar = this.createEditorToolbar(editorId);
        
        // Assemble the editor wrapper
        editorWrapper.appendChild(editorTitle);
        editorWrapper.appendChild(editorToolbar);
        editorWrapper.appendChild(editorContainer);

        // Add editor reference
        const editorReference = document.createElement('span');
        editorReference.className = 'editor-reference';
        editorReference.textContent = `Editor ${SectionManager.generateEditorReference(sectionId, editorNumber)}`;
        
        // Add to DOM
        sectionContent.appendChild(editorReference);
        sectionContent.appendChild(editorWrapper);

        // Initialize the editor
        const editor = await this.initEditor(editorId, initialData.data);
        if (!editor) return null;

        // Add save button
        const saveButton = document.createElement('button');
        saveButton.textContent = 'Save Content';
        saveButton.className = 'save-button';
        saveButton.onclick = async () => {
            const content = await editor.save();
            this.saveEditorContent(sectionId, editorNumber, editorId, content);
        };
        editorWrapper.appendChild(saveButton);

        return editor;
    },

    createEditorToolbar(editorId) {
        const toolbar = document.createElement('div');
        toolbar.className = 'editor-toolbar';
        
        const tools = [
            { icon: 'H', tool: 'header', title: 'Add Header' },
            { icon: '•', tool: 'list', title: 'Add List' },
            { icon: '✓', tool: 'checklist', title: 'Add Checklist' },
            { icon: '"', tool: 'quote', title: 'Add Quote' },
            { icon: '—', tool: 'delimiter', title: 'Add Delimiter' },
            { icon: '</>', tool: 'inlineCode', title: 'Add Inline Code' },
            { icon: '{ }', tool: 'code', title: 'Add Code Block' },
            { icon: '◫', tool: 'table', title: 'Add Table' },
            { icon: '⚡', tool: 'marker', title: 'Add Marker' },
            { icon: '!', tool: 'warning', title: 'Add Warning' }
        ];

        tools.forEach(({ icon, tool, title }) => {
            const button = document.createElement('button');
            button.className = 'toolbar-btn';
            button.textContent = icon;
            button.title = title;
            button.setAttribute('data-tool', tool);
            button.onclick = () => {
                const editor = this.editors[editorId];
                if (editor) {
                    editor.blocks.insert(tool);
                }
            };
            toolbar.appendChild(button);
        });

        return toolbar;
    },

    async saveEditorContent(sectionId, editorNumber, editorId, content) {
        const editorWrapper = document.querySelector(`#${editorId}`).closest('.editor-wrapper');
        const name = editorWrapper.querySelector('.editor-title').textContent;
        
        // Save to DataStore
        const editors = DataStore.getTableData(sectionId, 'editors') || {};
        editors[editorNumber] = {
            name: name,
            data: content
        };
        DataStore.setTableData(sectionId, 'editors', editors);
        
        console.log('Editor content saved:', { sectionId, editorNumber, content });
    },

    updateEditorName(sectionId, editorNumber, newName) {
        const editors = DataStore.getTableData(sectionId, 'editors') || {};
        if (editors[editorNumber]) {
            editors[editorNumber].name = newName;
            DataStore.setTableData(sectionId, 'editors', editors);
        }
    },

    async destroyEditor(editorId) {
        if (this.editors[editorId]) {
            await this.editors[editorId].destroy();
            delete this.editors[editorId];
        }
    },

    async destroyAllEditors() {
        for (const editorId in this.editors) {
            await this.destroyEditor(editorId);
        }
    },

    async restoreEditor(sectionId, editorNumber, editorData) {
        if (!editorData) return;
        
        const editor = await this.addEditor(sectionId, editorNumber, editorData);
        if (!editor) {
            console.error('Failed to restore editor:', { sectionId, editorNumber });
        }
        return editor;
    }
};

// Export the EditorManager object if you're using ES6 modules
// export default EditorManager;